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

/**
 * Removal is optimistic (FR16): the row disappears immediately and is put
 * back if the API rejects the delete.
 *
 * Snapshots every cached watchlist query, not just the active one, because
 * each status tab holds its own cache entry — a partial rollback would leave
 * the tabs disagreeing about whether the item exists.
 */
export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient<void>(`/watchlist/${id}`, { method: 'DELETE' }),

    onMutate: async (id: string) => {
      // Stop in-flight refetches from overwriting the optimistic state.
      await queryClient.cancelQueries({ queryKey: WATCHLIST_QUERY_KEY });

      const snapshot = queryClient.getQueriesData<WatchlistItem[]>({
        queryKey: WATCHLIST_QUERY_KEY,
      });

      queryClient.setQueriesData<WatchlistItem[]>({ queryKey: WATCHLIST_QUERY_KEY }, (current) =>
        current?.filter((item) => item.id !== id),
      );

      return { snapshot };
    },

    onError: (_error, _id, context) => {
      context?.snapshot.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEY });
    },
  });
}
