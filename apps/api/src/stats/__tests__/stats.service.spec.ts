import { Test, TestingModule } from '@nestjs/testing';
import { WatchlistStatus } from '@prisma/client';
import { StatsService } from '../stats.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('StatsService', () => {
  let service: StatsService;
  let prisma: {
    watchlistItem: {
      groupBy: jest.Mock;
      count: jest.Mock;
      aggregate: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const USER_ID = 'user-1';

  beforeEach(async () => {
    prisma = {
      watchlistItem: {
        groupBy: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StatsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<StatsService>(StatsService);
    jest.clearAllMocks();
  });

  function mockAggregates(options: {
    grouped?: Array<{ status: WatchlistStatus; _count: { _all: number } }>;
    watchedThisMonth?: number;
    avgRating?: number | null;
    genreLists?: string[][];
  }) {
    prisma.watchlistItem.groupBy.mockResolvedValue(options.grouped ?? []);
    prisma.watchlistItem.count.mockResolvedValue(options.watchedThisMonth ?? 0);
    prisma.watchlistItem.aggregate.mockResolvedValue({
      _avg: { rating: options.avgRating ?? null },
    });
    prisma.watchlistItem.findMany.mockResolvedValue(
      (options.genreLists ?? []).map((genres) => ({ genres })),
    );
  }

  describe('empty watchlist', () => {
    it('returns zero-filled counts and null average', async () => {
      mockAggregates({});

      const stats = await service.getStats(USER_ID);

      expect(stats).toEqual({
        countsByStatus: {
          [WatchlistStatus.PLANNED]: 0,
          [WatchlistStatus.WATCHING]: 0,
          [WatchlistStatus.WATCHED]: 0,
        },
        total: 0,
        watchedThisMonth: 0,
        averageRating: null,
        topGenres: [],
      });
    });
  });

  describe('counts', () => {
    it('maps grouped counts per status and totals them', async () => {
      mockAggregates({
        grouped: [
          { status: WatchlistStatus.PLANNED, _count: { _all: 4 } },
          { status: WatchlistStatus.WATCHED, _count: { _all: 6 } },
        ],
      });

      const stats = await service.getStats(USER_ID);

      expect(stats.countsByStatus).toEqual({
        [WatchlistStatus.PLANNED]: 4,
        [WatchlistStatus.WATCHING]: 0,
        [WatchlistStatus.WATCHED]: 6,
      });
      expect(stats.total).toBe(10);
    });
  });

  describe('average rating', () => {
    it('passes through the DB-computed average', async () => {
      mockAggregates({ avgRating: 7.5 });

      const stats = await service.getStats(USER_ID);

      expect(stats.averageRating).toBe(7.5);
    });

    it('only averages watched, rated items', async () => {
      mockAggregates({ avgRating: 8 });

      await service.getStats(USER_ID);

      expect(prisma.watchlistItem.aggregate).toHaveBeenCalledWith({
        where: { userId: USER_ID, status: WatchlistStatus.WATCHED, rating: { not: null } },
        _avg: { rating: true },
      });
    });
  });

  describe('watched this month', () => {
    it('counts watched items since the start of the current month', async () => {
      mockAggregates({ watchedThisMonth: 3 });

      const stats = await service.getStats(USER_ID);
      expect(stats.watchedThisMonth).toBe(3);

      const where = prisma.watchlistItem.count.mock.calls[0][0].where;
      expect(where.status).toBe(WatchlistStatus.WATCHED);
      expect(where.watchedAt.gte).toBeInstanceOf(Date);
      expect(where.watchedAt.gte.getDate()).toBe(1);
    });
  });

  describe('top genres', () => {
    it('returns the three most common genres among watched movies', async () => {
      mockAggregates({
        genreLists: [
          ['Action', 'Science Fiction'],
          ['Action', 'Drama'],
          ['Action', 'Science Fiction'],
          ['Comedy'],
        ],
      });

      const stats = await service.getStats(USER_ID);

      // Drama and Comedy both have a count of 1; the alphabetical tie-break
      // puts Comedy in the third slot.
      expect(stats.topGenres).toEqual([
        { genre: 'Action', count: 3 },
        { genre: 'Science Fiction', count: 2 },
        { genre: 'Comedy', count: 1 },
      ]);
    });

    it('breaks count ties alphabetically for stable ordering', async () => {
      mockAggregates({
        genreLists: [['Zombie'], ['Adventure'], ['Mystery']],
      });

      const stats = await service.getStats(USER_ID);

      expect(stats.topGenres.map((g) => g.genre)).toEqual(['Adventure', 'Mystery', 'Zombie']);
    });

    it('only considers genres from watched items', async () => {
      mockAggregates({ genreLists: [] });

      await service.getStats(USER_ID);

      expect(prisma.watchlistItem.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, status: WatchlistStatus.WATCHED },
        select: { genres: true },
      });
    });
  });

  it('scopes every aggregate query to the requesting user', async () => {
    mockAggregates({});

    await service.getStats(USER_ID);

    expect(prisma.watchlistItem.groupBy.mock.calls[0][0].where).toEqual({ userId: USER_ID });
  });
});
