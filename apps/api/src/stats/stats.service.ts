import { Injectable } from '@nestjs/common';
import { WatchlistStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { GenreCount, WatchlistStats } from './types';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: string): Promise<WatchlistStats> {
    const startOfMonth = this.startOfCurrentMonth();

    // Four independent aggregate queries rather than loading rows and
    // counting in JS (FR19, "no N+1"). They don't depend on each other, so
    // they run concurrently. Genres are the one thing Postgres can't group
    // natively here — the column is a string[] — so that query pulls only
    // the genres column for watched items and tallies in memory.
    const [grouped, watchedThisMonth, ratingAgg, watchedGenres] = await Promise.all([
      this.prisma.watchlistItem.groupBy({
        by: ['status'],
        where: { userId },
        _count: { _all: true },
      }),
      this.prisma.watchlistItem.count({
        where: { userId, status: WatchlistStatus.WATCHED, watchedAt: { gte: startOfMonth } },
      }),
      this.prisma.watchlistItem.aggregate({
        where: { userId, status: WatchlistStatus.WATCHED, rating: { not: null } },
        _avg: { rating: true },
      }),
      this.prisma.watchlistItem.findMany({
        where: { userId, status: WatchlistStatus.WATCHED },
        select: { genres: true },
      }),
    ]);

    const countsByStatus = this.zeroFilledStatusCounts();
    for (const row of grouped) {
      countsByStatus[row.status] = row._count._all;
    }

    const total = Object.values(countsByStatus).reduce((sum, count) => sum + count, 0);

    return {
      countsByStatus,
      total,
      watchedThisMonth,
      averageRating: ratingAgg._avg.rating,
      topGenres: this.topGenres(watchedGenres.map((row) => row.genres)),
    };
  }

  private zeroFilledStatusCounts(): Record<WatchlistStatus, number> {
    return {
      [WatchlistStatus.PLANNED]: 0,
      [WatchlistStatus.WATCHING]: 0,
      [WatchlistStatus.WATCHED]: 0,
    };
  }

  private topGenres(genreLists: string[][], limit = 3): GenreCount[] {
    const tally = new Map<string, number>();

    for (const genres of genreLists) {
      for (const genre of genres) {
        tally.set(genre, (tally.get(genre) ?? 0) + 1);
      }
    }

    return (
      [...tally.entries()]
        .map(([genre, count]) => ({ genre, count }))
        // Count desc, then alphabetical so ties are stable rather than
        // dependent on Map insertion order.
        .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre))
        .slice(0, limit)
    );
  }

  private startOfCurrentMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
