'use client';

import { useEffect } from 'react';

const HOLDED_PWA_RESET_KEY = 'holded-pwa-reset-v1';

type PWARegistrationProps = {
  disabled?: boolean;
};

async function clearVerifactuCaches() {
  if (typeof caches === 'undefined') {
    return;
  }

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.startsWith('verifactu-'))
      .map((cacheName) => caches.delete(cacheName))
  );
}

export function PWARegistration({ disabled = false }: PWARegistrationProps) {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return;
    }

    if (disabled) {
      let cancelled = false;

      void (async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
        await clearVerifactuCaches();

        if (cancelled) {
          return;
        }

        if (
          navigator.serviceWorker.controller &&
          window.sessionStorage.getItem(HOLDED_PWA_RESET_KEY) !== '1'
        ) {
          window.sessionStorage.setItem(HOLDED_PWA_RESET_KEY, '1');
          window.location.reload();
          return;
        }

        if (!navigator.serviceWorker.controller) {
          window.sessionStorage.removeItem(HOLDED_PWA_RESET_KEY);
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    const handleOnline = () => {
      console.log('[PWA] Back online');
    };
    const handleOffline = () => {
      console.log('[PWA] Gone offline');
    };

    let updateTimer: number | null = null;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration);
        updateTimer = window.setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        );
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error);
      });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (updateTimer !== null) {
        window.clearInterval(updateTimer);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [disabled]);

  return null;
}
