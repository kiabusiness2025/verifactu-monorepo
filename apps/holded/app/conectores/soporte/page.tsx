import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Holded | Soporte de conectores',
  description: 'Punto de entrada al soporte de los conectores Holded para ChatGPT y Claude.',
  alternates: { canonical: '/conectores/soporte' },
};

export default function HoldedConnectorsSupportPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-16 text-slate-900 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          Soporte de conectores Holded
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          Cada conector mantiene su propio formulario autenticado de soporte para conservar contexto
          y tenant cuando corresponde.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
          El soporte se separa por conector para conservar mejor el contexto tecnico y no mezclar
          incidencias de plataformas distintas.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Link
            href="/conectores/claude/soporte"
            className="relative rounded-[1.5rem] border border-amber-300 bg-white p-6 shadow-sm ring-1 ring-amber-200 transition hover:bg-amber-50/40"
          >
            <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-amber-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
              Disponible
            </span>
            <h2 className="text-xl font-semibold text-slate-950">Soporte Claude</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Incidencias, dudas y seguimiento del conector Holded para Claude. Conexion directa
              operativa.
            </p>
          </Link>
          <Link
            href="/conectores/chatgpt/soporte"
            className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:bg-slate-50"
          >
            <h2 className="text-xl font-semibold text-slate-950">Soporte ChatGPT</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Incidencias, dudas y seguimiento del conector Holded para ChatGPT.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
