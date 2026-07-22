// A mirror of the Zustand-persisted token, written as a cookie so that
// Next.js middleware (which runs at the edge, with no access to
// localStorage) can decide whether a request is authenticated.
export const AUTH_COOKIE_NAME = 'cinetrack_token';

export function setAuthCookie(token: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE_NAME}=${token}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

export function clearAuthCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;
}
