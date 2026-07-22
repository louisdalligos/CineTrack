'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { MovieDetails } from '@/types/movie';

export function useMovieDetails(tmdbId: number) {
  return useQuery<MovieDetails>({
    queryKey: ['movies', 'details', tmdbId],
    queryFn: () => apiClient<MovieDetails>(`/movies/${tmdbId}`),
    staleTime: 5 * 60 * 1000,
    enabled: Number.isInteger(tmdbId) && tmdbId > 0,
  });
}
