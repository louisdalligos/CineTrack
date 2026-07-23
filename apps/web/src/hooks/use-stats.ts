'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { WatchlistStats } from '@/types/stats';

export function useStats() {
  return useQuery<WatchlistStats>({
    queryKey: ['stats'],
    queryFn: () => apiClient<WatchlistStats>('/stats'),
    // Stats are computed server-side, so changes made on the Watchlist screen
    // are not reflected in this cache. Refetching on focus picks them up when
    // the user comes back to the tab (FR19, E5-S2 AC).
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}
