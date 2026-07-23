'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  value: number | null;
  onChange: (rating: number) => void;
  disabled?: boolean;
  max?: number;
}

/**
 * 1–10 rating control (FR15). Buttons rather than a range input so every value
 * is individually reachable by keyboard and screen reader.
 *
 * Amber is the only colour in an otherwise monochrome interface, and it is
 * spent here deliberately: the rating is the one place the user expresses an
 * opinion, so it is the one thing allowed to be warm.
 */
export function RatingStars({ value, onChange, disabled = false, max = 10 }: RatingStarsProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayed = hovered ?? value ?? 0;

  return (
    <div
      role="group"
      aria-label="Rating out of 10"
      className="flex flex-wrap items-center gap-0.5"
      onMouseLeave={() => setHovered(null)}
    >
      {Array.from({ length: max }, (_, index) => index + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          aria-label={`Rate ${star} out of ${max}`}
          aria-pressed={value === star}
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(star)}
          className="rounded-sm p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Star
            className={cn(
              'size-4',
              star <= displayed ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/40',
            )}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground">
        {value ? `${value}/${max}` : 'Not rated'}
      </span>
    </div>
  );
}
