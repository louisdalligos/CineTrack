import { Test, TestingModule } from '@nestjs/testing';
import { WatchlistStatus } from '@prisma/client';
import { RemindersService, type DueItem } from '../reminders.service';
import { NotificationsConfig } from '../notifications.config';
import { PushSenderService } from '../push-sender.service';
import { PrismaService } from '../../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-07-23T09:00:00Z');

describe('RemindersService', () => {
  let service: RemindersService;
  let prisma: {
    watchlistItem: { findMany: jest.Mock; updateMany: jest.Mock };
  };
  let sender: { sendToUser: jest.Mock };
  let config: { isEnabled: boolean };

  function item(overrides: Partial<DueItem> = {}): DueItem {
    return {
      id: 'item-1',
      tmdbId: 603,
      title: 'The Matrix',
      userId: 'user-1',
      createdAt: new Date(NOW.getTime() - 20 * DAY_MS),
      lastRemindedAt: null,
      user: { reminderAfterDays: 14 },
      ...overrides,
    };
  }

  beforeEach(async () => {
    prisma = {
      watchlistItem: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    sender = { sendToUser: jest.fn().mockResolvedValue({ sent: 1, failed: 0, pruned: 0 }) };
    config = { isEnabled: true };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemindersService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsConfig, useValue: config },
        { provide: PushSenderService, useValue: sender },
      ],
    }).compile();

    service = module.get<RemindersService>(RemindersService);
    jest.clearAllMocks();
    prisma.watchlistItem.updateMany.mockResolvedValue({ count: 1 });
    sender.sendToUser.mockResolvedValue({ sent: 1, failed: 0, pruned: 0 });
  });

  describe('selection', () => {
    it('only considers planned items belonging to opted-in users with a device', async () => {
      await service.findDueItems(NOW);

      expect(prisma.watchlistItem.findMany.mock.calls[0][0].where).toEqual({
        status: WatchlistStatus.PLANNED,
        user: {
          remindersEnabled: true,
          pushSubscriptions: { some: {} },
        },
      });
    });

    it('includes an item older than the interval', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([item()]);

      await expect(service.findDueItems(NOW)).resolves.toHaveLength(1);
    });

    it('excludes an item younger than the interval', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([
        item({ createdAt: new Date(NOW.getTime() - 13 * DAY_MS) }),
      ]);

      await expect(service.findDueItems(NOW)).resolves.toHaveLength(0);
    });

    it('includes an item exactly at the interval boundary', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([
        item({ createdAt: new Date(NOW.getTime() - 14 * DAY_MS) }),
      ]);

      await expect(service.findDueItems(NOW)).resolves.toHaveLength(1);
    });

    it('respects a longer per-user interval', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([item({ user: { reminderAfterDays: 30 } })]);

      // 20 days old, but this user asked for 30.
      await expect(service.findDueItems(NOW)).resolves.toHaveLength(0);
    });

    it('excludes an item reminded about within the current interval (FR33)', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([
        item({ lastRemindedAt: new Date(NOW.getTime() - 3 * DAY_MS) }),
      ]);

      await expect(service.findDueItems(NOW)).resolves.toHaveLength(0);
    });

    it('includes an item whose last reminder is itself older than the interval', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([
        item({ lastRemindedAt: new Date(NOW.getTime() - 15 * DAY_MS) }),
      ]);

      await expect(service.findDueItems(NOW)).resolves.toHaveLength(1);
    });
  });

  describe('running', () => {
    it('does nothing when no items are due', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([]);

      await expect(service.runReminders(NOW)).resolves.toEqual({
        usersNotified: 0,
        itemsReminded: 0,
      });
      expect(sender.sendToUser).not.toHaveBeenCalled();
    });

    it('names the film when a single item is due', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([item()]);

      await service.runReminders(NOW);

      const [, payload] = sender.sendToUser.mock.calls[0];
      expect(payload.body).toContain('The Matrix');
      expect(payload.url).toBe('/movies/603');
    });

    it('sends one notification per user rather than one per film', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([
        item({ id: 'a' }),
        item({ id: 'b', title: 'Inception' }),
        item({ id: 'c', title: 'Parasite' }),
      ]);

      await service.runReminders(NOW);

      expect(sender.sendToUser).toHaveBeenCalledTimes(1);
      const [, payload] = sender.sendToUser.mock.calls[0];
      expect(payload.body).toContain('2 others');
      expect(payload.url).toBe('/watchlist');
    });

    it('notifies each user separately', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([
        item({ id: 'a', userId: 'user-1' }),
        item({ id: 'b', userId: 'user-2' }),
      ]);

      const result = await service.runReminders(NOW);

      expect(sender.sendToUser).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ usersNotified: 2, itemsReminded: 2 });
    });

    it('stamps lastRemindedAt on every item it reminded about', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([item({ id: 'a' }), item({ id: 'b' })]);

      await service.runReminders(NOW);

      expect(prisma.watchlistItem.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['a', 'b'] } },
        data: { lastRemindedAt: NOW },
      });
    });

    it('leaves lastRemindedAt untouched when delivery fails, so it retries', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([item()]);
      sender.sendToUser.mockRejectedValue(new Error('push service down'));

      const result = await service.runReminders(NOW);

      expect(prisma.watchlistItem.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual({ usersNotified: 0, itemsReminded: 0 });
    });

    it('continues with other users when one fails', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([
        item({ id: 'a', userId: 'user-1' }),
        item({ id: 'b', userId: 'user-2' }),
      ]);
      sender.sendToUser
        .mockRejectedValueOnce(new Error('down'))
        .mockResolvedValueOnce({ sent: 1, failed: 0, pruned: 0 });

      const result = await service.runReminders(NOW);

      expect(result.usersNotified).toBe(1);
    });
  });

  describe('scheduled entry point', () => {
    it('skips entirely when notifications are not configured', async () => {
      config.isEnabled = false;

      await service.handleScheduledRun();

      expect(prisma.watchlistItem.findMany).not.toHaveBeenCalled();
    });

    it('swallows failures so a bad run cannot take the process down', async () => {
      prisma.watchlistItem.findMany.mockRejectedValue(new Error('database unreachable'));

      await expect(service.handleScheduledRun()).resolves.toBeUndefined();
    });
  });
});
