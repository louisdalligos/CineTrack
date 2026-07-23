/*
 * CineTrack service worker — push delivery only.
 *
 * Deliberately has no `fetch` handler and caches nothing (NFR12). A caching
 * worker would keep serving stale assets after a deploy, which is a far worse
 * problem than the one it would solve here.
 */

self.addEventListener('install', () => {
  // Take over immediately rather than waiting for existing tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // A push with a non-JSON body should still surface something rather than
    // being silently dropped.
    payload = { title: 'CineTrack', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'CineTrack';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // Reusing a tag replaces an earlier notification instead of stacking
      // duplicates for the same film.
      tag: payload.tag || undefined,
      data: { url: payload.url || '/watchlist' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/watchlist';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Prefer focusing an open tab over opening a second one.
        for (const client of clientList) {
          if ('focus' in client) {
            if ('navigate' in client) {
              return client.navigate(targetUrl).then((navigated) =>
                navigated ? navigated.focus() : client.focus(),
              );
            }
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
