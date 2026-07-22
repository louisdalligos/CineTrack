import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  message: string;
  ctaHref?: string;
  ctaLabel?: string;
}

/**
 * Shared empty state for the Watchlist and Dashboard screens (FR20).
 */
export function EmptyState({ title, message, ctaHref, ctaLabel }: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center"
    >
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="max-w-sm text-sm text-gray-600">{message}</p>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="mt-2 rounded bg-black px-4 py-2 text-sm font-medium text-white"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
