import Link from 'next/link';
import type { NextPageContext } from 'next';

type ErrorPageProps = {
  statusCode: number;
};

function getTitle(statusCode: number) {
  if (statusCode === 404) return 'Ruta no encontrada';
  if (statusCode >= 500) return 'Incidencia temporal';
  return 'Respuesta no disponible';
}

function getMessage(statusCode: number) {
  if (statusCode === 404) {
    return 'La ruta solicitada ya no forma parte del panel operativo.';
  }

  if (statusCode >= 500) {
    return 'La incidencia se ha aislado para no dejar el panel en un estado incoherente.';
  }

  return 'No hemos podido completar esta vista con la respuesta esperada.';
}

export default function AdminLegacyErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
            {getTitle(statusCode)}
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Codigo {statusCode}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            {getMessage(statusCode)}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/panel"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Volver al panel
            </Link>
            <Link
              href="/users"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ver usuarios
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

AdminLegacyErrorPage.getInitialProps = ({ res, err }: NextPageContext): ErrorPageProps => {
  const statusCode =
    res?.statusCode ?? (err as { statusCode?: number } | undefined)?.statusCode ?? 500;
  return { statusCode };
};
