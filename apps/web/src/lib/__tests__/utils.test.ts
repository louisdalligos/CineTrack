import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('flex', 'items-center')).toBe('flex items-center');
  });

  it('drops falsy values', () => {
    expect(cn('flex', false && 'hidden', undefined, null)).toBe('flex');
  });

  it('applies conditional objects', () => {
    expect(cn('flex', { hidden: false, 'gap-2': true })).toBe('flex gap-2');
  });

  it('resolves conflicting tailwind utilities in favour of the last', () => {
    // The reason twMerge is here rather than plain clsx: a component's base
    // classes must be overridable by a caller's className.
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('keeps utilities that only look similar', () => {
    expect(cn('mt-2', 'mb-4')).toBe('mt-2 mb-4');
  });
});
