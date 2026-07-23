import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsConfig } from './notifications.config';
import { SubscribeDto } from './dto/subscribe.dto';
import { UpdateNotificationSettingsDto } from './dto/update-settings.dto';
import type { NotificationSettings } from './types';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: NotificationsConfig,
  ) {}

  /**
   * Idempotent on endpoint (FR30). The browser may hand back the same
   * subscription after a page reload, and push services can also reissue an
   * endpoint to a different user on a shared device — so an existing row is
   * reassigned rather than duplicated or left pointing at the wrong account.
   */
  async subscribe(userId: string, dto: SubscribeDto): Promise<{ id: string }> {
    const subscription = await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: {
        userId,
        p256dh: dto.p256dh,
        auth: dto.auth,
        userAgent: dto.userAgent ?? null,
      },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.p256dh,
        auth: dto.auth,
        userAgent: dto.userAgent ?? null,
      },
    });

    return { id: subscription.id };
  }

  /**
   * Scoped by userId so one user cannot delete another's subscription by
   * guessing an endpoint (FR17 applies here too). A miss is not an error:
   * the caller's intent — "I am not subscribed" — is already satisfied.
   */
  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    const result = await this.prisma.pushSubscription.deleteMany({
      where: { endpoint, userId },
    });

    if (result.count === 0) {
      this.logger.debug('Unsubscribe matched no subscription for this user');
    }
  }

  /** Used by the send pipeline when a push service reports an endpoint gone. */
  async deleteByEndpoint(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  async getSettings(userId: string): Promise<NotificationSettings> {
    const [user, subscriptionCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { remindersEnabled: true, reminderAfterDays: true },
      }),
      this.prisma.pushSubscription.count({ where: { userId } }),
    ]);

    return {
      available: this.config.isEnabled,
      remindersEnabled: user?.remindersEnabled ?? false,
      reminderAfterDays: user?.reminderAfterDays ?? 14,
      subscriptionCount,
      publicKey: this.config.isEnabled ? this.config.publicKey : null,
    };
  }

  async updateSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.remindersEnabled !== undefined ? { remindersEnabled: dto.remindersEnabled } : {}),
        ...(dto.reminderAfterDays !== undefined
          ? { reminderAfterDays: dto.reminderAfterDays }
          : {}),
      },
    });

    return this.getSettings(userId);
  }
}
