import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DiscoverScreen } from '@/components/DiscoverScreen';
import { MovieGridSkeleton } from '@/components/MovieCardSkeleton';

export const metadata = {
  title: 'Discover · CineTrack',
};

// DiscoverScreen reads the ?q= param via useSearchParams, which Next 14
// requires to sit inside a Suspense boundary or `next build` fails while
// prerendering this route.
export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
          <MovieGridSkeleton />
        </main>
      }
    >
      <DiscoverScreen />
    </Suspense>
  );
}
