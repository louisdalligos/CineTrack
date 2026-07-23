import type { WatchlistStatus } from './movie';

// Mirrors the API's WatchlistStats shape (apps/api/src/stats/types.ts).
export interface GenreCount {
  genre: string;
  count: number;
}

export interface WatchlistStats {
  countsByStatus: Record<WatchlistStatus, number>;
  total: number;
  watchedThisMonth: number;
  /** Null when nothing has been rated yet — not zero. */
  averageRating: number | null;
  topGenres: GenreCount[];
}
