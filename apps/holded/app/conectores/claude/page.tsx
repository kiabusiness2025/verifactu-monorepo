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
import Link from 'next/link';
import { SingleSceneHero } from '@/app/components/SingleSceneHero';

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

// Datos reales de Holded API · empresa demo Nova Gestión
const MONTHLY_REVENUE = [
  { month: 'Ene', total: 14883 },
  { month: 'Feb', total: 6958 },
  { month: 'Mar', total: 12826 },
  { month: 'Abr', total: 12403 },
];

const TOP_CLIENTS = [
  { name: 'Tech Solutions Madrid S.L.', total: 16396, docs: 2 },
  { name: 'Construcciones Rivas S.A.', total: 7805, docs: 2 },
  { name: 'Restaurante El Patio S.L.', total: 5445, docs: 1 },
  { name: 'Distribuciones López e Hijos', total: 5324, docs: 1 },
];

const PENDING_INVOICES = [
  {
    client: 'Tech Solutions Madrid S.L.',
    concept: 'Desarrollo + Formación · Sprint Abr',
    amount: 9680,
    due: '28 abr',
  },
  {
    client: 'Farmacia García Hermanos S.L.',
    concept: 'Consultoría optimización compras',
    amount: 2178,
    due: '07 abr',
  },
  {
    client: 'Distribuciones García e Hijos S.A.',
    concept: 'Análisis financiero mensual',
    amount: 545,
    due: '03 may',
  },
];

const SERVICES = [
  { label: 'Desarrollo software', value: 12000 },
  { label: 'Consultoría', value: 6000 },
  { label: 'ERP implantación', value: 6000 },
  { label: 'Pack Starter', value: 4500 },
  { label: 'Hardware / Servidor', value: 3200 },
];

function fmt(n: number): string {
  return n.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €';
}

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

// ── Galería 1: facturación mensual (gráfico de barras SVG) ───────────────────
function RevenueChartMockup() {
  const max = Math.max(...MONTHLY_REVENUE.map((m) => m.total));
  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Facturación mensual
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">47.069&nbsp;€</p>
            <p className="text-[11px] text-slate-500">Ene – Abr 2026 · con IVA</p>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            KPI
          </span>
        </div>

        <svg viewBox="0 0 240 72" className="mt-4 w-full" aria-hidden="true">
          {MONTHLY_REVENUE.map((m, i) => {
            const barH = (m.total / max) * 54;
            const x = i * 60 + 10;
            const y = 60 - barH;
            const isMax = m.total === max;
            return (
              <g key={m.month}>
                <rect
                  x={x}
                  y={y}
                  width={40}
                  height={barH}
                  rx={5}
                  fill={isMax ? '#f59e0b' : '#fde68a'}
                />
                <text x={x + 20} y={70} textAnchor="middle" fontSize={8} fill="#94a3b8">
                  {m.month}
                </text>
                <text
                  x={x + 20}
                  y={y - 3}
                  textAnchor="middle"
                  fontSize={7}
                  fill={isMax ? '#d97706' : '#f59e0b'}
                  fontWeight={isMax ? 'bold' : 'normal'}
                >
                  {Math.round(m.total / 1000)}k
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 px-5 py-3.5">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
          Facturación
        </span>
        <p className="text-[11px] text-slate-500">Datos reales · Nova Gestión · Holded MCP</p>
      </div>
    </div>
  );
}

// ── Galería 2: facturas pendientes de cobro ───────────────────────────────────
function PendingInvoicesMockup() {
  const total = PENDING_INVOICES.reduce((a, b) => a + b.amount, 0);
  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Pendiente de cobro
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{fmt(total)}</p>
            <p className="text-[11px] text-slate-500">3 facturas · Abr–May 2026</p>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Cobros
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {PENDING_INVOICES.map((inv) => (
            <div
              key={inv.client}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-slate-800">{inv.client}</p>
                <p className="truncate text-[10px] text-slate-500">{inv.concept}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] font-bold tabular-nums text-slate-900">
                  {fmt(inv.amount)}
                </p>
                <p className="text-[9px] text-slate-400">vence {inv.due}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 px-5 py-3.5">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
          Facturas
        </span>
        <p className="text-[11px] text-slate-500">Datos reales · Nova Gestión · Holded MCP</p>
      </div>
    </div>
  );
}

// ── Galería 3: ingresos por tipo de servicio ──────────────────────────────────
function ServiceBreakdownMockup() {
  const maxV = SERVICES[0].value;
  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Ingresos por servicio
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">38.900&nbsp;€</p>
            <p className="text-[11px] text-slate-500">Sin IVA · 8 categorías</p>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Servicios
          </span>
        </div>

        <div className="mt-4 space-y-2.5">
          {SERVICES.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <p className="w-28 shrink-0 truncate text-[10px] text-slate-600">{s.label}</p>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${(s.value / maxV) * 100}%` }}
                />
              </div>
              <p className="w-16 shrink-0 text-right text-[10px] font-semibold tabular-nums text-slate-700">
                {fmt(s.value)}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 px-5 py-3.5">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
          Análisis
        </span>
        <p className="text-[11px] text-slate-500">Datos reales · Nova Gestión · Holded MCP</p>
      </div>
    </div>
  );
}

// ── Galería 4: ranking de clientes ────────────────────────────────────────────
function ClientRankingMockup() {
  const maxC = TOP_CLIENTS[0].total;
  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Top clientes
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              8 clientes activos
            </p>
            <p className="text-[11px] text-slate-500">Por facturación total · 2026</p>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            CRM
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {TOP_CLIENTS.map((c, i) => (
            <div key={c.name} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-[10px] font-bold text-slate-400">#{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-slate-800">{c.name}</p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${(c.total / maxC) * 100}%` }}
                  />
                </div>
              </div>
              <p className="shrink-0 text-[11px] font-bold tabular-nums text-slate-900">
                {fmt(c.total)}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 px-5 py-3.5">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
          Contactos
        </span>
        <p className="text-[11px] text-slate-500">Datos reales · Nova Gestión · Holded MCP</p>
      </div>
    </div>
  );
}

export default function ClaudeConnectorPage() {
  return (
    <main className="page-enter min-h-screen bg-white text-slate-900">
      {/* ── Hero ── */}
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffbeb_100%)] pt-10 pb-16 sm:pb-20">
        <div className="mx-auto max-w-6xl px-4">
          {/* Demo first on desktop, after title on mobile */}
          <SingleSceneHero connector="claude" className="hidden lg:block" />

          {/* Text */}
          <div className="mx-auto max-w-3xl text-center lg:mt-12">
            <Pill icon={Sparkles}>Conector Holded para Claude</Pill>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-[3.25rem] sm:leading-[1.05]">
              Consulta Holded desde Claude con permisos acotados y control del usuario.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Conecta tu cuenta de Holded mediante MCP y OAuth para consultar facturacion,
              contabilidad, clientes, proyectos e informes directamente desde Claude.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/conectores/claude/docs"
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_-24px_rgba(245,158,11,0.7)] transition hover:bg-amber-600"
              >
                Ver documentacion MCP
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Soporte del conector
              </Link>
            </div>
          </div>

          {/* Demo after title on mobile */}
          <SingleSceneHero connector="claude" className="mt-10 lg:hidden" />

          <p className="mt-4 text-center text-xs text-slate-400">
            Estado: operativo como conector personalizado. La presencia en el directorio oficial de
            Anthropic puede depender de revision externa.
          </p>
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

      {/* ── Galería: datos reales de Nova Gestión ── */}
      <section className="border-t border-slate-200 bg-white py-14 sm:py-18">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <Pill icon={Sparkles}>Resultados reales</Pill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
              Visto en acción con datos de Holded.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Mockups generados con datos reales de la empresa demo Nova Gestión a través del
              conector MCP — facturación, cobros, servicios y ranking de clientes.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <RevenueChartMockup />
            <PendingInvoicesMockup />
            <ServiceBreakdownMockup />
            <ClientRankingMockup />
          </div>
        </div>
      </section>

      {/* ── Alcance funcional ── */}
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

      {/* ── Seguridad y marca ── */}
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

      {/* ── CTA: documentación y contratos ── */}
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
            {(
              [
                ['Docs', '/conectores/claude/docs'],
                ['Privacy', '/conectores/claude/privacy'],
                ['DPA', '/conectores/claude/dpa'],
              ] as const
            ).map(([label, href]) => (
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
