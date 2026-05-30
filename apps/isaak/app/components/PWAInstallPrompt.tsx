'use client';

// V1.4.4 — Banner de instalación PWA para isaak.chat.
//
// Detecta la oportunidad de instalación (beforeinstallprompt) en Chrome,
// Edge y Android. En iOS Safari (que no soporta el prompt nativo) muestra
// instrucciones manuales tras 8 segundos en la app.
//
// El banner aparece como pill discreta abajo a la izquierda en desktop y
// como toast pegado al bottom en móvil. Dismiss persistente en
// localStorage por 30 días — se vuelve a sugerir pasado ese tiempo.

import { useEffect, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'isaak-pwa-dismissed-until';
const DISMISS_DAYS = 30;
const APPEAR_DELAY_MS_PROMPT = 4000;
const APPEAR_DELAY_MS_IOS = 8000;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  const until = window.localStorage.getItem(DISMISS_KEY);
  if (!until) return false;
  const ts = Number(until);
  if (!Number.isFinite(ts)) return false;
  return Date.now() < ts;
}

function markDismissed() {
  if (typeof window === 'undefined') return;
  const until = Date.now() + DISMISS_DAYS * 86_400_000;
  window.localStorage.setItem(DISMISS_KEY, String(until));
}

export default function PWAInstallPrompt() {
  const [mode, setMode] = useState<'hidden' | 'prompt' | 'ios'>('hidden');
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) return; // ya instalada
    if (isDismissed()) return;

    let timeoutId: number | undefined;

    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      timeoutId = window.setTimeout(() => setMode('prompt'), APPEAR_DELAY_MS_PROMPT);
    };

    window.addEventListener('beforeinstallprompt', onBefore);

    // iOS Safari: no dispara beforeinstallprompt. Activamos modo IOS tras
    // un retraso mayor para no molestar inmediatamente al entrar.
    if (isIosSafari()) {
      timeoutId = window.setTimeout(() => setMode('ios'), APPEAR_DELAY_MS_IOS);
    }

    const onInstalled = () => {
      setMode('hidden');
      setDeferred(null);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore);
      window.removeEventListener('appinstalled', onInstalled);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'dismissed') markDismissed();
    } catch {
      /* ignore */
    } finally {
      setDeferred(null);
      setMode('hidden');
    }
  };

  const handleDismiss = () => {
    markDismissed();
    setMode('hidden');
  };

  if (mode === 'hidden') return null;

  // ── Pill flotante con prompt nativo ────────────────────────────────
  if (mode === 'prompt') {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-sm animate-in slide-in-from-bottom-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)] sm:left-4 sm:right-auto">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-start gap-3 pr-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#2361d8] text-white">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Instalar Isaak</p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              Accede más rápido desde tu pantalla de inicio. Sin tienda de apps,
              cero permisos extra.
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="flex-1 rounded-lg bg-[#2361d8] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1f55c0]"
          >
            Instalar
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Más tarde
          </button>
        </div>
      </div>
    );
  }

  // ── Instrucciones manuales iOS Safari ─────────────────────────────
  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-sm animate-in slide-in-from-bottom-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)]">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label="Cerrar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3 pr-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#2361d8] text-white">
          <Share2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Añade Isaak a tu pantalla</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Pulsa{' '}
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
              <Share2 className="h-3 w-3" />
              Compartir
            </span>{' '}
            en Safari y luego <strong>"Añadir a pantalla de inicio"</strong>. Así
            Isaak abre como app, sin barras del navegador.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="mt-3 w-full rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
      >
        Entendido
      </button>
    </div>
  );
}
