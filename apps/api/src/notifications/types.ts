export interface NotificationSettings {
  /** False when the server has no VAPID keys — the client hides the UI. */
  available: boolean;
  remindersEnabled: boolean;
  reminderAfterDays: number;
  /** How many browsers or devices this user has subscribed. */
  subscriptionCount: number;
  /** Null when unavailable; the browser needs this to subscribe. */
  publicKey: string | null;
}
