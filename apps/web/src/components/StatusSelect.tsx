'use client';

import type { WatchlistStatus } from '@/types/movie';
import { STATUS_LABELS, WATCHLIST_STATUSES } from '@/types/watchlist';

interface StatusSelectProps {
  value: WatchlistStatus;
  onChange: (status: WatchlistStatus) => void;
  disabled?: boolean;
  id?: string;
}

export function StatusSelect({ value, onChange, disabled, id = 'status' }: StatusSelectProps) {
  return (
    <select
      id={id}
      aria-label="Watchlist status"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as WatchlistStatus)}
      className="rounded border px-3 py-2 text-sm disabled:opacity-50"
    >
      {WATCHLIST_STATUSES.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}
