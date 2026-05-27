import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Isaak | Conectores y modo conectado',
  description:
    'Modo conectado para trabajar con tu ERP, bancos, CRM y herramientas empresariales sin convertir a Isaak en un ERP ni en un plugin aislado.',
};

export default function IsaakConnectorsPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-16 text-slate-900 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="inline-flex rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
          Modo conectado / API
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
          Conecta herramientas empresariales sin convertir a Isaak en otro ERP.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          Isaak conecta ERPs, bancos (Enable Banking, Salt Edge), Google, Microsoft 365, WhatsApp y
          la AEAT. Holded es uno de los conectores. Isaak usa conectores para interpretar y operar
          sobre informacion existente con permisos y trazabilidad.
        </p>
        <a
          href="https://holded.verifactu.business/conectores"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
        >
          Ver catalogo de conectores
        </a>
      </div>
    </main>
  );
}
