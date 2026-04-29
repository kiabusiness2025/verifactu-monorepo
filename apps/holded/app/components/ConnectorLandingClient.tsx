'use client';

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  FolderKanban,
  KeyRound,
  LockKeyhole,
  MessageSquareText,
  Play,
  PlugZap,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SingleSceneHero } from './SingleSceneHero';

// ── Types ──────────────────────────────────────────────────────────────────
type ConnectorId = 'claude' | 'chatgpt';

interface Theme {
  gradient: string;
  pillBg: string;
  pillText: string;
  iconBg: string;
  iconText: string;
  ctaBg: string;
  ctaShadow: string;
  chip: string;
  sectionBg: string;
  scopeBadge: string;
  checkColor: string;
  linkBorder: string;
}

interface ConnectorConfig {
  id: ConnectorId;
  label: string;
  headline: string;
  subtext: string;
  connectHref: string;
  connectLabel: string;
  docsHref: string;
  privacyHref: string;
  dpaHref: string;
  termsHref: string;
  status: string;
  aiName: string; // "Claude" | "ChatGPT"
  logoSrc: string;
}

// ── Themes ─────────────────────────────────────────────────────────────────
const THEMES: Record<ConnectorId, Theme> = {
  claude: {
    gradient: 'bg-[linear-gradient(175deg,#ffffff_0%,#fffbeb_100%)]',
    pillBg: 'bg-amber-50 border-amber-200',
    pillText: 'text-amber-800',
    iconBg: 'bg-amber-50',
    iconText: 'text-amber-600',
    ctaBg: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700',
    ctaShadow: 'shadow-[0_18px_45px_-20px_rgba(245,158,11,0.6)]',
    chip: 'bg-amber-50 border border-amber-200 text-amber-700',
    sectionBg: 'bg-amber-50/60',
    scopeBadge: 'bg-amber-100 text-amber-800',
    checkColor: 'text-amber-500',
    linkBorder: 'border-amber-200 hover:bg-amber-50 hover:border-amber-300',
  },
  chatgpt: {
    gradient: 'bg-[linear-gradient(175deg,#ffffff_0%,#f0fdf4_100%)]',
    pillBg: 'bg-emerald-50 border-emerald-200',
    pillText: 'text-emerald-800',
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
    ctaBg: 'bg-[#10a37f] hover:bg-[#0d8f6f] active:bg-[#0b7a61]',
    ctaShadow: 'shadow-[0_18px_45px_-20px_rgba(16,163,127,0.6)]',
    chip: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
    sectionBg: 'bg-emerald-50/60',
    scopeBadge: 'bg-emerald-100 text-emerald-800',
    checkColor: 'text-emerald-500',
    linkBorder: 'border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300',
  },
};

// ── Connector config ────────────────────────────────────────────────────────
const CONFIGS: Record<ConnectorId, ConnectorConfig> = {
  claude: {
    id: 'claude',
    label: 'Conector MCP · Holded para Claude',
    headline: 'Tu negocio en Holded, consultado desde Claude.',
    subtext:
      'Conecta mediante OAuth y pregunta a Claude sobre tus facturas, clientes y proyectos en tiempo real. Solo lectura por defecto, control total tuyo.',
    connectHref: '/claude',
    connectLabel: 'Conectar con Claude',
    docsHref: '/conectores/claude/docs',
    privacyHref: '/conectores/claude/privacy',
    dpaHref: '/conectores/claude/dpa',
    termsHref: '/conectores/claude/terms',
    status: 'Operativo · Conector personalizado MCP · Anthropic',
    aiName: 'Claude',
    logoSrc: '/brand/claude-logo.svg',
  },
  chatgpt: {
    id: 'chatgpt',
    label: 'Plugin OAuth · Holded para ChatGPT',
    headline: 'Tu negocio en Holded, consultado desde ChatGPT.',
    subtext:
      'Conecta mediante OAuth y pregunta a ChatGPT sobre tus facturas, clientes y proyectos en tiempo real. Solo lectura por defecto, control total tuyo.',
    connectHref: '/conectores/chatgpt/docs',
    connectLabel: 'Cómo conectar',
    docsHref: '/conectores/chatgpt/docs',
    privacyHref: '/conectores/chatgpt/privacy',
    dpaHref: '/conectores/chatgpt/dpa',
    termsHref: '/conectores/chatgpt/terms',
    status: 'Operativo · Plugin OAuth · OpenAI',
    aiName: 'ChatGPT',
    logoSrc: '/brand/chatgpt-logo.png',
  },
};

// ── Capabilities data ───────────────────────────────────────────────────────
interface Scope {
  name: string;
  desc: string;
}

interface Capability {
  id: string;
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  queries: string[];
  scopes: Scope[];
}

const CAPABILITIES: Capability[] = [
  {
    id: 'facturas',
    Icon: Receipt,
    title: 'Facturas y documentos',
    subtitle: 'Emitidas, recibidas, cobros y borradores revisables.',
    queries: [
      '¿Cuánto he facturado este mes?',
      '¿Qué facturas tengo pendientes de cobro?',
      'Muestra las 5 facturas más recientes',
      '¿Cuál es el detalle de la factura F-2024-0042?',
      'Prepara un borrador de factura para Tech Solutions por 3.200 €',
      '¿Qué clientes tienen facturas vencidas?',
      'Compara ingresos de marzo vs abril',
    ],
    scopes: [
      {
        name: 'list_documents',
        desc: 'Lista facturas emitidas y recibidas con filtros por estado, fecha y cliente.',
      },
      {
        name: 'get_document',
        desc: 'Detalle completo: líneas, importes, vencimientos y estado de cobro.',
      },
      {
        name: 'create_invoice_draft',
        desc: 'Crea un borrador revisable. El usuario debe confirmarlo antes de cualquier envío.',
      },
    ],
  },
  {
    id: 'contabilidad',
    Icon: BookOpen,
    title: 'Contabilidad',
    subtitle: 'PyG, balance, diario y plan de cuentas en lenguaje claro.',
    queries: [
      '¿Cuál es el resultado del ejercicio?',
      'Explícame el balance a cierre de trimestre',
      '¿Qué asientos hay en el diario de esta semana?',
      'Muestra las cuentas de gastos más activas',
      '¿Cómo está la tesorería ahora mismo?',
      'Compara ingresos y gastos de marzo vs abril',
    ],
    scopes: [
      { name: 'get_chart_of_accounts', desc: 'Plan de cuentas completo del ejercicio.' },
      { name: 'get_daily_book', desc: 'Diario contable con asientos por rango de fechas.' },
      { name: 'get_journal', desc: 'Libro mayor por cuenta o período.' },
      { name: 'list_treasury_accounts', desc: 'Cuentas bancarias y saldos de tesorería.' },
    ],
  },
  {
    id: 'clientes',
    Icon: Users,
    title: 'Clientes y CRM',
    subtitle: 'Contactos, leads, oportunidades y seguimiento comercial.',
    queries: [
      '¿Quiénes son mis 10 clientes por volumen este año?',
      'Muestra los datos de Tech Solutions Madrid',
      '¿Qué oportunidades hay abiertas en el embudo?',
      'Lista los leads que entraron esta semana',
      '¿Cuánto le hemos facturado a este cliente en total?',
      'Clientes sin factura en los últimos 90 días',
    ],
    scopes: [
      {
        name: 'list_contacts',
        desc: 'Lista contactos con filtros por tipo, etiqueta o nombre.',
      },
      {
        name: 'get_contact',
        desc: 'Detalle de un contacto: datos fiscales, historial y documentos.',
      },
      { name: 'list_crm_funnels', desc: 'Embudos de venta y sus etapas.' },
      {
        name: 'list_leads',
        desc: 'Oportunidades y leads con estado y valor estimado.',
      },
    ],
  },
  {
    id: 'proyectos',
    Icon: FolderKanban,
    title: 'Proyectos y RRHH',
    subtitle: 'Tareas, horas imputadas, empleados y catálogo de productos.',
    queries: [
      '¿Qué proyectos están activos ahora mismo?',
      'Muestra las tareas pendientes del proyecto X',
      '¿Cuántas horas se han imputado esta semana?',
      'Lista los empleados de la empresa',
      '¿Qué productos hay en el almacén principal?',
      'Resumen del estado de todos los proyectos',
    ],
    scopes: [
      { name: 'list_projects', desc: 'Lista proyectos activos o archivados.' },
      { name: 'get_project', desc: 'Detalle y métricas de un proyecto.' },
      { name: 'list_project_tasks', desc: 'Tareas de un proyecto con estado y asignación.' },
      { name: 'list_time_records', desc: 'Registros de tiempo imputados a proyectos.' },
      { name: 'list_employees', desc: 'Empleados y datos básicos de RRHH.' },
      { name: 'list_products', desc: 'Catálogo de productos y stock.' },
      { name: 'list_warehouses', desc: 'Almacenes y ubicaciones.' },
    ],
  },
];

const STEPS = [
  {
    icon: PlugZap,
    n: '01',
    title: 'Añade el conector',
    claude:
      'Registra el conector MCP en Claude usando la documentación. Revisa los permisos antes de autorizar.',
    chatgpt: 'Desde ChatGPT Plus, busca el plugin de Holded o usa el enlace de conexión directa.',
  },
  {
    icon: KeyRound,
    n: '02',
    title: 'Autoriza con OAuth',
    claude:
      'El flujo OAuth solicita tu API key de Holded, la valida y la almacena protegida. No se envía a Anthropic.',
    chatgpt:
      'El flujo OAuth solicita tu API key de Holded, la valida y la almacena protegida. No se envía a OpenAI.',
  },
  {
    icon: MessageSquareText,
    n: '03',
    title: 'Pregunta en lenguaje natural',
    claude:
      'Claude consulta Holded en tiempo real y te responde. Los borradores de factura requieren tu confirmación.',
    chatgpt:
      'ChatGPT consulta Holded en tiempo real y te responde. Los borradores de factura requieren tu confirmación.',
  },
];

const TRUST = [
  'Operado por Verifactu Business · no por Anthropic, OpenAI ni Holded.',
  'La API key de Holded se almacena protegida y puede revocarse en cualquier momento.',
  'Mayoritariamente de solo lectura. Los borradores requieren revisión explícita del usuario.',
  'No mueve dinero, no envía correos automáticamente y no cierra contabilidad de forma autónoma.',
];

// ── Modals ─────────────────────────────────────────────────────────────────
function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
      aria-hidden="true"
    />
  );
}

function DemoModal({ connector, onClose }: { connector: ConnectorId; onClose: () => void }) {
  return (
    <>
      <Backdrop onClose={onClose} />
      <div className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:inset-8 lg:inset-12">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <span className="text-sm font-semibold text-slate-700">
            Demo · Holded + {connector === 'claude' ? 'Claude' : 'ChatGPT'}
          </span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          <SingleSceneHero connector={connector} className="h-full" />
        </div>
      </div>
    </>
  );
}

function CapabilityModal({
  cap,
  theme,
  onClose,
}: {
  cap: Capability;
  theme: Theme;
  onClose: () => void;
}) {
  const { Icon } = cap;
  return (
    <>
      <Backdrop onClose={onClose} />
      <div className="fixed inset-x-4 top-[8%] z-50 mx-auto max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:inset-x-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.iconBg}`}
            >
              <Icon className={`h-5 w-5 ${theme.iconText}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-950">{cap.title}</h3>
              <p className="text-sm text-slate-500">{cap.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {/* Queries */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Consultas de ejemplo
            </p>
            <ul className="space-y-2">
              {cap.queries.map((q) => (
                <li key={q} className="flex items-start gap-2.5">
                  <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="text-sm text-slate-700">{q}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Scopes */}
          <div className="mt-7">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Permisos necesarios (scopes)
            </p>
            <ul className="space-y-3">
              {cap.scopes.map((s) => (
                <li key={s.name} className="flex items-start gap-3">
                  <code
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-tight ${theme.scopeBadge}`}
                  >
                    {s.name}
                  </code>
                  <span className="text-sm leading-5 text-slate-600">{s.desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
            <Code2 className="mb-0.5 mr-1.5 inline h-3.5 w-3.5" />
            Todos los scopes son de solo lectura salvo{' '}
            <span className="font-mono font-semibold">create_invoice_draft</span>, que crea un
            borrador que el usuario debe revisar y confirmar.
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export function ConnectorLandingClient({ connector }: { connector: ConnectorId }) {
  const t = THEMES[connector];
  const cfg = CONFIGS[connector];
  const [demoOpen, setDemoOpen] = useState(false);
  const [activeCap, setActiveCap] = useState<Capability | null>(null);

  // Close modals on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDemoOpen(false);
        setActiveCap(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = demoOpen || activeCap ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [demoOpen, activeCap]);

  return (
    <main className="page-enter min-h-screen bg-white text-slate-900">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className={`border-b border-slate-200 ${t.gradient} pb-20 pt-16 sm:pt-20`}>
        <div className="mx-auto max-w-4xl px-4 text-center">
          {/* Logo lockup */}
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Holded"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </div>
            <span className="text-lg font-light text-slate-300">+</span>
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Image
                src={cfg.logoSrc}
                alt={cfg.aiName}
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </div>
          </div>

          {/* Badge */}
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${t.pillBg} ${t.pillText}`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {cfg.label}
          </div>

          {/* Headline */}
          <h1 className="mt-7 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl sm:leading-[1.06]">
            {cfg.headline}
          </h1>

          {/* Subtext */}
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">{cfg.subtext}</p>

          {/* CTAs */}
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setDemoOpen(true)}
              className={`inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition ${t.ctaBg} ${t.ctaShadow}`}
            >
              <Play className="h-4 w-4 fill-current" />
              Ver demo en vivo
            </button>
            <Link
              href={cfg.connectHref}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              {cfg.connectLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Trust chips */}
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {['Solo lectura por defecto', 'OAuth seguro', 'Sin datos almacenados'].map((chip) => (
              <span key={chip} className={`rounded-full px-3 py-1 text-xs font-medium ${t.chip}`}>
                {chip}
              </span>
            ))}
          </div>

          {/* Status */}
          <p className="mt-5 text-xs text-slate-400">{cfg.status}</p>
        </div>
      </section>

      {/* ── Capacidades ──────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Qué puedes consultar
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Acceso completo a Holded, en lenguaje natural.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((cap) => {
              const { Icon } = cap;
              return (
                <article
                  key={cap.id}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.iconBg}`}
                  >
                    <Icon className={`h-5 w-5 ${t.iconText}`} />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-950">{cap.title}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-6 text-slate-500">{cap.subtitle}</p>
                  <button
                    onClick={() => setActiveCap(cap)}
                    className={`mt-4 self-start text-xs font-semibold transition ${t.iconText} hover:underline`}
                  >
                    Ver consultas disponibles →
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ────────────────────────────────────────────────── */}
      <section className={`border-y border-slate-100 py-16 sm:py-20 ${t.sectionBg}`}>
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Cómo funciona
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Tres pasos para conectar Holded con {cfg.aiName}.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => {
              const { icon: Icon } = step;
              return (
                <div
                  key={step.n}
                  className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <span className="absolute right-5 top-5 text-[11px] font-bold tabular-nums tracking-widest text-slate-300">
                    {step.n}
                  </span>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.iconBg}`}
                  >
                    <Icon className={`h-5 w-5 ${t.iconText}`} />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {connector === 'claude' ? step.claude : step.chatgpt}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Seguridad ────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.iconBg}`}>
                <ShieldCheck className={`h-4.5 w-4.5 ${t.iconText}`} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-950">Compromisos de seguridad</h2>
                <p className="text-xs text-slate-500">
                  Para usuarios, revisiones externas y directorio oficial.
                </p>
              </div>
            </div>
            <ul className="divide-y divide-slate-50 px-6">
              {TRUST.map((item) => (
                <li key={item} className="flex items-start gap-3 py-3.5">
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${t.checkColor}`} />
                  <span className="text-sm leading-6 text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs leading-5 text-slate-500">
              <LockKeyhole className="mr-1.5 inline h-3.5 w-3.5 shrink-0" />
              Verifactu Business no está afiliado, patrocinado ni respaldado por Anthropic, OpenAI
              ni Holded. Estas son marcas de sus respectivos titulares.
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────────────── */}
      <section className={`border-t border-slate-100 py-14 ${t.sectionBg}`}>
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            ¿Listo para conectar Holded con {cfg.aiName}?
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Operativo desde hoy. Sin instalación adicional salvo el propio conector.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setDemoOpen(true)}
              className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition ${t.ctaBg} ${t.ctaShadow}`}
            >
              <Play className="h-4 w-4 fill-current" />
              Ver demo
            </button>
            <Link
              href={cfg.docsHref}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Documentación
            </Link>
          </div>
          <div className="mt-8 flex justify-center gap-5 text-xs">
            {[
              ['Docs', cfg.docsHref],
              ['Privacy', cfg.privacyHref],
              ['DPA', cfg.dpaHref],
              ['Terms', cfg.termsHref],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {demoOpen && <DemoModal connector={connector} onClose={() => setDemoOpen(false)} />}
      {activeCap && (
        <CapabilityModal cap={activeCap} theme={t} onClose={() => setActiveCap(null)} />
      )}
    </main>
  );
}
