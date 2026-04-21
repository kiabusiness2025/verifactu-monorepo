import { ArrowRight, Play } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildRegisterUrl } from '../lib/holded-navigation';
import DemoVideoGrid, { type DemoClip } from './DemoVideoGrid';

export const metadata: Metadata = {
  title: 'Demo del conector | Holded',
  description:
    'Ve como funciona el conector Holded en accion: consulta de facturas, contactos, contabilidad y proyectos directamente desde el chat.',
};

const heroClip: DemoClip = {
  id: 'overview',
  slug: 'holded-overview',
  label: 'Vision general',
  title: 'El conector en accion',
  description:
    'Consulta de facturas, entendimiento contable y gestion de proyectos directamente desde el chat. Sin menus, sin tecnicismos.',
};

const useCaseClips: DemoClip[] = [
  {
    id: 'facturas',
    slug: 'holded-facturas',
    label: 'Facturas',
    title: 'Que facturas revisar hoy',
    description:
      'El conector prioriza las facturas con mas riesgo de cobro y las explica en lenguaje claro.',
  },
  {
    id: 'contactos',
    slug: 'holded-contactos',
    label: 'Contactos',
    title: 'Clientes con riesgo de cobro',
    description:
      'Cruza clientes y estado de facturas para decidir a quien llamar primero sin salir del chat.',
  },
  {
    id: 'contabilidad',
    slug: 'holded-contabilidad',
    label: 'Contabilidad',
    title: 'El diario en lenguaje normal',
    description:
      'Los asientos y movimientos contables traducidos a frases que cualquier gestor entiende.',
  },
  {
    id: 'proyectos',
    slug: 'holded-proyectos',
    label: 'Proyectos',
    title: 'Estado y prioridades del equipo',
    description:
      'Resumen de proyectos activos, cargas de trabajo y bloqueos sin abrir otra herramienta.',
  },
];

export default function HoldedDemoPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_40%,#ffffff_100%)] text-slate-900">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#ff5460]">
          <Play className="h-3.5 w-3.5" />
          Demo del conector
        </div>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-[3rem] sm:leading-[1.06]">
          Ve como funciona antes de conectar
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
          Facturas, contactos, contabilidad y proyectos de Holded explicados en lenguaje claro,
          directamente desde el chat. Gratis para siempre para usuarios de ChatGPT.
        </p>
      </section>

      <DemoVideoGrid heroClip={heroClip} useCaseClips={useCaseClips} />

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-[2rem] border border-[#ff5460]/15 bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_100%)] px-8 py-10 shadow-[0_32px_90px_-48px_rgba(255,84,96,0.3)] sm:px-10">
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">
            Listo para probarlo con tus datos reales
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Conecta tu cuenta de Holded en menos de un minuto. Pega tu API key, validamos la
            conexion al momento y entras directamente al panel.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={buildRegisterUrl('holded_demo_cta')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#ef4654] hover:shadow-xl"
            >
              Conectar Holded ahora
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/capacidades"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Ver capacidades completas
            </Link>
          </div>
          <p className="mt-5 text-xs text-slate-500">
            Gratis para siempre para usuarios de ChatGPT. Operado por Verifactu Business, Holded
            Solution Partner.
          </p>
        </div>
      </section>
    </main>
  );
}
