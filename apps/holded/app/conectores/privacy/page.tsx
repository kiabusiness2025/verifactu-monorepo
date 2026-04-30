import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Holded | Privacidad de conectores',
  description: 'Centro de privacidad para los conectores Holded publicados por Verifactu Business.',
  alternates: { canonical: '/conectores/privacy' },
};

export default function HoldedConnectorsPrivacyPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-16 text-slate-900 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          Privacidad de conectores Holded
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          Los conectores publicos mantienen paginas de privacidad separadas por plataforma para
          describir tratamiento de datos, alcance y responsabilidades.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
          Las politicas se publican por conector para evitar mezclar alcance publico, proveedores y
          responsabilidades entre plataformas distintas.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Link
            href="/conectores/chatgpt/privacy"
            className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm hover:bg-slate-50"
          >
            <h2 className="text-xl font-semibold text-slate-950">Privacidad ChatGPT</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Politica aplicada al conector Holded para ChatGPT.
            </p>
          </Link>
          <Link
            href="/conectores/claude/privacy"
            className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm hover:bg-slate-50"
          >
            <h2 className="text-xl font-semibold text-slate-950">Privacidad Claude</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Politica aplicada al conector Holded para Claude.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
