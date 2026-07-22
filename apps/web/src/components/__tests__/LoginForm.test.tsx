import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { LoginForm } from '../LoginForm';
import { useAuthStore } from '@/stores/auth-store';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('LoginForm', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
    pushMock.mockClear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows inline validation errors without calling the API', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm redirectTo="/" />);

    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a malformed email inline', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm redirectTo="/" />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('redirects to the requested page after a successful login', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: 'signed.jwt.token' }),
    } as Response);

    const user = userEvent.setup();
    renderWithProviders(<LoginForm redirectTo="/watchlist" />);

    await user.type(screen.getByLabelText(/email/i), 'demo@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/watchlist');
    });
  });

  it('shows the server error inline and does not navigate on bad credentials', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid email or password' }),
    } as Response);

    const user = userEvent.setup();
    renderWithProviders(<LoginForm redirectTo="/" />);

    await user.type(screen.getByLabelText(/email/i), 'demo@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
