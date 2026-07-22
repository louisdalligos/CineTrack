import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, WatchlistStatus } from '@prisma/client';
import { WatchlistService } from '../watchlist.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('WatchlistService', () => {
  let service: WatchlistService;
  let prisma: {
    watchlistItem: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const OWNER_ID = 'user-owner';
  const OTHER_USER_ID = 'user-intruder';
  const ITEM_ID = '11111111-1111-4111-8111-111111111111';

  const plannedItem = {
    id: ITEM_ID,
    userId: OWNER_ID,
    tmdbId: 603,
    title: 'The Matrix',
    posterPath: '/matrix.jpg',
    genres: ['Action'],
    status: WatchlistStatus.PLANNED,
    rating: null,
    watchedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  function duplicateKeyError() {
    return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.17.0',
    });
  }

  beforeEach(async () => {
    prisma = {
      watchlistItem: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WatchlistService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<WatchlistService>(WatchlistService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('scopes the query to the requesting user', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([plannedItem]);

      await service.findAll(OWNER_ID);

      expect(prisma.watchlistItem.findMany).toHaveBeenCalledWith({
        where: { userId: OWNER_ID },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('applies the status filter when provided', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([]);

      await service.findAll(OWNER_ID, WatchlistStatus.WATCHED);

      expect(prisma.watchlistItem.findMany).toHaveBeenCalledWith({
        where: { userId: OWNER_ID, status: WatchlistStatus.WATCHED },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('defaults new items to PLANNED with no watched date', async () => {
      prisma.watchlistItem.create.mockResolvedValue(plannedItem);

      await service.create(OWNER_ID, { tmdbId: 603, title: 'The Matrix' });

      expect(prisma.watchlistItem.create).toHaveBeenCalledWith({
        data: {
          userId: OWNER_ID,
          tmdbId: 603,
          title: 'The Matrix',
          posterPath: null,
          genres: [],
          status: WatchlistStatus.PLANNED,
          watchedAt: null,
        },
      });
    });

    it('stamps watchedAt when an item is added straight as WATCHED', async () => {
      prisma.watchlistItem.create.mockResolvedValue(plannedItem);

      await service.create(OWNER_ID, {
        tmdbId: 603,
        title: 'The Matrix',
        status: WatchlistStatus.WATCHED,
      });

      const data = prisma.watchlistItem.create.mock.calls[0][0].data;
      expect(data.watchedAt).toBeInstanceOf(Date);
    });

    it('translates the unique constraint violation into a 409', async () => {
      prisma.watchlistItem.create.mockRejectedValue(duplicateKeyError());

      await expect(service.create(OWNER_ID, { tmdbId: 603, title: 'The Matrix' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('rethrows unexpected database errors untouched', async () => {
      const dbError = new Error('connection lost');
      prisma.watchlistItem.create.mockRejectedValue(dbError);

      await expect(service.create(OWNER_ID, { tmdbId: 603, title: 'The Matrix' })).rejects.toThrow(
        dbError,
      );
    });
  });

  describe('update', () => {
    it('records watchedAt when the status moves to WATCHED', async () => {
      prisma.watchlistItem.findFirst.mockResolvedValue(plannedItem);
      prisma.watchlistItem.update.mockResolvedValue(plannedItem);

      await service.update(OWNER_ID, ITEM_ID, { status: WatchlistStatus.WATCHED });

      const data = prisma.watchlistItem.update.mock.calls[0][0].data;
      expect(data.status).toBe(WatchlistStatus.WATCHED);
      expect(data.watchedAt).toBeInstanceOf(Date);
    });

    it('preserves the original watchedAt if the item was already watched', async () => {
      const alreadyWatched = {
        ...plannedItem,
        status: WatchlistStatus.WATCHED,
        watchedAt: new Date('2025-06-01T00:00:00Z'),
      };
      prisma.watchlistItem.findFirst.mockResolvedValue(alreadyWatched);
      prisma.watchlistItem.update.mockResolvedValue(alreadyWatched);

      await service.update(OWNER_ID, ITEM_ID, { rating: 9 });

      const data = prisma.watchlistItem.update.mock.calls[0][0].data;
      expect(data.watchedAt).toBeUndefined();
      expect(data.rating).toBe(9);
    });

    it('clears watchedAt when the status moves back out of WATCHED', async () => {
      const watched = {
        ...plannedItem,
        status: WatchlistStatus.WATCHED,
        watchedAt: new Date('2025-06-01T00:00:00Z'),
      };
      prisma.watchlistItem.findFirst.mockResolvedValue(watched);
      prisma.watchlistItem.update.mockResolvedValue(watched);

      await service.update(OWNER_ID, ITEM_ID, { status: WatchlistStatus.WATCHING });

      const data = prisma.watchlistItem.update.mock.calls[0][0].data;
      expect(data.watchedAt).toBeNull();
    });

    it('persists a rating without touching the status', async () => {
      prisma.watchlistItem.findFirst.mockResolvedValue(plannedItem);
      prisma.watchlistItem.update.mockResolvedValue(plannedItem);

      await service.update(OWNER_ID, ITEM_ID, { rating: 7 });

      const data = prisma.watchlistItem.update.mock.calls[0][0].data;
      expect(data).toEqual({ rating: 7 });
    });
  });

  describe('cross-user access (FR17)', () => {
    it('refuses to update an item belonging to another user', async () => {
      // The scoped lookup finds nothing, because the row's userId is not ours.
      prisma.watchlistItem.findFirst.mockResolvedValue(null);

      await expect(service.update(OTHER_USER_ID, ITEM_ID, { rating: 10 })).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.watchlistItem.update).not.toHaveBeenCalled();
    });

    it('refuses to delete an item belonging to another user', async () => {
      prisma.watchlistItem.findFirst.mockResolvedValue(null);

      await expect(service.remove(OTHER_USER_ID, ITEM_ID)).rejects.toThrow(NotFoundException);

      expect(prisma.watchlistItem.delete).not.toHaveBeenCalled();
    });

    it('always includes userId in the ownership lookup', async () => {
      prisma.watchlistItem.findFirst.mockResolvedValue(plannedItem);
      prisma.watchlistItem.delete.mockResolvedValue(plannedItem);

      await service.remove(OWNER_ID, ITEM_ID);

      expect(prisma.watchlistItem.findFirst).toHaveBeenCalledWith({
        where: { id: ITEM_ID, userId: OWNER_ID },
      });
    });
  });

  describe('remove', () => {
    it('deletes an owned item', async () => {
      prisma.watchlistItem.findFirst.mockResolvedValue(plannedItem);
      prisma.watchlistItem.delete.mockResolvedValue(plannedItem);

      await service.remove(OWNER_ID, ITEM_ID);

      expect(prisma.watchlistItem.delete).toHaveBeenCalledWith({ where: { id: ITEM_ID } });
    });

    it('throws NotFoundException for an id that does not exist', async () => {
      prisma.watchlistItem.findFirst.mockResolvedValue(null);

      await expect(service.remove(OWNER_ID, ITEM_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
