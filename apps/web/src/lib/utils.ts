import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names, resolving Tailwind conflicts so the last value wins.
 * `cn('p-2', 'p-4')` yields `p-4` rather than both, which plain clsx would keep.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
