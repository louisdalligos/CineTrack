import { ConfigService } from '@nestjs/config';
import { NotificationsConfig } from '../notifications.config';

describe('NotificationsConfig', () => {
  function build(values: Record<string, string | undefined>) {
    const config = {
      get: (key: string) => values[key],
    } as unknown as ConfigService;
    return new NotificationsConfig(config);
  }

  const complete = {
    VAPID_PUBLIC_KEY: 'BPublicKey',
    VAPID_PRIVATE_KEY: 'PrivateKey',
    VAPID_SUBJECT: 'mailto:demo@example.com',
  };

  it('is enabled when all three values are supplied', () => {
    expect(build(complete).isEnabled).toBe(true);
  });

  it('is disabled when no configuration is present at all', () => {
    expect(build({}).isEnabled).toBe(false);
  });

  it.each(Object.keys(complete))('is disabled when %s is missing', (missing) => {
    const partial = { ...complete, [missing]: undefined };
    expect(build(partial).isEnabled).toBe(false);
  });

  it('treats the .env.example placeholder as absent', () => {
    // A reviewer copying .env.example should get the feature switched off,
    // not a confusing failure when the first notification is sent.
    expect(build({ ...complete, VAPID_PUBLIC_KEY: 'changeme' }).isEnabled).toBe(false);
  });

  it('treats whitespace-only values as absent', () => {
    expect(build({ ...complete, VAPID_PRIVATE_KEY: '   ' }).isEnabled).toBe(false);
  });

  it('trims surrounding whitespace from supplied values', () => {
    const config = build({ ...complete, VAPID_SUBJECT: '  mailto:demo@example.com  ' });

    expect(config.subject).toBe('mailto:demo@example.com');
    expect(config.isEnabled).toBe(true);
  });
});
