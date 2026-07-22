'use client';

import { useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { useDiscoverMovies } from '@/hooks/use-movies';
import { MovieCard } from './MovieCard';
import { SearchBar } from './SearchBar';
import { MovieGridSkeleton } from './MovieCardSkeleton';
import { ErrorState } from './ErrorState';

const SEARCH_DEBOUNCE_MS = 300; // FR7

export function DiscoverScreen() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedSearch.trim().length > 0;

  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useDiscoverMovies(debouncedSearch);

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
        <div className="rounded-lg border p-8 text-center">
          <p className="font-medium">No movies found</p>
          <p className="mt-1 text-sm text-gray-600">
            {isSearching
              ? `Nothing matched "${debouncedSearch}". Try a different title.`
              : 'Trending movies are unavailable right now.'}
          </p>
        </div>
      )}

      {movies.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {movies.map((movie) => (
              // TODO(E4-S1): pass watchlistStatus once GET /watchlist exists,
              // so already-listed movies show their badge here (FR9).
              <MovieCard key={movie.tmdbId} movie={movie} />
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded border px-6 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
