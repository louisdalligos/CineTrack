import { useAuthStore } from '@/stores/auth-store';
import { clearAuthCookie } from '@/lib/auth-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface ApiClientOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

// The Next.js middleware only checks that a token *exists* — it can't verify
// it at the edge. So an expired token gets past routing and fails here on the
// first real fetch. Treat that as a hard logout rather than leaving the user
// on a screen that will never load.
function handleUnauthorized(): void {
  clearAuthCookie();
  useAuthStore.getState().clearAuth();

  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?redirect=${redirect}`;
  }
}

export async function apiClient<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
  const token = useAuthStore.getState().token;

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Don't bounce on a failed login attempt — that 401 is the expected
    // "wrong password" path and the form renders it inline.
    if (res.status === 401 && !path.startsWith('/auth/')) {
      handleUnauthorized();
    }
    throw new ApiError(data?.message ?? 'Request failed', res.status);
  }

  return data as T;
}
