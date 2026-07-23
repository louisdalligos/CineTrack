import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsConfig } from './notifications.config';
import { SubscriptionsService } from './subscriptions.service';

export interface PushPayload {
  title: string;
  body: string;
  /** Path the notification opens when clicked (FR34). */
  url?: string;
  /** Reusing a tag replaces an earlier notification rather than stacking. */
  tag?: string;
}

export interface SendResult {
  sent: number;
  failed: number;
  pruned: number;
}

/** Push services use these to say an endpoint is permanently gone (FR35). */
const GONE_STATUS_CODES = new Set([404, 410]);

@Injectable()
export class PushSenderService {
  private readonly logger = new Logger(PushSenderService.name);
  private vapidConfigured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: NotificationsConfig,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  /**
   * Deferred rather than done in the constructor: web-push validates the
   * subject format and throws, which would take down application boot on a
   * deployment that never intended to use notifications (NFR9).
   */
  private ensureVapid(): void {
    if (this.vapidConfigured) return;

    webpush.setVapidDetails(this.config.subject, this.config.publicKey, this.config.privateKey);
    this.vapidConfigured = true;
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<SendResult> {
    if (!this.config.isEnabled) {
      throw new ServiceUnavailableException('Push notifications are not configured');
    }

    this.ensureVapid();

    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });

    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0, pruned: 0 };
    }

    const body = JSON.stringify(payload);

    // Sent in parallel and settled individually: one dead device must not stop
    // the others from receiving.
    const outcomes = await Promise.all(
      subscriptions.map((subscription) =>
        webpush
          .sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            body,
          )
          .then(() => 'sent' as const)
          .catch(async (error: unknown) => {
            const statusCode = (error as { statusCode?: number }).statusCode;

            if (statusCode && GONE_STATUS_CODES.has(statusCode)) {
              await this.subscriptions.deleteByEndpoint(subscription.endpoint);
              return 'pruned' as const;
            }

            this.logger.warn(`Push delivery failed with status ${statusCode ?? 'unknown'}`);
            return 'failed' as const;
          }),
      ),
    );

    return {
      sent: outcomes.filter((outcome) => outcome === 'sent').length,
      failed: outcomes.filter((outcome) => outcome === 'failed').length,
      pruned: outcomes.filter((outcome) => outcome === 'pruned').length,
    };
  }
}
