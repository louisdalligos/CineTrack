'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { useDiscoverMovies } from '@/hooks/use-movies';
import { useWatchlist } from '@/hooks/use-watchlist';
import { MovieCard } from './MovieCard';
import { SearchBar } from './SearchBar';
import { MovieGridSkeleton } from './MovieCardSkeleton';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import { Button } from '@/components/ui/button';
import type { WatchlistStatus } from '@/types/movie';

const SEARCH_DEBOUNCE_MS = 300; // FR7

export function DiscoverScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Seeding from the URL is what makes back-navigation from a movie's details
  // page land on the same search results (E3-S3 AC).
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '');
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedSearch.trim().length > 0;

  useEffect(() => {
    const query = debouncedSearch.trim();
    const nextUrl = query ? `/discover?q=${encodeURIComponent(query)}` : '/discover';
    // replace, not push — typing should not fill the history stack with a
    // separate entry per keystroke.
    router.replace(nextUrl, { scroll: false });
  }, [debouncedSearch, router]);

  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useDiscoverMovies(debouncedSearch);

  const { data: watchlist } = useWatchlist();

  // FR9: badge cards that are already on the list.
  const statusByTmdbId = new Map<number, WatchlistStatus>(
    watchlist?.map((item) => [item.tmdbId, item.status]) ?? [],
  );

  const movies = data?.pages.flatMap((page) => page.results) ?? [];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">
          {isSearching ? 'Search results' : 'Trending now'}
        </h1>
        <SearchBar value={searchInput} onChange={setSearchInput} />
      </div>

      {isPending && <MovieGridSkeleton />}

      {isError && (
        <ErrorState
          message="We could not reach the movie service. Please try again."
          onRetry={() => refetch()}
        />
      )}

      {!isPending && !isError && movies.length === 0 && (
        <EmptyState
          title="No movies found"
          message={
            isSearching
              ? `Nothing matched "${debouncedSearch}". Try a different title.`
              : 'Trending movies are unavailable right now.'
          }
        />
      )}

      {movies.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {movies.map((movie) => (
              <MovieCard
                key={movie.tmdbId}
                movie={movie}
                watchlistStatus={statusByTmdbId.get(movie.tmdbId)}
              />
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
