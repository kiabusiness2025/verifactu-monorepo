import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Isaak | Modo Excel',
  description:
    'Empieza con Excel, documentos y exportaciones antes de conectar todos tus sistemas. Isaak puede ordenar informacion in-house sin exigir ERP profundo desde el primer dia.',
};

export default function IsaakExcelModePage() {
  return (
    <main className="min-h-screen bg-white px-4 py-16 text-slate-900 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="inline-flex rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
          Modo Excel / in-house
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
          Trabaja con Excel, documentos y exportaciones sin migrar todo tu negocio.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          Para empresas que todavia trabajan con Excel, documentos y exportaciones. Sube o conecta
          tus archivos, revisa datos, detecta faltantes y genera resumentes accionables.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Que permite</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <li>Subir o importar Excel y exportaciones.</li>
              <li>Revisar estructura y detectar faltantes.</li>
              <li>Preparar resumen fiscal y operativo.</li>
              <li>Cruzar facturas, gastos y evidencias.</li>
              <li>Preparar la futura conexion con otras herramientas.</li>
            </ul>
          </article>
          <article className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Para quien encaja</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <li>Autonomos.</li>
              <li>Microempresas.</li>
              <li>Pymes con informacion dispersa.</li>
              <li>Asesorias con clientes todavia no integrados.</li>
            </ul>
          </article>
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth"
            className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
          >
            Empezar con Excel
          </Link>
          <Link
            href="/support"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Solicitar demo
          </Link>
        </div>
      </div>
    </main>
  );
}
