/* eslint-env serviceworker */
// Isaak Service Worker — PWA offline + cache strategy
const CACHE_VERSION = 'isaak-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/chat',
  '/manifest.json',
  '/Personalidad/isaak-avatar-verifactu.png',
  '/Personalidad/isaak-avatar-2.png',
];

// Routes that should NEVER be cached (API calls, auth, dynamic data)
const NO_CACHE_PATTERNS = [/\/api\//, /\/_next\/webpack-hmr/, /\/auth/, /\/api\/auth/];

// Routes that are API calls we want to handle gracefully offline
const API_PATTERNS = [/\/api\/holded\/chat/, /\/api\/ventas\//, /\/api\/isaak\//];

// ── Install ────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_ASSETS).catch(() => {
        // Silently fail — not all assets may be available at install time
      })
    )
  );
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith('isaak-') && key !== STATIC_CACHE && key !== RUNTIME_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

// ── Fetch ──────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Never cache API calls and auth routes
  if (NO_CACHE_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            JSON.stringify({ ok: false, error: 'Sin conexión. Reconecta para continuar.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          )
      )
    );
    return;
  }

  // Next.js static assets — cache first, then network
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Navigation requests (HTML pages) — network first, fall back to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ??
              caches.match('/').then(
                (fallback) =>
                  fallback ??
                  new Response('<h1>Sin conexión</h1><p>Reconecta para usar Isaak.</p>', {
                    headers: { 'Content-Type': 'text/html' },
                  })
              )
          )
        )
    );
    return;
  }

  // Public assets (images, fonts, etc.) — stale-while-revalidate
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      });
      return cached ?? networkFetch;
    })
  );
});

// ── Push Notifications (future) ────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title ?? 'Isaak', {
        body: data.body ?? '',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: data.tag ?? 'isaak-notification',
        data: { url: data.url ?? '/chat' },
      })
    );
  } catch {
    // Ignore malformed push payloads
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/chat';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.includes(self.location.origin) && 'focus' in c);
      if (existing) {
        existing.focus();
        existing.navigate(targetUrl);
      } else {
        clients.openWindow(targetUrl);
      }
    })
  );
});
