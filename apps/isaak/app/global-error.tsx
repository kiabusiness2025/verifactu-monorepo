'use client';

import Link from 'next/link';
import { RefreshCcw, ShieldCheck } from 'lucide-react';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function IsaakGlobalError({ error, reset }: Props) {
  return (
    <html lang="es">
      <body className="bg-[radial-gradient(circle_at_top,#fff8f3_0%,#fffdf8_38%,#ffffff_72%)] text-slate-900">
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
          <section className="w-full max-w-3xl rounded-[2rem] border border-[#2361d8]/15 bg-white p-8 shadow-[0_32px_90px_-48px_rgba(35,97,216,0.35)] sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Incidencia temporal
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Isaak necesita un nuevo intento
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              No has roto nada. Hemos parado esta pantalla para evitar que sigas con un estado
              inconsistente. Reintenta y deberias poder continuar.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f55c0]"
              >
                <RefreshCcw className="h-4 w-4" />
                Reintentar
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Volver al inicio
              </Link>
            </div>
            {error.digest ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Codigo de referencia:{' '}
                <span className="font-mono text-slate-700">{error.digest}</span>
              </div>
            ) : null}
          </section>
        </main>
      </body>
    </html>
  );
}
