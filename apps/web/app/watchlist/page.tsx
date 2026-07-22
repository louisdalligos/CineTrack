import { Suspense } from 'react';
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
        <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-9 w-full animate-pulse rounded bg-gray-200" />
        </main>
      }
    >
      <WatchlistScreen />
    </Suspense>
  );
}
