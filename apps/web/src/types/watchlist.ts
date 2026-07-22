import type { WatchlistStatus } from './movie';

// Mirrors the WatchlistItem row returned by the API (Prisma model).
export interface WatchlistItem {
  id: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  genres: string[];
  status: WatchlistStatus;
  rating: number | null;
  watchedAt: string | null;
  createdAt: string;
}

export interface CreateWatchlistItemInput {
  tmdbId: number;
  title: string;
  posterPath?: string | null;
  genres?: string[];
  status?: WatchlistStatus;
}

export interface UpdateWatchlistItemInput {
  status?: WatchlistStatus;
  rating?: number;
}

export const WATCHLIST_STATUSES: WatchlistStatus[] = ['PLANNED', 'WATCHING', 'WATCHED'];

export const STATUS_LABELS: Record<WatchlistStatus, string> = {
  PLANNED: 'Planned',
  WATCHING: 'Watching',
  WATCHED: 'Watched',
};
