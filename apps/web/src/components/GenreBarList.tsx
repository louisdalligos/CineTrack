import type { GenreCount } from '@/types/stats';

/**
 * Deliberately plain bars rather than a charting library — the AC calls for
 * a simple list, and this keeps the bundle free of a dependency used once.
 */
export function GenreBarList({ genres }: { genres: GenreCount[] }) {
  const max = Math.max(...genres.map((genre) => genre.count), 1);

  return (
    <ul className="flex flex-col gap-3">
      {genres.map((genre) => (
        <li key={genre.genre} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{genre.genre}</span>
            <span className="text-gray-500">
              {genre.count} {genre.count === 1 ? 'movie' : 'movies'}
            </span>
          </div>
          <div
            role="meter"
            aria-label={`${genre.genre}: ${genre.count}`}
            aria-valuenow={genre.count}
            aria-valuemin={0}
            aria-valuemax={max}
            className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
          >
            <div
              className="h-full rounded-full bg-black"
              style={{ width: `${(genre.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
