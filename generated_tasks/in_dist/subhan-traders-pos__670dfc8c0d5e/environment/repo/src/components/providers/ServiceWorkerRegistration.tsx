'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Critical pages to warm cache for offline use
const CRITICAL_PAGES = [
  '/dashboard',
  '/pos',
  '/orders',
  '/customers',
  '/inventory/products',
];

export function SWRegistration() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('✅ Service Worker registered:', registration.scope);

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 New service worker available');
                  // Skip waiting for immediate activation
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });

          // Warm cache with critical pages after SW is ready
          if (navigator.serviceWorker.controller) {
            warmCache();
          } else {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              warmCache();
            });
          }
        } catch (error) {
          console.error('❌ Service Worker registration failed:', error);
        }
      });

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Service Worker controller changed');
      });
    }
  }, []);

  // Cache current page when navigating
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.serviceWorker?.controller) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        navigator.serviceWorker.controller?.postMessage({
          type: 'CACHE_PAGE',
          url: window.location.href,
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return null;
}

// Warm cache with critical pages
async function warmCache() {
  if (!navigator.serviceWorker?.controller) return;

  console.log('🔥 Warming cache with critical pages...');
  navigator.serviceWorker.controller.postMessage({
    type: 'WARM_CACHE',
    pages: CRITICAL_PAGES,
  });
}
