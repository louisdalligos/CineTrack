import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationSettings } from '../NotificationSettings';
import type { NotificationState } from '@/types/notifications';

const mockHook = vi.fn();

vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: () => mockHook(),
}));

function givenState(state: NotificationState, overrides: Record<string, unknown> = {}) {
  mockHook.mockReturnValue({
    state,
    checking: false,
    settings: {
      available: true,
      remindersEnabled: true,
      reminderAfterDays: 14,
      subscriptionCount: 1,
      publicKey: 'BPublicKey',
    },
    subscribe: vi.fn(),
    isSubscribing: false,
    unsubscribe: vi.fn(),
    isUnsubscribing: false,
    updateSettings: vi.fn(),
    isUpdatingSettings: false,
    sendTest: vi.fn(),
    isSendingTest: false,
    ...overrides,
  });
}

describe('NotificationSettings', () => {
  beforeEach(() => {
    mockHook.mockReset();
  });

  it('shows a skeleton while capabilities are still being checked', () => {
    givenState('inactive', { checking: true });
    const { container } = render(<NotificationSettings />);

    expect(container.querySelector('[data-slot="skeleton"], .animate-pulse')).toBeTruthy();
  });

  it('explains that the browser cannot receive notifications', () => {
    givenState('unsupported');
    render(<NotificationSettings />);

    expect(screen.getByText('This browser cannot receive notifications')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('explains that the deployment has no push keys', () => {
    givenState('unavailable');
    render(<NotificationSettings />);

    expect(screen.getByText('Notifications are not configured')).toBeInTheDocument();
  });

  it('tells iOS users to install to the Home Screen first', () => {
    givenState('requires-install');
    render(<NotificationSettings />);

    expect(screen.getByText('Add CineTrack to your Home Screen first')).toBeInTheDocument();
    // Offering a toggle here would be a dead end: iOS ignores the permission
    // prompt until the site is installed.
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('tells a blocked user where to unblock', () => {
    givenState('denied');
    render(<NotificationSettings />);

    expect(screen.getByText('Notifications are blocked')).toBeInTheDocument();
  });

  it('offers an unchecked toggle when inactive', () => {
    givenState('inactive');
    render(<NotificationSettings />);

    expect(screen.getByRole('switch')).not.toBeChecked();
    expect(screen.queryByRole('button', { name: /test notification/i })).not.toBeInTheDocument();
  });

  it('offers a checked toggle and a test send when active', () => {
    givenState('active');
    render(<NotificationSettings />);

    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByRole('button', { name: /test notification/i })).toBeInTheDocument();
  });

  it('pluralises the device count', () => {
    givenState('active', {
      settings: {
        available: true,
        remindersEnabled: true,
        reminderAfterDays: 14,
        subscriptionCount: 2,
        publicKey: 'BPublicKey',
      },
    });
    render(<NotificationSettings />);

    expect(screen.getByText('Active on 2 devices.')).toBeInTheDocument();
  });
});
