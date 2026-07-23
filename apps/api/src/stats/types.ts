import type { WatchlistStatus } from '@prisma/client';

export interface GenreCount {
  genre: string;
  count: number;
}

export interface WatchlistStats {
  // Count per status, always includes every status (zero-filled).
  countsByStatus: Record<WatchlistStatus, number>;
  total: number;
  watchedThisMonth: number;
  averageRating: number | null;
  topGenres: GenreCount[];
}
