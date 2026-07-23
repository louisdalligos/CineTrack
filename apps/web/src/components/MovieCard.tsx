import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { posterUrl } from '@/lib/tmdb-image';
import { StatusBadge } from './StatusBadge';
import type { MovieSummary, WatchlistStatus } from '@/types/movie';

interface MovieCardProps {
  movie: MovieSummary;
  /** Present only when the movie is already on the user's watchlist (FR9). */
  watchlistStatus?: WatchlistStatus;
}

export function MovieCard({ movie, watchlistStatus }: MovieCardProps) {
  const poster = posterUrl(movie.posterPath);

  return (
    <Link
      href={`/movies/${movie.tmdbId}`}
      className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="flex h-full flex-col overflow-hidden py-0 transition-shadow group-hover:shadow-md">
        <div className="relative aspect-[2/3] bg-muted">
          {poster ? (
            <Image
              src={poster}
              alt={`${movie.title} poster`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
              No poster available
            </div>
          )}

          {watchlistStatus && (
            <div className="absolute left-2 top-2">
              <StatusBadge status={watchlistStatus} />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3 className="line-clamp-2 text-sm font-medium group-hover:underline">{movie.title}</h3>
          <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
            <span>{movie.year ?? 'Unknown year'}</span>
            <span
              className="inline-flex items-center gap-1"
              aria-label={`Rating ${movie.rating.toFixed(1)} out of 10`}
            >
              <Star className="size-3 fill-amber-500 text-amber-500" aria-hidden />
              {movie.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
