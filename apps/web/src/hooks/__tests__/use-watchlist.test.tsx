import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useRemoveFromWatchlist, WATCHLIST_QUERY_KEY } from '../use-watchlist';
import { useAuthStore } from '@/stores/auth-store';
import type { WatchlistItem } from '@/types/watchlist';

const items: WatchlistItem[] = [
  {
    id: 'item-1',
    tmdbId: 603,
    title: 'The Matrix',
    posterPath: '/matrix.jpg',
    genres: ['Action'],
    status: 'PLANNED',
    rating: null,
    watchedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item-2',
    tmdbId: 27205,
    title: 'Inception',
    posterPath: '/inception.jpg',
    genres: ['Science Fiction'],
    status: 'WATCHED',
    rating: 9,
    watchedAt: '2026-01-05T00:00:00.000Z',
    createdAt: '2026-01-02T00:00:00.000Z',
  },
];

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(WATCHLIST_QUERY_KEY, items);

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { queryClient, wrapper };
}

describe('useRemoveFromWatchlist', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'test.token', user: { email: 'demo@example.com' } });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('removes the item from the cache immediately, before the API responds', async () => {
    const { queryClient, wrapper } = setup();
    let resolveRequest: (value: Response) => void = () => {};
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const { result } = renderHook(() => useRemoveFromWatchlist(), { wrapper });

    act(() => {
      result.current.mutate('item-1');
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<WatchlistItem[]>(WATCHLIST_QUERY_KEY);
      expect(cached?.map((item) => item.id)).toEqual(['item-2']);
    });

    resolveRequest({ ok: true, json: async () => null } as Response);
  });

  it('restores the removed item when the API call fails', async () => {
    const { queryClient, wrapper } = setup();
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Server error' }),
    } as Response);

    const { result } = renderHook(() => useRemoveFromWatchlist(), { wrapper });

    act(() => {
      result.current.mutate('item-1');
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const cached = queryClient.getQueryData<WatchlistItem[]>(WATCHLIST_QUERY_KEY);
    expect(cached?.map((item) => item.id)).toEqual(['item-1', 'item-2']);
  });

  it('rolls back every cached status tab, not just the active one', async () => {
    const { queryClient, wrapper } = setup();
    // A previously-visited "Planned" tab holds its own cache entry.
    queryClient.setQueryData([...WATCHLIST_QUERY_KEY, 'PLANNED'], [items[0]]);

    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Server error' }),
    } as Response);

    const { result } = renderHook(() => useRemoveFromWatchlist(), { wrapper });

    act(() => {
      result.current.mutate('item-1');
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(
      queryClient.getQueryData<WatchlistItem[]>([...WATCHLIST_QUERY_KEY, 'PLANNED']),
    ).toHaveLength(1);
  });

  it('issues a DELETE to the scoped item endpoint', async () => {
    const { wrapper } = setup();
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => null } as Response);

    const { result } = renderHook(() => useRemoveFromWatchlist(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('item-1');
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/watchlist/item-1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
