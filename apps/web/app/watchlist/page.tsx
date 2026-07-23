import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { WatchlistScreen } from '@/components/WatchlistScreen';

export const metadata = {
  title: 'Watchlist · CineTrack',
};

// Suspense boundary required because WatchlistScreen reads ?status= via
// useSearchParams (same constraint as the Discover route).
export default function WatchlistPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-full" />
        </main>
      }
    >
      <WatchlistScreen />
    </Suspense>
  );
}
