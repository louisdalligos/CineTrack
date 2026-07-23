import { Badge } from '@/components/ui/badge';
import type { WatchlistStatus } from '@/types/movie';

const STATUS_LABELS: Record<WatchlistStatus, string> = {
  PLANNED: 'Planned',
  WATCHING: 'Watching',
  WATCHED: 'Watched',
};

// Monochrome by design: the three states read as a progression from outline
// through muted to solid, rather than as three unrelated colours.
const STATUS_VARIANTS: Record<WatchlistStatus, 'outline' | 'secondary' | 'default'> = {
  PLANNED: 'outline',
  WATCHING: 'secondary',
  WATCHED: 'default',
};

export function StatusBadge({ status }: { status: WatchlistStatus }) {
  return (
    <Badge data-testid="status-badge" variant={STATUS_VARIANTS[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
