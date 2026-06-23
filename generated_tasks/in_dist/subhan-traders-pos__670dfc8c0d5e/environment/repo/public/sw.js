// Service Worker for Cycle Business POS - Production Offline Support
// Version: 3.0.0 - Optimized for Next.js Production Builds

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `cycle-pos-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `cycle-pos-runtime-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

// Assets to pre-cache (minimal - only critical fallback)
const PRECACHE_ASSETS = [
  OFFLINE_PAGE,
];

// Check if request is for static assets (immutable, content-hashed)
function isImmutableAsset(url) {
  const pathname = new URL(url).pathname;
  // Next.js static assets are content-hashed and immutable
  return pathname.startsWith('/_next/static/');
}

// Check if request is for static resources
function isStaticResource(url) {
  const pathname = new URL(url).pathname;
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.ttf') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.webp')
  );
}

// Check if request is for API
function isApiRequest(url) {
  return new URL(url).pathname.startsWith('/api/');
}

// Install event - minimal pre-caching, just offline fallback
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v3...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      console.log('[SW] Pre-caching offline fallback');
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
          console.log('[SW] Cached:', asset);
        } catch (error) {
          console.warn('[SW] Failed to cache:', asset, error);
        }
      }
    })
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v3...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete old version caches
            return (
              name.startsWith('cycle-pos-') &&
              name !== STATIC_CACHE &&
              name !== RUNTIME_CACHE
            );
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - runtime caching with proper strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip API routes - handled by IndexedDB offline service
  if (isApiRequest(url.href)) return;

  // Skip HMR/dev-only paths
  if (url.pathname.includes('_next/webpack-hmr')) return;
  if (url.pathname.includes('__nextjs')) return;
  if (url.pathname.includes('_next/mcp')) return;

  // Handle Next.js RSC requests
  const isRsc = url.searchParams.has('_rsc') || request.headers.get('RSC') === '1';

  // Strategy: Cache-First for immutable static assets
  if (isImmutableAsset(url.href)) {
    event.respondWith(cacheFirstImmutable(request));
    return;
  }

  // Strategy: Cache-First for other static resources
  if (isStaticResource(url.href)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Strategy: Network-First with Offline Fallback for navigation and RSC
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html') || isRsc) {
    event.respondWith(networkFirstWithCache(request, isRsc));
    return;
  }

  // Default: Network-First for other requests
  event.respondWith(networkFirst(request));
});

// Cache-First for immutable assets (Next.js static chunks)
// These are content-hashed and never change
async function cacheFirstImmutable(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache immutable assets in static cache
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Failed to fetch immutable asset:', request.url);
    return new Response('Asset unavailable offline', { status: 503 });
  }
}

// Cache-First for static resources
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Cache-first fetch failed:', request.url);
    return new Response('Asset unavailable offline', { status: 503 });
  }
}

// Network-First for dynamic content
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] Serving from cache:', request.url);
      return cached;
    }
    return new Response('Offline', { status: 503 });
  }
}

// Network-First with cache and offline fallback for navigation
async function networkFirstWithCache(request, isRsc = false) {
  const url = new URL(request.url);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache successful navigation responses
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed for navigation/RSC:', url.pathname);
    
    // Try exact URL match from cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // For RSC, we can attempt to match the pathname ignoring search, 
    // but ONLY if the cached response is an RSC payload.
    // If not found, return 503 so Next.js handles the offline correctly.
    if (isRsc) {
      const rscCached = await caches.match(request, { ignoreSearch: true });
      if (rscCached && rscCached.headers.get('content-type')?.includes('text/x-component')) {
        return rscCached;
      }
      return new Response('Offline', { status: 503 });
    }

    // Try pathname only match (without query params)
    const pathCached = await caches.match(url.pathname);
    if (pathCached) {
      console.log('[SW] Serving cached path:', url.pathname);
      return pathCached;
    }

    // Check if we have the app shell cached (any dashboard page)
    // This allows us to serve a cached page that can then load data from IndexedDB
    const allCaches = await caches.keys();
    for (const cacheName of allCaches) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      for (const key of keys) {
        const keyUrl = new URL(key.url);
        // If we have any cached HTML page, use it as fallback
        if (keyUrl.pathname !== '/offline.html' && 
            !keyUrl.pathname.startsWith('/_next/') &&
            !keyUrl.pathname.startsWith('/api/') &&
            !keyUrl.pathname.includes('.')) {
          const response = await cache.match(key);
          if (response && response.headers.get('content-type')?.includes('text/html')) {
            console.log('[SW] Serving cached app shell:', keyUrl.pathname);
            return response;
          }
        }
      }
    }

    // Last resort: serve offline fallback page
    console.log('[SW] Serving offline fallback for:', url.pathname);
    const offlinePage = await caches.match(OFFLINE_PAGE);
    if (offlinePage) {
      return offlinePage;
    }

    // If nothing works, return inline offline response
    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <title>Offline</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a0a0a;color:#fff">
  <div style="text-align:center">
    <h1>Offline</h1>
    <p>Please check your internet connection and visit the app while online first.</p>
    <button onclick="location.reload()" style="padding:12px 24px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;margin-top:16px">Retry</button>
  </div>
</body>
</html>`,
      {
        status: 503,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Cache current page and its assets
  if (event.data?.type === 'CACHE_PAGE') {
    const pageUrl = event.data.url;
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(RUNTIME_CACHE);
          const response = await fetch(pageUrl);
          if (response.ok) {
            await cache.put(pageUrl, response);
            console.log('[SW] Cached page:', pageUrl);
          }
        } catch (error) {
          console.warn('[SW] Failed to cache page:', pageUrl);
        }
      })()
    );
  }

  // Warm cache with essential pages
  if (event.data?.type === 'WARM_CACHE') {
    const pages = event.data.pages || [];
    event.waitUntil(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        for (const page of pages) {
          try {
            const response = await fetch(page);
            if (response.ok) {
              await cache.put(page, response);
              console.log('[SW] Warmed cache:', page);
            }
          } catch (error) {
            console.warn('[SW] Failed to warm cache:', page);
          }
        }
      })()
    );
  }
});

// Listen for sync events (for background sync)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
  if (event.tag === 'sync-orders') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_ORDERS' });
        });
      })
    );
  }
});

// Listen for push notifications (future feature)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
});
