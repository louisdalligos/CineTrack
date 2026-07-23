import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Placeholders that appear in .env.example. Treating them as absent means a
 * reviewer who copies the example file gets the feature cleanly disabled
 * rather than a runtime failure on the first send (NFR9).
 */
const PLACEHOLDERS = new Set(['', 'changeme', 'your_vapid_public_key', 'your_vapid_private_key']);

@Injectable()
export class NotificationsConfig {
  private readonly logger = new Logger(NotificationsConfig.name);

  readonly publicKey: string;
  readonly privateKey: string;
  readonly subject: string;

  constructor(config: ConfigService) {
    this.publicKey = this.clean(config.get<string>('VAPID_PUBLIC_KEY'));
    this.privateKey = this.clean(config.get<string>('VAPID_PRIVATE_KEY'));
    this.subject = this.clean(config.get<string>('VAPID_SUBJECT'));

    if (!this.isEnabled) {
      this.logger.warn(
        'VAPID keys are not configured — push notifications are disabled. ' +
          'Generate a pair with: npx web-push generate-vapid-keys',
      );
    }
  }

  /**
   * The whole feature switches on this. Every notification endpoint and the
   * scheduled job check it first, so an unconfigured deployment behaves
   * exactly like v1.0 rather than erroring.
   */
  get isEnabled(): boolean {
    return Boolean(this.publicKey && this.privateKey && this.subject);
  }

  private clean(value: string | undefined): string {
    const trimmed = value?.trim() ?? '';
    return PLACEHOLDERS.has(trimmed.toLowerCase()) ? '' : trimmed;
  }
}
