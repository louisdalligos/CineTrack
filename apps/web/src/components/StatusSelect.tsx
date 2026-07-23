'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => onChange(next as WatchlistStatus)}
    >
      <SelectTrigger id={id} aria-label="Watchlist status" className="w-[150px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {WATCHLIST_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
