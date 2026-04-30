import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Isaak | Asesorias',
  description:
    'Isaak ayuda a asesorias a preparar resumentes, alertas y proximos pasos sobre clientes que trabajan con Excel, Holded y documentacion dispersa.',
};

export default function IsaakAdvisorPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-16 text-slate-900 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="inline-flex rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
          Asesorias
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
          Ayuda a tus clientes a llegar mas ordenados al cierre fiscal.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          Isaak ayuda a convertir datos dispersos en resumentes, alertas y proximos pasos para la
          asesoria. Trabaja con clientes que operan con Excel, con Holded o con documentacion
          dispersa.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/support"
            className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
          >
            Solicitar piloto para asesorias
          </Link>
          <Link
            href="/support"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Quiero probar con mis clientes
          </Link>
        </div>
      </div>
    </main>
  );
}
