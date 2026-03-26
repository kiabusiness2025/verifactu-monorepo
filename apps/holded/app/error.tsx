'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { LifeBuoy, MessageSquareText, RefreshCcw, Sparkles } from 'lucide-react';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function HoldedErrorPage({ error, reset }: Props) {
  useEffect(() => {
    console.error('Holded app error boundary', error);
  }, [error]);

  return (
    <main className="min-h-[calc(100vh-9rem)] bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_48%,#ffffff_100%)] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-[2rem] border border-[#ff5460]/15 bg-white shadow-[0_32px_90px_-48px_rgba(255,84,96,0.35)]">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-8 sm:p-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
                <Sparkles className="h-3.5 w-3.5" />
                Seguimos contigo
              </div>
              <h1 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Algo no ha salido como esperabamos, pero tu acceso y tus datos siguen a salvo
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                A veces una pantalla se rompe por una incidencia temporal del servidor o por una
                redireccion a medias. Normalmente basta con reintentar y seguir.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
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
                  href="/onboarding/holded"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Revisar conexion
                </Link>
                <Link
                  href={`/support?source=holded_error${error.digest ? `&digest=${encodeURIComponent(error.digest)}` : ''}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <MessageSquareText className="h-4 w-4" />
                  Abrir soporte guiado
                </Link>
              </div>
            </div>

            <aside className="border-t border-slate-200 bg-slate-50 p-8 lg:border-l lg:border-t-0">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <LifeBuoy className="h-4 w-4 text-[#ff5460]" />
                  Que puedes hacer ahora
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <li>1. Pulsa reintentar. Muchas incidencias se resuelven en segundos.</li>
                  <li>
                    2. Si estabas conectando Holded, vuelve a onboarding y repite el ultimo paso.
                  </li>
                  <li>3. Si el problema persiste, escribenos a soporte@verifactu.business.</li>
                </ul>
                {error.digest ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    Codigo de referencia:{' '}
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
