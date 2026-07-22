'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { WatchlistStatus } from '@/types/movie';
import type {
  CreateWatchlistItemInput,
  UpdateWatchlistItemInput,
  WatchlistItem,
} from '@/types/watchlist';

export const WATCHLIST_QUERY_KEY = ['watchlist'] as const;

export function useWatchlist(status?: WatchlistStatus) {
  return useQuery<WatchlistItem[]>({
    queryKey: status ? [...WATCHLIST_QUERY_KEY, status] : WATCHLIST_QUERY_KEY,
    queryFn: () => apiClient<WatchlistItem[]>(`/watchlist${status ? `?status=${status}` : ''}`),
  });
}

/**
 * Looks up whether a given TMDB movie is already on the list (FR9, FR12).
 * Reads the unfiltered watchlist query so Discover and the details page
 * share one cache entry rather than each fetching their own.
 */
export function useWatchlistEntry(tmdbId: number | undefined) {
  const { data, isPending } = useWatchlist();

  return {
    entry: tmdbId ? data?.find((item) => item.tmdbId === tmdbId) : undefined,
    isPending,
  };
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWatchlistItemInput) =>
      apiClient<WatchlistItem>('/watchlist', { method: 'POST', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEY });
    },
  });
}

export function useUpdateWatchlistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateWatchlistItemInput & { id: string }) =>
      apiClient<WatchlistItem>(`/watchlist/${id}`, { method: 'PATCH', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEY });
    },
  });
}
