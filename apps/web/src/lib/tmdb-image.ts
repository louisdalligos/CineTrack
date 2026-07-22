const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Poster paths come from the API as bare paths ("/abc.jpg"). Images are
// served straight from TMDB's CDN — no API key involved, so this is safe
// client-side and keeps image bytes off our own API.
export function posterUrl(path: string | null, size: 'w342' | 'w500' = 'w342'): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

export function profileUrl(path: string | null): string | null {
  return path ? `${TMDB_IMAGE_BASE}/w185${path}` : null;
}
