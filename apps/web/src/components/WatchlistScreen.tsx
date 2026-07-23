'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useWatchlist } from '@/hooks/use-watchlist';
import { WatchlistRow } from './WatchlistRow';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import type { WatchlistStatus } from '@/types/movie';
import { STATUS_LABELS, WATCHLIST_STATUSES } from '@/types/watchlist';

type FilterValue = WatchlistStatus | 'ALL';

const FILTERS: Array<{ value: FilterValue; label: string }> = [
  { value: 'ALL', label: 'All' },
  ...WATCHLIST_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
];

function parseFilter(raw: string | null): FilterValue {
  return WATCHLIST_STATUSES.includes(raw as WatchlistStatus) ? (raw as WatchlistStatus) : 'ALL';
}

export function WatchlistScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFilter = parseFilter(searchParams.get('status'));

  // Filtering happens server-side via GET /watchlist?status= (FR13). Each tab
  // gets its own cache entry, so switching back to a visited tab is instant.
  const {
    data: items,
    isPending,
    isError,
    refetch,
  } = useWatchlist(activeFilter === 'ALL' ? undefined : activeFilter);

  function selectFilter(filter: FilterValue) {
    // push, not replace — tab changes are meaningful history the user may
    // want to navigate back through.
    router.push(filter === 'ALL' ? '/watchlist' : `/watchlist?status=${filter}`, {
      scroll: false,
    });
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">My watchlist</h1>

      <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isActive = filter.value === activeFilter;
          return (
            <button
              key={filter.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => selectFilter(filter.value)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                isActive ? 'bg-black text-white' : 'border hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {isPending && (
        <ul className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} className="h-40 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </ul>
      )}

      {isError && (
        <ErrorState
          message="We could not load your watchlist. Please try again."
          onRetry={() => refetch()}
        />
      )}

      {!isPending && !isError && items && items.length === 0 && (
        <EmptyState
          title={activeFilter === 'ALL' ? 'Your watchlist is empty' : 'Nothing here yet'}
          message={
            activeFilter === 'ALL'
              ? 'Movies you plan to watch will show up here. Find something to get started.'
              : `You have no movies marked as ${STATUS_LABELS[activeFilter as WatchlistStatus].toLowerCase()}.`
          }
          ctaHref="/discover"
          ctaLabel="Discover movies"
        />
      )}

      {items && items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <WatchlistRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </main>
  );
}
