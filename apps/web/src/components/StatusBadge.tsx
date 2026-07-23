import type { WatchlistStatus } from '@/types/movie';

const STATUS_STYLES: Record<WatchlistStatus, { label: string; className: string }> = {
  PLANNED: { label: 'Planned', className: 'bg-blue-100 text-blue-800' },
  WATCHING: { label: 'Watching', className: 'bg-amber-100 text-amber-800' },
  WATCHED: { label: 'Watched', className: 'bg-green-100 text-green-800' },
};

export function StatusBadge({ status }: { status: WatchlistStatus }) {
  const { label, className } = STATUS_STYLES[status];

  return (
    <span
      data-testid="status-badge"
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
