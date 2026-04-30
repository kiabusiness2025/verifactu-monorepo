import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Holded | Hub de conectores',
  description:
    'Hub vertical de conectores para Holded dentro de Verifactu Business. Documentacion, privacidad, DPA y soporte para ChatGPT y Claude.',
  alternates: { canonical: '/conectores' },
};

const connectors = [
  {
    title: 'Conector Holded para ChatGPT',
    body: 'Consulta documentacion, privacidad, DPA, demo y soporte del conector para ChatGPT.',
    href: '/conectores/chatgpt',
  },
  {
    title: 'Conector Holded para Claude',
    body: 'Consulta documentacion, privacidad, DPA y soporte del conector para Claude.',
    href: '/conectores/claude',
  },
];

const shortcuts = [
  { label: 'Docs', href: '/conectores/docs' },
  { label: 'Privacidad', href: '/conectores/privacy' },
  { label: 'DPA', href: '/conectores/dpa' },
  { label: 'Soporte', href: '/conectores/soporte' },
];

export default function HoldedConnectorsHubPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-16 text-slate-900 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="inline-flex rounded-full border border-[#ff5460]/15 bg-[#ff5460]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
          Hub vertical de conectores
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          Holded es el primer ecosistema conectado dentro de Verifactu Business.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          Este dominio agrupa los conectores, la documentacion y los flujos publicos minimos de
          Holded. Isaak sigue siendo el producto orquestador principal en un dominio separado.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
          Integracion independiente sobre API de Holded. No somos Holded, OpenAI ni Anthropic.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {connectors.map((item) => (
            <article
              key={item.href}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-slate-950">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
              <Link
                href={item.href}
                className="mt-5 inline-flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Abrir conector
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-950">Accesos rapidos</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {shortcuts.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            Cada conector mantiene su propio alcance publico, su propia documentacion y sus propias
            paginas legales.
          </p>
        </div>
      </div>
    </main>
  );
}
