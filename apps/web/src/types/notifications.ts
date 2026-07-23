/**
 * Every state the notification UI can be in (FR37). Reported honestly rather
 * than collapsed into a boolean, because the remedy differs in each case.
 */
export type NotificationState =
  /** Browser lacks service worker or push support. */
  | 'unsupported'
  /** Server has no VAPID keys — the feature is switched off deployment-wide. */
  | 'unavailable'
  /** iOS Safari: push only works once the site is installed to the Home Screen. */
  | 'requires-install'
  /** The user has blocked notifications; only browser settings can undo this. */
  | 'denied'
  /** Everything is in place, the user has simply not turned it on. */
  | 'inactive'
  /** Subscribed and receiving. */
  | 'active';

export interface NotificationSettings {
  available: boolean;
  remindersEnabled: boolean;
  reminderAfterDays: number;
  subscriptionCount: number;
  publicKey: string | null;
}
