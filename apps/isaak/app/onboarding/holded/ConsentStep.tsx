'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function ConsentStep({ holdedAuthUrl }: { holdedAuthUrl: string }) {
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleConnect() {
    if (!consented || submitting) return;
    setSubmitting(true);
    try {
      await fetch('/api/holded/consent', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Non-blocking — consent write failure should not block the connection
    }
    window.location.href = holdedAuthUrl;
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Consent checkbox */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-[#2361d8]/40 hover:shadow-sm">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#2361d8]"
        />
        <span className="text-xs leading-5 text-slate-600">
          <span className="font-semibold text-slate-800">
            Autorizo a Isaak a acceder a mis datos de Holded
          </span>{' '}
          — facturas, contactos y cuentas — para proporcionar asesoramiento fiscal y contable
          personalizado. Puedo revocar este acceso en cualquier momento desde{' '}
          <Link href="/settings/connections" className="text-[#2361d8] underline">
            Ajustes
          </Link>
          .{' '}
          <Link href="/legal/privacy" className="text-[#2361d8] underline" target="_blank">
            Política de privacidad
          </Link>
          .
        </span>
      </label>

      {!consented && (
        <p className="text-[11px] text-slate-400">
          Debes aceptar el consentimiento para continuar.
        </p>
      )}

      {/* Primary CTA */}
      <button
        type="button"
        onClick={() => void handleConnect()}
        disabled={!consented || submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Guardando…
          </>
        ) : (
          <>
            Conectar Holded ahora
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}
