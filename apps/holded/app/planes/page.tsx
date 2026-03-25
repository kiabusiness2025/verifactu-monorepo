import { ArrowRight, Clock3 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildRegisterUrl } from '../lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Coming soon | Isaak para Holded',
  description:
    'La experiencia actual de Holded se centra en el acceso gratuito. Las opciones avanzadas llegaran mas adelante.',
};

export default function HoldedPlansPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_42%,#ffffff_100%)] px-4 py-16 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_32px_90px_-48px_rgba(255,84,96,0.35)] sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#ff5460]">
          <Clock3 className="h-3.5 w-3.5" />
          Coming soon
        </div>

        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950">
          La experiencia publica se centra ahora en la version gratuita.
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Si quieres probar Isaak con Holded hoy, entra por el flujo gratuito: alta, verificacion,
          conexion de API key y dashboard. Las opciones premium quedaran preparadas para una fase
          posterior, pero no forman parte del onboarding actual.
        </p>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
          Lo que ya esta activo:
          <ul className="mt-3 space-y-2">
            <li>- alta con correo</li>
            <li>- verificacion del acceso</li>
            <li>- conexion de Holded con validacion inmediata</li>
            <li>- entrada directa al dashboard y primer chat</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={buildRegisterUrl('holded_plans_coming_soon')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#ef4654]"
          >
            Empezar gratis
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Volver a la landing
          </Link>
        </div>
      </div>
    </main>
  );
}
