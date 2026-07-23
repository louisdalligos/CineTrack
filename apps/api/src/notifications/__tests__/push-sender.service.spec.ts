import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import * as webpush from 'web-push';
import { PushSenderService } from '../push-sender.service';
import { NotificationsConfig } from '../notifications.config';
import { SubscriptionsService } from '../subscriptions.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('web-push');

describe('PushSenderService', () => {
  let service: PushSenderService;
  let prisma: { pushSubscription: { findMany: jest.Mock } };
  let subscriptions: { deleteByEndpoint: jest.Mock };
  let config: {
    isEnabled: boolean;
    publicKey: string;
    privateKey: string;
    subject: string;
  };

  const USER_ID = 'user-1';

  const payload = { title: 'CineTrack', body: 'A reminder', url: '/watchlist' };

  function row(endpoint: string) {
    return { id: endpoint, userId: USER_ID, endpoint, p256dh: 'p', auth: 'a' };
  }

  function pushError(statusCode: number) {
    return Object.assign(new Error('push failed'), { statusCode });
  }

  beforeEach(async () => {
    prisma = { pushSubscription: { findMany: jest.fn().mockResolvedValue([]) } };
    subscriptions = { deleteByEndpoint: jest.fn().mockResolvedValue(undefined) };
    config = {
      isEnabled: true,
      publicKey: 'BPublicKey',
      privateKey: 'PrivateKey',
      subject: 'mailto:demo@example.com',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushSenderService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsConfig, useValue: config },
        { provide: SubscriptionsService, useValue: subscriptions },
      ],
    }).compile();

    service = module.get<PushSenderService>(PushSenderService);
    jest.clearAllMocks();
    (webpush.sendNotification as jest.Mock).mockResolvedValue(undefined);
  });

  it('refuses to send when VAPID keys are not configured', async () => {
    config.isEnabled = false;

    await expect(service.sendToUser(USER_ID, payload)).rejects.toThrow(ServiceUnavailableException);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('does nothing when the user has no subscriptions', async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([]);

    await expect(service.sendToUser(USER_ID, payload)).resolves.toEqual({
      sent: 0,
      failed: 0,
      pruned: 0,
    });
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('delivers to every subscription the user has', async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([row('a'), row('b'), row('c')]);

    const result = await service.sendToUser(USER_ID, payload);

    expect(webpush.sendNotification).toHaveBeenCalledTimes(3);
    expect(result.sent).toBe(3);
  });

  it('serialises the payload so the service worker can parse it', async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([row('a')]);

    await service.sendToUser(USER_ID, payload);

    const [subscription, body] = (webpush.sendNotification as jest.Mock).mock.calls[0];
    expect(subscription).toEqual({
      endpoint: 'a',
      keys: { p256dh: 'p', auth: 'a' },
    });
    expect(JSON.parse(body)).toEqual(payload);
  });

  it('configures VAPID details before the first send', async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([row('a')]);

    await service.sendToUser(USER_ID, payload);

    expect(webpush.setVapidDetails).toHaveBeenCalledWith(
      'mailto:demo@example.com',
      'BPublicKey',
      'PrivateKey',
    );
  });

  it('configures VAPID only once across repeated sends', async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([row('a')]);

    await service.sendToUser(USER_ID, payload);
    await service.sendToUser(USER_ID, payload);

    expect(webpush.setVapidDetails).toHaveBeenCalledTimes(1);
  });

  describe('pruning', () => {
    it.each([404, 410])(
      'deletes a subscription the push service reports gone (%i)',
      async (status) => {
        prisma.pushSubscription.findMany.mockResolvedValue([row('dead')]);
        (webpush.sendNotification as jest.Mock).mockRejectedValue(pushError(status));

        const result = await service.sendToUser(USER_ID, payload);

        expect(subscriptions.deleteByEndpoint).toHaveBeenCalledWith('dead');
        expect(result).toEqual({ sent: 0, failed: 0, pruned: 1 });
      },
    );

    it('keeps a subscription that failed for a transient reason', async () => {
      // A 500 from the push service says nothing about whether the endpoint is
      // still valid, so deleting it would lose a working subscription.
      prisma.pushSubscription.findMany.mockResolvedValue([row('flaky')]);
      (webpush.sendNotification as jest.Mock).mockRejectedValue(pushError(500));

      const result = await service.sendToUser(USER_ID, payload);

      expect(subscriptions.deleteByEndpoint).not.toHaveBeenCalled();
      expect(result).toEqual({ sent: 0, failed: 1, pruned: 0 });
    });

    it('keeps a subscription when the failure carries no status', async () => {
      prisma.pushSubscription.findMany.mockResolvedValue([row('offline')]);
      (webpush.sendNotification as jest.Mock).mockRejectedValue(new Error('network down'));

      const result = await service.sendToUser(USER_ID, payload);

      expect(subscriptions.deleteByEndpoint).not.toHaveBeenCalled();
      expect(result.failed).toBe(1);
    });
  });

  it('keeps delivering to healthy devices when one is dead', async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([row('good'), row('dead')]);
    (webpush.sendNotification as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(pushError(410));

    const result = await service.sendToUser(USER_ID, payload);

    expect(result).toEqual({ sent: 1, failed: 0, pruned: 1 });
  });
});
