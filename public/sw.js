/* KillSwitch service worker.
 * - App shell: cache-first (instant loads, offline support)
 * - /data/dataset.json: stale-while-revalidate (yesterday's data beats no data)
 */

const SHELL_CACHE = 'killswitch-shell-v1';
const DATA_CACHE = 'killswitch-data-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(['/', '/manifest.webmanifest'])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Dataset: stale-while-revalidate.
  if (url.pathname.endsWith('/data/dataset.json')) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const refresh = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached ?? refresh;
      }),
    );
    return;
  }

  // Never cache the API proxy.
  if (url.pathname.startsWith('/api/')) return;

  // App shell + hashed assets: cache-first, fill cache from the network.
  event.respondWith(
    caches.open(SHELL_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const res = await fetch(request);
        if (res.ok && (url.pathname.startsWith('/assets/') || request.mode === 'navigate' || url.pathname.startsWith('/icons/'))) {
          cache.put(request, res.clone());
        }
        return res;
      } catch (err) {
        // Offline navigation: serve the cached shell.
        if (request.mode === 'navigate') {
          const shell = await cache.match('/');
          if (shell) return shell;
        }
        throw err;
      }
    }),
  );
});
