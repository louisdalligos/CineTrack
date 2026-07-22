import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WatchlistItem, WatchlistStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWatchlistItemDto } from './dto/create-watchlist-item.dto';
import { UpdateWatchlistItemDto } from './dto/update-watchlist-item.dto';

@Injectable()
export class WatchlistService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string, status?: WatchlistStatus): Promise<WatchlistItem[]> {
    return this.prisma.watchlistItem.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateWatchlistItemDto): Promise<WatchlistItem> {
    const status = dto.status ?? WatchlistStatus.PLANNED;

    try {
      return await this.prisma.watchlistItem.create({
        data: {
          userId,
          tmdbId: dto.tmdbId,
          title: dto.title,
          posterPath: dto.posterPath ?? null,
          genres: dto.genres ?? [],
          status,
          // Adding something straight as Watched should still date it.
          watchedAt: status === WatchlistStatus.WATCHED ? new Date() : null,
        },
      });
    } catch (error) {
      // Rely on the unique (userId, tmdbId) constraint rather than a
      // read-then-write check, which would race under concurrent adds.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This movie is already on your watchlist');
      }
      throw error;
    }
  }

  async update(userId: string, id: string, dto: UpdateWatchlistItemDto): Promise<WatchlistItem> {
    const existing = await this.findOwnedOrThrow(userId, id);

    return this.prisma.watchlistItem.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
        ...this.resolveWatchedAt(existing, dto.status),
      },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.watchlistItem.delete({ where: { id } });
  }

  /**
   * Scopes every lookup by userId, so one user's id can never address another
   * user's row (FR17). A miss is reported as 404 rather than 403 so the API
   * doesn't confirm that someone else's item exists.
   */
  private async findOwnedOrThrow(userId: string, id: string): Promise<WatchlistItem> {
    const item = await this.prisma.watchlistItem.findFirst({ where: { id, userId } });

    if (!item) {
      throw new NotFoundException('Watchlist item not found');
    }

    return item;
  }

  // FR14: moving into Watched stamps the date; moving back out clears it,
  // so a stale watched date can't survive a status change.
  private resolveWatchedAt(
    existing: WatchlistItem,
    nextStatus?: WatchlistStatus,
  ): { watchedAt?: Date | null } {
    if (nextStatus === undefined || nextStatus === existing.status) {
      return {};
    }

    if (nextStatus === WatchlistStatus.WATCHED) {
      return { watchedAt: existing.watchedAt ?? new Date() };
    }

    return { watchedAt: null };
  }
}
