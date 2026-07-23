'use client';

import { useState } from 'react';
import { RatingStars } from './RatingStars';
import { StatusSelect } from './StatusSelect';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
    return <Skeleton className="h-32 w-full" />;
  }

  if (!entry) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Add to your watchlist</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusSelect value={pendingStatus} onChange={setPendingStatus} />
            <Button
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
            >
              {addToWatchlist.isPending ? 'Adding…' : 'Add to watchlist'}
            </Button>
          </div>
          {addToWatchlist.isError && (
            <p role="alert" className="text-sm text-destructive">
              {(addToWatchlist.error as Error).message}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">On your watchlist</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusSelect
            value={entry.status}
            disabled={updateItem.isPending}
            onChange={(status) => updateItem.mutate({ id: entry.id, status })}
          />
          {updateItem.isPending && <span className="text-xs text-muted-foreground">Saving…</span>}
        </div>

        {entry.status === 'WATCHED' && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Your rating</span>
            <RatingStars
              value={entry.rating}
              disabled={updateItem.isPending}
              onChange={(rating) => updateItem.mutate({ id: entry.id, rating })}
            />
          </div>
        )}

        {updateItem.isError && (
          <p role="alert" className="text-sm text-destructive">
            {(updateItem.error as Error).message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
