'use client';

import { useEffect, useState } from 'react';

/**
 * Delays propagating a value until it has stopped changing for `delayMs`.
 * Used to keep Discover from firing a search request per keystroke (FR7).
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
