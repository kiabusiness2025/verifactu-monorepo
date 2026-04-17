'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { LifeBuoy, MessageSquareText, RefreshCcw, Sparkles } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const monitorEnabled = process.env.NEXT_PUBLIC_MONITOR_ENABLED === 'true';
    const monitorToken = process.env.NEXT_PUBLIC_MONITOR_TOKEN;
    if (!monitorEnabled && !monitorToken) return;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (monitorToken) {
      headers['x-monitor-token'] = monitorToken;
    }

    fetch('/api/monitor/error', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        errors: [
          {
            type: 'runtime_error',
            details: {
              message: error.message,
              stack: error.stack,
              digest: error.digest,
            },
            url: window.location.href,
            timestamp: new Date().toISOString(),
          },
        ],
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      }),
    }).catch(console.error);
  }, [error]);

  return (
    <main className="min-h-[calc(100vh-9rem)] bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_48%,#ffffff_100%)] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl animate-fade-in">
        <section className="overflow-hidden rounded-[2rem] border border-[#ff5460]/15 bg-white shadow-[0_32px_90px_-48px_rgba(255,84,96,0.35)]">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-8 sm:p-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
                <Sparkles className="h-3.5 w-3.5" />
                Seguimos contigo
              </div>
              <h1 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Algo no ha salido como esperábamos, pero tu acceso y tus datos siguen a salvo
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                A veces una pantalla se rompe por una incidencia temporal del servidor o por una
                redirección a medias. Normalmente basta con reintentar y seguir.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reintentar ahora
                </button>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ir al dashboard
                </Link>
                <Link
                  href="/dashboard/integrations/holded"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Revisar conexión
                </Link>
                <Link
                  href={`mailto:soporte@verifactu.business?subject=Error${error.digest ? `%20(${encodeURIComponent(error.digest)})` : ''}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <MessageSquareText className="h-4 w-4" />
                  Contactar soporte
                </Link>
              </div>
            </div>

            <aside className="border-t border-slate-200 bg-slate-50 p-8 lg:border-l lg:border-t-0">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <LifeBuoy className="h-4 w-4 text-[#ff5460]" />
                  Qué puedes hacer ahora
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <li>1. Pulsa reintentar. Muchas incidencias se resuelven en segundos.</li>
                  <li>
                    2. Si estabas conectando Holded, revisa la conexión y repite el último paso.
                  </li>
                  <li>3. Si el problema persiste, escríbenos a soporte@verifactu.business.</li>
                </ul>
                {error.digest ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    Código de referencia:{' '}
                    <span className="font-mono text-slate-700">{error.digest}</span>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
