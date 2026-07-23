'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useMovieDetails } from '@/hooks/use-movie-details';
import { posterUrl, profileUrl } from '@/lib/tmdb-image';
import { WatchlistControls } from './WatchlistControls';
import { ErrorState } from './ErrorState';
import { ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function formatRuntime(minutes: number | null): string {
  if (!minutes) return 'Runtime unknown';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
}

export function MovieDetailsScreen({ tmdbId }: { tmdbId: number }) {
  const router = useRouter();
  const { data: movie, isPending, isError, error, refetch } = useMovieDetails(tmdbId);

  // router.back() rather than a Link to /discover: it returns the user to the
  // exact history entry they came from, so the Discover search query (held in
  // the URL) and the browser's restored scroll position both survive.
  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.back()}
      className="-ml-2 self-start text-muted-foreground"
    >
      <ChevronLeft className="size-4" />
      Back
    </Button>
  );

  if (isPending) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
        {backButton}
        <div className="flex flex-col gap-6 sm:flex-row">
          <Skeleton className="aspect-[2/3] w-full rounded-lg sm:w-64" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
        {backButton}
        <ErrorState
          title={notFound ? 'Movie not found' : 'Something went wrong'}
          message={
            notFound
              ? 'We could not find a movie with that id.'
              : 'We could not load this movie. Please try again.'
          }
          onRetry={notFound ? undefined : () => refetch()}
        />
      </main>
    );
  }

  const poster = posterUrl(movie.posterPath, 'w500');

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      {backButton}

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="relative aspect-[2/3] w-full shrink-0 overflow-hidden rounded-lg border bg-muted sm:w-64">
          {poster ? (
            <Image
              src={poster}
              alt={`${movie.title} poster`}
              fill
              sizes="(max-width: 640px) 100vw, 256px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No poster available
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{movie.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {movie.year ?? 'Unknown year'} · {formatRuntime(movie.runtime)} · ★{' '}
              {movie.rating.toFixed(1)}
            </p>
          </div>

          {movie.genres.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {movie.genres.map((genre) => (
                <li key={genre}>
                  <Badge variant="secondary">{genre}</Badge>
                </li>
              ))}
            </ul>
          )}

          <p className="text-sm leading-relaxed text-muted-foreground">
            {movie.overview || 'No synopsis available for this title.'}
          </p>

          <WatchlistControls movie={movie} />
        </div>
      </div>

      {movie.cast.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Top billed cast</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {movie.cast.map((member) => {
              const profile = profileUrl(member.profilePath);
              return (
                <li key={member.id} className="flex flex-col gap-2">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-md border bg-muted">
                    {profile ? (
                      <Image
                        src={profile}
                        alt={member.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 20vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No photo
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-tight">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.character}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
