'use client';

import { useStats } from '@/hooks/use-stats';
import { StatCard } from './StatCard';
import { GenreBarList } from './GenreBarList';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

export function DashboardScreen() {
  const { data: stats, isPending, isError, refetch } = useStats();

  if (isPending) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <ErrorState
          message="We could not load your stats. Please try again."
          onRetry={() => refetch()}
        />
      </main>
    );
  }

  if (stats.total === 0) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
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
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Overview</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
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
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Top genres</h2>
        {stats.topGenres.length > 0 ? (
          <GenreBarList genres={stats.topGenres} />
        ) : (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-600">
            Mark some movies as watched to see which genres you favour.
          </p>
        )}
      </section>
    </main>
  );
}
