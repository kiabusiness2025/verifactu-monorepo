'use client';

// V1.8.4 — Tracking automático de visitas con ?ref= en la URL.
//
// Lee el query param 'ref' una sola vez por sesión (sessionStorage)
// y dispara POST fire-and-forget al endpoint de tracking. Si el
// usuario navega entre páginas, NO duplicamos la cuenta.

import { useEffect } from 'react';

const STORAGE_KEY = 'isaak-ref-tracked';
const REF_REGEX = /^[a-z0-9-]{2,40}$/;

export default function ReferralTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (!ref) return;
      const normalized = ref.trim().toLowerCase();
      if (!REF_REGEX.test(normalized)) return;
      // Evita doble conteo en la misma sesión.
      const key = `${STORAGE_KEY}:${normalized}`;
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, '1');
      // Fire-and-forget — no esperamos respuesta.
      void fetch('/api/track/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: normalized, path: window.location.pathname }),
        keepalive: true,
      }).catch(() => {
        /* fail-silent */
      });
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
