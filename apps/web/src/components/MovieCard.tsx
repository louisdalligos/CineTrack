import Image from 'next/image';
import Link from 'next/link';
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
      className="group flex flex-col overflow-hidden rounded-lg border transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black"
    >
      <div className="relative aspect-[2/3] bg-gray-100">
        {poster ? (
          <Image
            src={poster}
            alt={`${movie.title} poster`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-gray-500">
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
        <div className="mt-auto flex items-center justify-between text-xs text-gray-600">
          <span>{movie.year ?? 'Unknown year'}</span>
          <span aria-label={`Rating ${movie.rating.toFixed(1)} out of 10`}>
            ★ {movie.rating.toFixed(1)}
          </span>
        </div>
      </div>
    </Link>
  );
}
