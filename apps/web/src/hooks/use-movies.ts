'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedMovies } from '@/types/movie';

/**
 * Backs the Discover grid. Trending and search share one hook so that
 * clearing the search box restores trending without a separate code path
 * (FR7) — the query key swap makes TanStack Query serve cached trending
 * results instantly on clear.
 */
export function useDiscoverMovies(searchQuery: string) {
  const trimmedQuery = searchQuery.trim();
  const isSearching = trimmedQuery.length > 0;

  return useInfiniteQuery<PaginatedMovies>({
    queryKey: isSearching ? ['movies', 'search', trimmedQuery] : ['movies', 'trending'],
    queryFn: ({ pageParam }) => {
      const page = pageParam as number;
      return isSearching
        ? apiClient<PaginatedMovies>(
            `/movies/search?q=${encodeURIComponent(trimmedQuery)}&page=${page}`,
          )
        : apiClient<PaginatedMovies>(`/movies/trending?page=${page}`);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 5 * 60 * 1000, // matches the API-side TMDB cache TTL (NFR6)
  });
}
