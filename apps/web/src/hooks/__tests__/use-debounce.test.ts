import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../use-debounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('matrix', 300));

    expect(result.current).toBe('matrix');
  });

  it('does not update before the delay has elapsed', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'mat' },
    });

    rerender({ value: 'matrix' });
    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(result.current).toBe('mat');
  });

  it('updates once the delay has elapsed', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'mat' },
    });

    rerender({ value: 'matrix' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('matrix');
  });

  it('only emits the final value when typing rapidly', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: '' },
    });

    for (const value of ['m', 'ma', 'mat', 'matr', 'matri', 'matrix']) {
      rerender({ value });
      act(() => {
        vi.advanceTimersByTime(50);
      });
    }

    expect(result.current).toBe('');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('matrix');
  });
});
