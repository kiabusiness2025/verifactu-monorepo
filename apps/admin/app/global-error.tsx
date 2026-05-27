'use client';

import Link from 'next/link';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminGlobalError({ error, reset }: ErrorPageProps) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900">
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
          <section className="w-full max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              Incidencia temporal
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Verifactu Admin necesita reiniciarse
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              El error se ha aislado para proteger la sesion y el estado del panel. Puedes
              reintentar o volver al panel principal.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Reintentar
              </button>
              <Link
                href="/panel"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Volver al panel
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
