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
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Conector Holded para Claude | Verifactu Business',
  description:
    'Landing canonica del conector Holded para Claude. Consulta facturacion, contabilidad, clientes y proyectos desde Claude mediante MCP, con OAuth y permisos acotados.',
  alternates: {
    canonical: '/conectores/claude',
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
    body: 'Consulta facturas, importes pendientes, vencimientos y detalle de documentos desde Claude.',
    icon: Receipt,
    items: ['Facturas emitidas', 'Estados de cobro', 'Borradores revisables'],
  },
  {
    title: 'Contabilidad en lenguaje claro',
    body: 'Transforma diario, cuentas, PyG y balances en respuestas comprensibles para tomar decisiones.',
    icon: BookOpen,
    items: ['Diario contable', 'Balance', 'Cuenta de resultados'],
  },
  {
    title: 'Clientes y actividad',
    body: 'Cruza clientes, contactos, oportunidades y facturacion para saber que revisar primero.',
    icon: Users,
    items: ['Contactos', 'CRM', 'Seguimiento comercial'],
  },
  {
    title: 'Informes y contexto',
    body: 'Genera resumenes, comparativas y explicaciones con datos demo o datos reales conectados por el usuario.',
    icon: BarChart3,
    items: ['Informes PDF', 'Comparativas', 'Analisis trimestral'],
  },
];

const steps = [
  {
    title: 'Añade el conector en Claude',
    body: 'Usa la documentacion MCP para registrar el conector personalizado y revisar los permisos antes de autorizarlo.',
    icon: PlugZap,
  },
  {
    title: 'Autoriza el acceso a Holded',
    body: 'El flujo OAuth pide la API key de Holded y valida la conexion. La credencial se procesa en backend y no se envia a Anthropic.',
    icon: KeyRound,
  },
  {
    title: 'Pregunta desde Claude',
    body: 'Una vez conectado, Claude puede consultar datos de Holded y preparar borradores o informes bajo el control del usuario.',
    icon: MessageSquareText,
  },
];

const trustItems = [
  'Operado por Verifactu Business, no por Anthropic ni por Holded.',
  'La API key de Holded se almacena protegida y puede revocarse.',
  'El conector es mayoritariamente de solo lectura; los borradores requieren revision del usuario.',
  'No mueve dinero, no envia emails automaticamente y no cierra contabilidad de forma autonoma.',
];

function Pill({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}

function CapabilityCard({ capability }: { capability: Capability }) {
  const Icon = capability.icon;

  return (
    <article className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.35)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50">
        <Icon className="h-5 w-5 text-amber-600" />
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

function HeroScreenshot() {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.48)]">
      <div className="relative overflow-hidden rounded-[1.4rem]">
        <Image
          src="/screens/claude/claude-informe.png"
          alt="Informe financiero 2025 generado por Claude con datos reales de Holded — resumen anual, cuenta de PyG y comparativa trimestral"
          width={1200}
          height={750}
          className="w-full object-cover object-top"
          priority
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/70 to-transparent px-4 pb-4 pt-12">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Real
            </span>
            <p className="text-xs font-medium text-white/90">
              Informe financiero 2025 generado desde datos reales de Holded
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClaudeConnectorPage() {
  return (
    <main className="page-enter min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffbeb_100%)] py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-[1fr_0.92fr] lg:items-center">
          <div>
            <Pill icon={Sparkles}>Conector Holded para Claude</Pill>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-[3.25rem] sm:leading-[1.05]">
              Consulta Holded desde Claude con permisos acotados y control del usuario.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Conecta tu cuenta de Holded mediante MCP y OAuth para consultar facturacion,
              contabilidad, clientes, proyectos e informes directamente desde Claude.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/conectores/claude/docs"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_-24px_rgba(245,158,11,0.7)] transition hover:bg-amber-600"
              >
                Ver documentacion MCP
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Soporte del conector
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
              <strong>Estado:</strong> operativo como conector personalizado. La presencia en el
              directorio oficial de Anthropic puede depender de revision externa.
            </div>
          </div>

          <HeroScreenshot />
        </div>
      </section>

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

      <section className="border-t border-slate-200 bg-white py-14 sm:py-18">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <Pill icon={Sparkles}>Resultados reales</Pill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
              Visto en acción con datos de Holded.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Capturas reales de Claude consultando Holded — informes PDF, dashboards HTML, facturas
              y análisis financiero en lenguaje natural.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              {
                src: '/screens/claude/claude-dashboard.png',
                caption: 'Dashboard HTML con ventas, gastos y beneficio por mes y cliente',
                label: 'Visualización',
              },
              {
                src: '/screens/claude/claude-kpi.png',
                caption: 'KPIs consolidados: 45.050 € facturación, 40.683 € beneficio estimado',
                label: 'KPIs',
              },
              {
                src: '/screens/claude/claude-factura.png',
                caption: 'Factura PDF generada como borrador revisable — FAC-2025-0043, 2.722,50 €',
                label: 'Facturación',
              },
              {
                src: '/screens/claude/claude-informe-detalle.png',
                caption: 'Informe financiero PDF con evolución trimestral y tabla de resultados',
                label: 'Informes',
              },
            ].map(({ src, caption, label }) => (
              <div
                key={src}
                className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <Image
                    src={src}
                    alt={caption}
                    width={800}
                    height={500}
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <div className="flex items-center gap-3 px-5 py-3.5">
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    {label}
                  </span>
                  <p className="text-xs leading-5 text-slate-500">{caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <Pill icon={FileText}>Alcance funcional</Pill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.35rem]">
              Lo que Claude puede consultar sobre Holded.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              El conector prioriza lectura, explicacion y preparacion de borradores. La accion final
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

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <Pill icon={ShieldCheck}>Seguridad y marca</Pill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.35rem]">
              Separacion clara entre Verifactu Business, Claude y Holded.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              La landing evita usar marcas de terceros como marca propia. Claude es el canal de uso,
              Holded es el origen de datos y Verifactu Business opera el conector.
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
              Verifactu Business no esta afiliado, patrocinado ni respaldado por Anthropic ni por
              Holded. Anthropic, Claude y Holded son marcas de sus respectivos titulares.
            </div>
          </div>
        </div>
      </section>

      <section className="bg-amber-50 py-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">
              Documentacion y contratos del conector Claude.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
              Usa estos enlaces para el formulario del ERP, revisiones externas y usuarios que
              necesitan entender permisos, datos tratados y soporte.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              ['Docs', '/conectores/claude/docs'],
              ['Privacy', '/conectores/claude/privacy'],
              ['DPA', '/conectores/claude/dpa'],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-amber-300 hover:bg-amber-100"
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
