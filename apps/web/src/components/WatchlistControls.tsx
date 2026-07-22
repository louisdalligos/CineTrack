'use client';

import { useState } from 'react';
import { RatingStars } from './RatingStars';
import { StatusSelect } from './StatusSelect';
import {
  useAddToWatchlist,
  useUpdateWatchlistItem,
  useWatchlistEntry,
} from '@/hooks/use-watchlist';
import type { MovieDetails, WatchlistStatus } from '@/types/movie';

/**
 * Renders either the "add to watchlist" control (FR11) or, when the movie is
 * already listed, its current status and rating with in-place editing (FR12).
 * One entry per user per movie is guaranteed server-side by the unique
 * (userId, tmdbId) constraint, so there is no duplicate path to handle here.
 */
export function WatchlistControls({ movie }: { movie: MovieDetails }) {
  const { entry, isPending } = useWatchlistEntry(movie.tmdbId);
  const addToWatchlist = useAddToWatchlist();
  const updateItem = useUpdateWatchlistItem();
  const [pendingStatus, setPendingStatus] = useState<WatchlistStatus>('PLANNED');

  if (isPending) {
    return <div className="h-12 w-64 animate-pulse rounded bg-gray-200" />;
  }

  if (!entry) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <p className="text-sm font-medium">Add to your watchlist</p>
        <div className="flex flex-wrap items-center gap-3">
          <StatusSelect value={pendingStatus} onChange={setPendingStatus} />
          <button
            type="button"
            disabled={addToWatchlist.isPending}
            onClick={() =>
              addToWatchlist.mutate({
                tmdbId: movie.tmdbId,
                title: movie.title,
                posterPath: movie.posterPath,
                genres: movie.genres,
                status: pendingStatus,
              })
            }
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {addToWatchlist.isPending ? 'Adding…' : 'Add to watchlist'}
          </button>
        </div>
        {addToWatchlist.isError && (
          <p role="alert" className="text-sm text-red-600">
            {(addToWatchlist.error as Error).message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <p className="text-sm font-medium">On your watchlist</p>

      <div className="flex flex-wrap items-center gap-3">
        <StatusSelect
          value={entry.status}
          disabled={updateItem.isPending}
          onChange={(status) => updateItem.mutate({ id: entry.id, status })}
        />
        {updateItem.isPending && <span className="text-xs text-gray-500">Saving…</span>}
      </div>

      {entry.status === 'WATCHED' && (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Your rating</span>
          <RatingStars
            value={entry.rating}
            disabled={updateItem.isPending}
            onChange={(rating) => updateItem.mutate({ id: entry.id, rating })}
          />
        </div>
      )}

      {updateItem.isError && (
        <p role="alert" className="text-sm text-red-600">
          {(updateItem.error as Error).message}
        </p>
      )}
    </div>
  );
}
