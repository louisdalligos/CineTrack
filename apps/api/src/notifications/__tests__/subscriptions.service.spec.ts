import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from '../subscriptions.service';
import { NotificationsConfig } from '../notifications.config';
import { PrismaService } from '../../prisma/prisma.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: {
    pushSubscription: {
      upsert: jest.Mock;
      deleteMany: jest.Mock;
      count: jest.Mock;
    };
    user: { findUnique: jest.Mock; update: jest.Mock };
  };
  let config: { isEnabled: boolean; publicKey: string };

  const USER_ID = 'user-1';
  const OTHER_USER_ID = 'user-2';
  const ENDPOINT = 'https://push.example.com/abc123';

  const subscribeDto = {
    endpoint: ENDPOINT,
    p256dh: 'p256dh-key',
    auth: 'auth-secret',
    userAgent: 'Firefox',
  };

  beforeEach(async () => {
    prisma = {
      pushSubscription: {
        upsert: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          remindersEnabled: true,
          reminderAfterDays: 14,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    config = { isEnabled: true, publicKey: 'BPublicKey' };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsConfig, useValue: config },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    jest.clearAllMocks();
    prisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });
    prisma.pushSubscription.count.mockResolvedValue(0);
    prisma.user.findUnique.mockResolvedValue({
      remindersEnabled: true,
      reminderAfterDays: 14,
    });
  });

  describe('subscribe', () => {
    it('upserts on endpoint so a repeated subscription does not duplicate', async () => {
      prisma.pushSubscription.upsert.mockResolvedValue({ id: 'sub-1' });

      await service.subscribe(USER_ID, subscribeDto);

      expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { endpoint: ENDPOINT } }),
      );
    });

    it('reassigns an endpoint that previously belonged to another user', async () => {
      // Shared device: the push service can hand the same endpoint to whoever
      // logs in next, so ownership must follow the current user.
      prisma.pushSubscription.upsert.mockResolvedValue({ id: 'sub-1' });

      await service.subscribe(OTHER_USER_ID, subscribeDto);

      const call = prisma.pushSubscription.upsert.mock.calls[0][0];
      expect(call.update.userId).toBe(OTHER_USER_ID);
      expect(call.create.userId).toBe(OTHER_USER_ID);
    });

    it('stores a null user agent when none is supplied', async () => {
      prisma.pushSubscription.upsert.mockResolvedValue({ id: 'sub-1' });

      await service.subscribe(USER_ID, {
        endpoint: ENDPOINT,
        p256dh: 'k',
        auth: 'a',
      });

      expect(prisma.pushSubscription.upsert.mock.calls[0][0].create.userAgent).toBeNull();
    });
  });

  describe('unsubscribe', () => {
    it('scopes the delete to the requesting user', async () => {
      await service.unsubscribe(USER_ID, ENDPOINT);

      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { endpoint: ENDPOINT, userId: USER_ID },
      });
    });

    it('does not throw when nothing matched', async () => {
      // "Unsubscribe me" is already satisfied if no row exists.
      prisma.pushSubscription.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.unsubscribe(USER_ID, ENDPOINT)).resolves.toBeUndefined();
    });
  });

  describe('deleteByEndpoint', () => {
    it('deletes without a user scope, for pruning dead endpoints', async () => {
      await service.deleteByEndpoint(ENDPOINT);

      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { endpoint: ENDPOINT },
      });
    });
  });

  describe('getSettings', () => {
    it('reports availability and returns the public key when configured', async () => {
      prisma.pushSubscription.count.mockResolvedValue(2);

      const settings = await service.getSettings(USER_ID);

      expect(settings).toEqual({
        available: true,
        remindersEnabled: true,
        reminderAfterDays: 14,
        subscriptionCount: 2,
        publicKey: 'BPublicKey',
      });
    });

    it('withholds the public key when the server has no VAPID keys', async () => {
      config.isEnabled = false;

      const settings = await service.getSettings(USER_ID);

      expect(settings.available).toBe(false);
      expect(settings.publicKey).toBeNull();
    });
  });

  describe('updateSettings', () => {
    it('persists only the fields supplied', async () => {
      await service.updateSettings(USER_ID, { remindersEnabled: false });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { remindersEnabled: false },
      });
    });

    it('updates the interval without touching the enabled flag', async () => {
      await service.updateSettings(USER_ID, { reminderAfterDays: 30 });

      expect(prisma.user.update.mock.calls[0][0].data).toEqual({ reminderAfterDays: 30 });
    });

    it('returns the settings as they now stand', async () => {
      prisma.user.findUnique.mockResolvedValue({
        remindersEnabled: false,
        reminderAfterDays: 30,
      });

      const settings = await service.updateSettings(USER_ID, { remindersEnabled: false });

      expect(settings.remindersEnabled).toBe(false);
      expect(settings.reminderAfterDays).toBe(30);
    });
  });
});
