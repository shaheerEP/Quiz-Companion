const CACHE_NAME = 'quiz-revision-offline-v2';

// Essential initial URLs to cache
const PRECACHE_URLS = [
  '/',
  '/revision',
  '/self-revision',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        // Precache error is non-fatal if offline during install
        console.warn('[SW] Precache notice:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // We only cache GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 1. Navigation requests (loading pages like /revision?studentId=...)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
              // If it's any revision route, also cache under base /revision
              if (url.pathname.startsWith('/revision')) {
                cache.put('/revision', response.clone());
              }
              if (url.pathname.startsWith('/self-revision')) {
                cache.put('/self-revision', response.clone());
              }
            });
          }
          return response;
        })
        .catch(async () => {
          // Offline navigation fallback:
          // Try exact request
          const exactMatch = await caches.match(request);
          if (exactMatch) return exactMatch;

          // Try pathname without search parameters
          const pathMatch = await caches.match(url.pathname, { ignoreSearch: true });
          if (pathMatch) return pathMatch;

          // If navigation is for /revision*, return cached /revision shell
          if (url.pathname.startsWith('/revision')) {
            const revisionMatch = await caches.match('/revision', { ignoreSearch: true });
            if (revisionMatch) return revisionMatch;
          }

          // If navigation is for /self-revision*, return cached /self-revision shell
          if (url.pathname.startsWith('/self-revision')) {
            const selfRevisionMatch = await caches.match('/self-revision', { ignoreSearch: true });
            if (selfRevisionMatch) return selfRevisionMatch;
          }

          // Fallback to cached home page
          const homeMatch = await caches.match('/');
          if (homeMatch) return homeMatch;

          return new Response('Offline: Page not cached yet. Please connect to internet to load this page first.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // 2. Next.js static assets and media (_next/static/*, fonts, images, icons)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Stale-while-revalidate in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. API requests relevant to revision and self-revision (Network-first with Cache fallback)
  if (
    url.pathname.startsWith('/api/revision/notes') ||
    url.pathname.startsWith('/api/revision/due') ||
    url.pathname.startsWith('/api/self-revision/notes') ||
    url.pathname.startsWith('/api/self-revision/due') ||
    url.pathname.startsWith('/api/students')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        })
    );
    return;
  }
});
