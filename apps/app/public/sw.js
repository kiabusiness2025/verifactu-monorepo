// Service Worker para Verifactu Business PWA
const CACHE_VERSION = "v2";
const CACHE_NAME = `verifactu-${CACHE_VERSION}`;
const STATIC_CACHE = `verifactu-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `verifactu-dynamic-${CACHE_VERSION}`;
const API_CACHE = `verifactu-api-${CACHE_VERSION}`;

// Assets críticos para offline
const STATIC_ASSETS = [
  "/dashboard",
  "/demo",
  "/offline",
  "/favicon.ico",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
];

// Rutas de API para cachear (lectura)
const CACHEABLE_API_ROUTES = [
  "/api/tenants",
  "/api/invoices",
  "/api/expenses",
  "/api/documents",
];

self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] Caching static assets");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error("[SW] Error caching static assets:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE &&
            cacheName !== DYNAMIC_CACHE &&
            cacheName !== API_CACHE
          ) {
            console.log("[SW] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar protocolos no HTTP
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Estrategia Network First para APIs de escritura
  if (url.pathname.startsWith("/api/") && request.method !== "GET") {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: "Offline - cambios pendientes de sincronización" }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }

  // Estrategia Cache First con Network Fallback para APIs de lectura
  if (url.pathname.startsWith("/api/")) {
    const isCacheable = CACHEABLE_API_ROUTES.some((route) =>
      url.pathname.startsWith(route)
    );

    if (isCacheable) {
      event.respondWith(
        caches.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((response) => {
              const responseClone = response.clone();
              caches.open(API_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
              return response;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        })
      );
      return;
    }

    // APIs no cacheables: Network only con fallback offline
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ error: "Offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      })
    );
    return;
  }

  // Estrategia Cache First para páginas y assets estáticos
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === "error") {
            return response;
          }

          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(() => {
          // Si es navegación, mostrar página offline
          if (request.mode === "navigate") {
            return caches.match("/offline");
          }
          return new Response("Offline", { status: 503 });
        });
    })
  );
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "Verifactu Business";
  const options = {
    body: data.body || "Nueva notificación",
    icon: "/android-chrome-192x192.png",
    badge: "/favicon-48x48.png",
    tag: data.tag || "default",
    data: data.url || "/dashboard",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data || "/dashboard"));
});
