'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { posterUrl } from '@/lib/tmdb-image';
import { RatingStars } from './RatingStars';
import { StatusSelect } from './StatusSelect';
import { useRemoveFromWatchlist, useUpdateWatchlistItem } from '@/hooks/use-watchlist';
import type { WatchlistItem } from '@/types/watchlist';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function WatchlistRow({ item }: { item: WatchlistItem }) {
  const updateItem = useUpdateWatchlistItem();
  const removeItem = useRemoveFromWatchlist();
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const poster = posterUrl(item.posterPath, 'w342');

  return (
    <li className="flex gap-4 rounded-lg border p-4">
      <Link href={`/movies/${item.tmdbId}`} className="shrink-0">
        <div className="relative h-32 w-20 overflow-hidden rounded bg-gray-100">
          {poster ? (
            <Image
              src={poster}
              alt={`${item.title} poster`}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-gray-500">
              No poster
            </div>
          )}
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/movies/${item.tmdbId}`} className="font-medium hover:underline">
              {item.title}
            </Link>
            <p className="text-xs text-gray-500">Added {formatDate(item.createdAt)}</p>
          </div>

          {confirmingRemove ? (
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-gray-600">Remove?</span>
              <button
                type="button"
                onClick={() => removeItem.mutate(item.id)}
                className="rounded bg-red-600 px-2 py-1 text-xs text-white"
              >
                Yes, remove
              </button>
              <button
                type="button"
                onClick={() => setConfirmingRemove(false)}
                className="rounded border px-2 py-1 text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingRemove(true)}
              aria-label={`Remove ${item.title} from watchlist`}
              className="shrink-0 text-xs text-gray-500 underline hover:text-red-600"
            >
              Remove
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusSelect
            id={`status-${item.id}`}
            value={item.status}
            disabled={updateItem.isPending}
            onChange={(status) => updateItem.mutate({ id: item.id, status })}
          />
          {updateItem.isPending && <span className="text-xs text-gray-500">Saving…</span>}
        </div>

        {item.status === 'WATCHED' && (
          <RatingStars
            value={item.rating}
            disabled={updateItem.isPending}
            onChange={(rating) => updateItem.mutate({ id: item.id, rating })}
          />
        )}

        {(updateItem.isError || removeItem.isError) && (
          <p role="alert" className="text-sm text-red-600">
            {((updateItem.error ?? removeItem.error) as Error).message}
          </p>
        )}
      </div>
    </li>
  );
}
