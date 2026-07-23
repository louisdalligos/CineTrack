'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { posterUrl } from '@/lib/tmdb-image';
import { RatingStars } from './RatingStars';
import { StatusSelect } from './StatusSelect';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const poster = posterUrl(item.posterPath, 'w342');

  function handleRemove() {
    setConfirmOpen(false);
    // Removal is optimistic, so the row is already gone by the time the
    // request resolves. The error toast is what tells the user why it came
    // back after a rollback.
    removeItem.mutate(item.id, {
      onSuccess: () => toast.success(`Removed ${item.title}`),
      onError: (error) =>
        toast.error(`Could not remove ${item.title}`, {
          description: (error as Error).message,
        }),
    });
  }

  return (
    <Card>
      <CardContent className="flex gap-4 p-4">
        <Link href={`/movies/${item.tmdbId}`} className="shrink-0">
          <div className="relative h-32 w-[85px] overflow-hidden rounded-md border bg-muted">
            {poster ? (
              <Image
                src={poster}
                alt={`${item.title} poster`}
                fill
                sizes="85px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-muted-foreground">
                No poster
              </div>
            )}
          </div>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/movies/${item.tmdbId}`} className="font-medium hover:underline">
                {item.title}
              </Link>
              <p className="text-xs text-muted-foreground">Added {formatDate(item.createdAt)}</p>
            </div>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${item.title} from watchlist`}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove {item.title}?</DialogTitle>
                  <DialogDescription>
                    It comes off your watchlist and your stats. You can add it again from Discover.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Keep it</Button>
                  </DialogClose>
                  <Button variant="destructive" onClick={handleRemove}>
                    Remove
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusSelect
              id={`status-${item.id}`}
              value={item.status}
              disabled={updateItem.isPending}
              onChange={(status) =>
                updateItem.mutate(
                  { id: item.id, status },
                  {
                    onError: (error) =>
                      toast.error('Could not update status', {
                        description: (error as Error).message,
                      }),
                  },
                )
              }
            />
            {updateItem.isPending && <span className="text-xs text-muted-foreground">Saving…</span>}
          </div>

          {item.status === 'WATCHED' && (
            <RatingStars
              value={item.rating}
              disabled={updateItem.isPending}
              onChange={(rating) =>
                updateItem.mutate(
                  { id: item.id, rating },
                  {
                    onError: (error) =>
                      toast.error('Could not save rating', {
                        description: (error as Error).message,
                      }),
                  },
                )
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
