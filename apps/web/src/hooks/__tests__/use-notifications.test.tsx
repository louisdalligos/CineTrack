import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useNotifications } from '../use-notifications';
import { useAuthStore } from '@/stores/auth-store';
import type { NotificationSettings } from '@/types/notifications';

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const AVAILABLE_SETTINGS: NotificationSettings = {
  available: true,
  remindersEnabled: true,
  reminderAfterDays: 14,
  subscriptionCount: 0,
  publicKey: 'BPublicKey',
};

function mockSettings(settings: Partial<NotificationSettings> = {}) {
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => ({ ...AVAILABLE_SETTINGS, ...settings }),
  } as Response);
}

/** Installs the browser APIs the hook probes for. */
function givenPushSupport(
  options: {
    permission?: NotificationPermission;
    existingSubscription?: boolean;
  } = {},
) {
  const subscription = options.existingSubscription
    ? { endpoint: 'https://push.example.com/abc', toJSON: () => ({ keys: {} }) }
    : null;

  vi.stubGlobal('Notification', {
    permission: options.permission ?? 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  });

  const registration = {
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(subscription),
      subscribe: vi.fn().mockResolvedValue({
        endpoint: 'https://push.example.com/new',
        toJSON: () => ({ keys: { p256dh: 'p', auth: 'a' } }),
      }),
    },
  };

  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      register: vi.fn().mockResolvedValue(registration),
      getRegistration: vi.fn().mockResolvedValue(registration),
      // subscribe() waits on this, because register() resolves before the
      // worker has activated.
      ready: Promise.resolve(registration),
    },
  });

  vi.stubGlobal('PushManager', class {});
}

function removePushSupport() {
  // @ts-expect-error deliberately removing the API to simulate an old browser
  delete navigator.serviceWorker;
  vi.unstubAllGlobals();
}

describe('useNotifications', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'test.token', user: { email: 'demo@example.com' } });
    vi.stubGlobal('fetch', vi.fn());
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Macintosh) Chrome/120',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reports unsupported when the browser lacks the push APIs', async () => {
    removePushSupport();
    vi.stubGlobal('fetch', vi.fn());
    mockSettings();

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.state).toBe('unsupported');
  });

  it('reports unavailable when the server has no VAPID keys', async () => {
    givenPushSupport();
    mockSettings({ available: false, publicKey: null });

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('unavailable'));
  });

  it('reports denied when the user has blocked notifications', async () => {
    givenPushSupport({ permission: 'denied' });
    mockSettings();

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('denied'));
  });

  it('reports inactive when everything is ready but nothing is subscribed', async () => {
    givenPushSupport({ permission: 'default', existingSubscription: false });
    mockSettings();

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('inactive'));
  });

  it('reports active when a subscription already exists', async () => {
    givenPushSupport({ permission: 'granted', existingSubscription: true });
    mockSettings();

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('active'));
  });

  it('reports requires-install on iOS outside standalone mode', async () => {
    // iOS delivers push only to a Home Screen installation, so offering the
    // permission prompt in Safari would be a dead end.
    givenPushSupport({ permission: 'default' });
    mockSettings();
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari',
    });

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('requires-install'));
  });

  it('surfaces the configured reminder interval', async () => {
    givenPushSupport();
    mockSettings({ reminderAfterDays: 30 });

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.settings?.reminderAfterDays).toBe(30));
  });
});
