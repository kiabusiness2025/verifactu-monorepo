'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { LifeBuoy, MessageSquareText, RefreshCcw, Sparkles } from 'lucide-react';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function IsaakErrorPage({ error, reset }: Props) {
  useEffect(() => {
    console.error('Isaak app error boundary', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff8f3_0%,#fffdf8_38%,#ffffff_72%)] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-[2rem] border border-[#2361d8]/15 bg-white shadow-[0_32px_90px_-48px_rgba(35,97,216,0.35)]">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-8 sm:p-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                <Sparkles className="h-3.5 w-3.5" />
                Seguimos contigo
              </div>
              <h1 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Isaak no ha podido abrir esta pantalla, pero tu acceso sigue a salvo
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                Puede ser una incidencia temporal del servidor o un paso a medias entre Holded e
                Isaak. Reintenta y deberias poder continuar sin perder tu contexto.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f55c0]"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reintentar ahora
                </button>
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Volver al chat
                </Link>
                <Link
                  href="/support?source=isaak_error"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <MessageSquareText className="h-4 w-4" />
                  Abrir soporte
                </Link>
              </div>
            </div>

            <aside className="border-t border-slate-200 bg-slate-50 p-8 lg:border-l lg:border-t-0">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <LifeBuoy className="h-4 w-4 text-[#2361d8]" />
                  Que puedes hacer ahora
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <li>1. Pulsa reintentar. Muchas incidencias se resuelven en segundos.</li>
                  <li>2. Si estabas entrando desde Holded, repite el ultimo paso del acceso.</li>
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
