'use client';

import { useStats } from '@/hooks/use-stats';
import { StatCard } from './StatCard';
import { GenreChart } from './GenreChart';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardScreen() {
  const { data: stats, isPending, isError, refetch } = useStats();

  if (isPending) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <ErrorState
          message="We could not load your stats. Please try again."
          onRetry={() => refetch()}
        />
      </main>
    );
  }

  if (stats.total === 0) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <EmptyState
          title="No stats yet"
          message="Add a few movies to your watchlist and your viewing stats will show up here."
          ctaHref="/discover"
          ctaLabel="Discover movies"
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Everything you have tracked so far.</p>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total movies" value={stats.total} />
        <StatCard label="Planned" value={stats.countsByStatus.PLANNED} />
        <StatCard label="Watching" value={stats.countsByStatus.WATCHING} />
        <StatCard label="Watched" value={stats.countsByStatus.WATCHED} />
        <StatCard
          label="Watched this month"
          value={stats.watchedThisMonth}
          hint={stats.watchedThisMonth === 0 ? 'Nothing yet this month' : undefined}
        />
        <StatCard
          label="Average rating"
          // Null means nothing rated yet — distinct from an actual 0.
          value={stats.averageRating === null ? '—' : stats.averageRating.toFixed(1)}
          hint={stats.averageRating === null ? 'No ratings yet' : 'Across watched movies'}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Top genres</CardTitle>
          <CardDescription>Across the movies you have watched.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topGenres.length > 0 ? (
            <GenreChart genres={stats.topGenres} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Mark some movies as watched to see which genres you favour.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
