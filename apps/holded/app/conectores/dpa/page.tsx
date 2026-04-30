import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Holded | DPA de conectores',
  description: 'Centro DPA para los conectores Holded publicados por Verifactu Business.',
  alternates: { canonical: '/conectores/dpa' },
};

export default function HoldedConnectorsDpaPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-16 text-slate-900 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          DPA de conectores Holded
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          Cada conector mantiene su anexo DPA especifico. Selecciona la plataforma para revisar el
          documento aplicable.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
          La separacion por conector evita extender compromisos legales de una plataforma a otra
          cuando el alcance tecnico y publico no es identico.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Link
            href="/conectores/chatgpt/dpa"
            className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm hover:bg-slate-50"
          >
            <h2 className="text-xl font-semibold text-slate-950">DPA ChatGPT</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Anexo de tratamiento para el conector Holded en ChatGPT.
            </p>
          </Link>
          <Link
            href="/conectores/claude/dpa"
            className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm hover:bg-slate-50"
          >
            <h2 className="text-xl font-semibold text-slate-950">DPA Claude</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Anexo de tratamiento para el conector Holded en Claude.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
