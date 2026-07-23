import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors MovieCard's structure exactly — Card wrapper, borderless poster,
 * p-3 body, two title lines, and a bottom-aligned meta row. Any divergence
 * shows up as the grid resizing when real data replaces the placeholders.
 */
export function MovieCardSkeleton() {
  return (
    <Card data-testid="movie-card-skeleton" className="flex h-full flex-col overflow-hidden py-0">
      <Skeleton className="aspect-[2/3] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="mt-auto flex items-center justify-between pt-2">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </Card>
  );
}

export function MovieGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }, (_, index) => (
        <MovieCardSkeleton key={index} />
      ))}
    </div>
  );
}
