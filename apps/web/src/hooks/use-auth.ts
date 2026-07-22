'use client';

import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { setAuthCookie, clearAuthCookie } from '@/lib/auth-cookie';

interface Credentials {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
}

interface RegisterResponse {
  id: string;
  email: string;
  createdAt: string;
}

// Matches the API's JWT expiry (NFR2) so the cookie and token never drift.
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24;

export function useAuth() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const loginMutation = useMutation({
    mutationFn: (credentials: Credentials) =>
      apiClient<LoginResponse>('/auth/login', { method: 'POST', body: credentials }),
    onSuccess: (data, variables) => {
      setAuthCookie(data.accessToken, TOKEN_MAX_AGE_SECONDS);
      setAuth(data.accessToken, { email: variables.email });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (credentials: Credentials) =>
      apiClient<RegisterResponse>('/auth/register', { method: 'POST', body: credentials }),
  });

  function logout(): void {
    clearAuthCookie();
    clearAuth();
  }

  return {
    token,
    user,
    isAuthenticated: Boolean(token),
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error as Error | null,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error as Error | null,
    logout,
  };
}
