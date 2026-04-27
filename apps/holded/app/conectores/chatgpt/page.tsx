import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileText,
  KeyRound,
  LockKeyhole,
  MessageSquareText,
  PlugZap,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { DemoIframeHero } from '@/app/components/DemoIframeHero';

export const metadata: Metadata = {
  title: 'Plugin Holded para ChatGPT | Verifactu Business',
  description:
    'Conecta tu cuenta de Holded con ChatGPT mediante OAuth. Consulta facturacion, clientes, contabilidad y proyectos directamente desde el chat de OpenAI.',
  alternates: {
    canonical: '/conectores/chatgpt',
  },
};

type Capability = {
  title: string;
  body: string;
  icon: LucideIcon;
  items: string[];
};

const capabilities: Capability[] = [
  {
    title: 'Facturacion y cobros',
    body: 'Lista facturas emitidas, consulta importes pendientes y crea borradores revisables sin modificar datos reales.',
    icon: Receipt,
    items: ['Facturas emitidas', 'Estados de cobro', 'Borradores revisables'],
  },
  {
    title: 'Contabilidad comprensible',
    body: 'Transforma diario, cuentas, PyG y balances en respuestas comprensibles para tomar decisiones.',
    icon: BookOpen,
    items: ['Diario contable', 'Balance', 'Cuenta de resultados'],
  },
  {
    title: 'Clientes y oportunidades',
    body: 'Cruza clientes, contactos, embudos de venta y facturacion para saber que revisar primero.',
    icon: Users,
    items: ['Contactos', 'CRM y leads', 'Seguimiento comercial'],
  },
  {
    title: 'Informes y contexto',
    body: 'Genera resumenes, comparativas y analisis con los datos de Holded, listo para exportar o compartir.',
    icon: BarChart3,
    items: ['Comparativas de ventas', 'Informes por periodo', 'Dashboard textual'],
  },
];

const steps = [
  {
    title: 'Accede al Plugin en ChatGPT',
    body: 'Desde ChatGPT Plus, busca el plugin de Holded o usa el enlace de conexion directa para iniciar el flujo de autorizacion.',
    icon: PlugZap,
  },
  {
    title: 'Autoriza el acceso a Holded',
    body: 'El flujo OAuth pide tu API key de Holded, la valida y almacena de forma protegida. La credencial no pasa a OpenAI.',
    icon: KeyRound,
  },
  {
    title: 'Pregunta desde ChatGPT',
    body: 'Una vez conectado, ChatGPT puede consultar datos de tu cuenta de Holded y preparar borradores o informes bajo tu control.',
    icon: MessageSquareText,
  },
];

const trustItems = [
  'Operado por Verifactu Business, no por OpenAI ni por Holded.',
  'La API key de Holded se almacena protegida y puede revocarse en cualquier momento.',
  'El conector es mayoritariamente de solo lectura; los borradores requieren revision del usuario.',
  'No mueve dinero, no envia emails automaticamente y no cierra contabilidad de forma autonoma.',
];

function Pill({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}

function CapabilityCard({ capability }: { capability: Capability }) {
  const Icon = capability.icon;
  return (
    <article className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.35)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
        <Icon className="h-5 w-5 text-emerald-600" />
      </div>
      <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-950">{capability.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{capability.body}</p>
      <ul className="mt-5 space-y-2">
        {capability.items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function ChatGPTConnectorPage() {
  return (
    <main className="page-enter min-h-screen bg-white text-slate-900">
      {/* ── Hero ── */}
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f0fdf4_100%)] py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-[1fr_0.92fr] lg:items-center">
          <div>
            <Pill icon={Sparkles}>Plugin Holded para ChatGPT</Pill>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-[3.25rem] sm:leading-[1.05]">
              Consulta Holded desde ChatGPT con permisos acotados y control del usuario.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Conecta tu cuenta de Holded mediante OAuth para consultar facturacion, contabilidad,
              clientes, proyectos e informes directamente desde ChatGPT.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/conectores/chatgpt/docs"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#10a37f] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_-24px_rgba(16,163,127,0.6)] transition hover:bg-[#0d8f6f]"
              >
                Ver documentacion
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Soporte del conector
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-950">
              <strong>Estado:</strong> operativo como plugin de ChatGPT con OAuth. La conexion se
              activa desde la pagina de configuracion del plugin.
            </div>
          </div>

          <DemoIframeHero connector="chatgpt" />
        </div>
      </section>

      {/* ── Pasos ── */}
      <section className="py-14 sm:py-18">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.title}
                  className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
                      <Icon className="h-5 w-5 text-slate-700" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Paso {index + 1}
                    </span>
                  </div>
                  <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-950">
                    {step.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Alcance funcional ── */}
      <section className="border-y border-slate-200 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <Pill icon={FileText}>Alcance funcional</Pill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.35rem]">
              Lo que ChatGPT puede consultar sobre Holded.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              El plugin prioriza lectura, explicacion y preparacion de borradores. La accion final
              sigue en manos del usuario.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {capabilities.map((capability) => (
              <CapabilityCard key={capability.title} capability={capability} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Seguridad y marca ── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <Pill icon={ShieldCheck}>Seguridad y marca</Pill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.35rem]">
              Separacion clara entre Verifactu Business, ChatGPT y Holded.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              La landing evita usar marcas de terceros como marca propia. ChatGPT es el canal de
              uso, Holded es el origen de datos y Verifactu Business opera el conector.
            </p>
          </div>

          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_24px_65px_-48px_rgba(15,23,42,0.45)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                <LockKeyhole className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-950">Compromisos visibles</h3>
                <p className="text-sm text-slate-500">Para usuarios, ERP y revisiones externas.</p>
              </div>
            </div>
            <ul className="mt-6 space-y-3">
              {trustItems.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              Verifactu Business no esta afiliado, patrocinado ni respaldado por OpenAI ni por
              Holded. OpenAI, ChatGPT y Holded son marcas de sus respectivos titulares.
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA: documentación y contratos ── */}
      <section className="bg-emerald-50 py-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">
              Documentacion y contratos del plugin ChatGPT.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
              Usa estos enlaces para el proceso de verificacion de OpenAI, revisiones externas y
              usuarios que necesitan entender permisos, datos tratados y soporte.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {(
              [
                ['Docs', '/conectores/chatgpt/docs'],
                ['Privacy', '/conectores/chatgpt/privacy'],
                ['DPA', '/conectores/chatgpt/dpa'],
              ] as const
            ).map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-100"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
