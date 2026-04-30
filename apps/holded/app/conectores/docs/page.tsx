import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Holded | Documentacion de conectores',
  description:
    'Punto de entrada a la documentacion publica de los conectores Holded para ChatGPT y Claude.',
  alternates: { canonical: '/conectores/docs' },
};

export default function HoldedConnectorsDocsPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-16 text-slate-900 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          Documentacion de conectores Holded
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          Cada conector mantiene su propia documentacion y flujo de conexion. Usa el acceso
          correspondiente a la plataforma que quieras revisar.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
          Verifactu Business publica estas guias como integracion independiente sobre API de Holded.
          No somos Holded, OpenAI ni Anthropic.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Link
            href="/conectores/chatgpt/docs"
            className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm hover:bg-slate-50"
          >
            <h2 className="text-xl font-semibold text-slate-950">Docs ChatGPT</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Configuracion, alcance publico, demo y flujo revisado para ChatGPT.
            </p>
          </Link>
          <Link
            href="/conectores/claude/docs"
            className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm hover:bg-slate-50"
          >
            <h2 className="text-xl font-semibold text-slate-950">Docs Claude</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Configuracion, alcance, politicas y flujo publico del conector para Claude.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
