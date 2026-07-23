'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useWatchlist } from '@/hooks/use-watchlist';
import { WatchlistRow } from './WatchlistRow';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  // gets its own cache entry, so returning to a visited tab is instant.
  const {
    data: items,
    isPending,
    isError,
    refetch,
  } = useWatchlist(activeFilter === 'ALL' ? undefined : activeFilter);

  function selectFilter(filter: FilterValue) {
    // push, not replace — tab changes are meaningful history.
    router.push(filter === 'ALL' ? '/watchlist' : `/watchlist?status=${filter}`, {
      scroll: false,
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My watchlist</h1>
        <p className="text-sm text-muted-foreground">Everything you meant to watch.</p>
      </div>

      <Tabs value={activeFilter} onValueChange={(value) => selectFilter(value as FilterValue)}>
        <TabsList>
          {FILTERS.map((filter) => (
            <TabsTrigger key={filter.value} value={filter.value}>
              {filter.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeFilter} className="mt-6 flex flex-col gap-3">
          {isPending &&
            Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-40 rounded-xl" />
            ))}

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
                  : `You have no movies marked as ${STATUS_LABELS[
                      activeFilter as WatchlistStatus
                    ].toLowerCase()}.`
              }
              ctaHref="/discover"
              ctaLabel="Discover movies"
            />
          )}

          {items?.map((item) => (
            <WatchlistRow key={item.id} item={item} />
          ))}
        </TabsContent>
      </Tabs>
    </main>
  );
}
