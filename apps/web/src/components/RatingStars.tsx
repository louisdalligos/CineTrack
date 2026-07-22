'use client';

import { useState } from 'react';

interface RatingStarsProps {
  value: number | null;
  onChange: (rating: number) => void;
  disabled?: boolean;
  max?: number;
}

/**
 * 1–10 rating control (FR15). Rendered as buttons rather than a range input
 * so each value is individually reachable by keyboard and screen reader.
 */
export function RatingStars({ value, onChange, disabled = false, max = 10 }: RatingStarsProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayed = hovered ?? value ?? 0;

  return (
    <div
      role="group"
      aria-label="Rating out of 10"
      className="flex flex-wrap items-center gap-1"
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
          className={`text-lg leading-none transition disabled:cursor-not-allowed disabled:opacity-40 ${
            star <= displayed ? 'text-amber-500' : 'text-gray-300'
          }`}
        >
          ★
        </button>
      ))}
      <span className="ml-2 text-sm text-gray-600">{value ? `${value}/${max}` : 'Not rated'}</span>
    </div>
  );
}
