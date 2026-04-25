import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSearch,
  FileText,
  FolderKanban,
  MessageCircleMore,
  PlayCircle,
  Receipt,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import HoldedHeroVisual from './components/HoldedHeroVisual';
import { buildAuthUrl } from './lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Holded | Entiende tu contabilidad y controla tu negocio con ChatGPT',
  description:
    'Conecta Holded con ChatGPT y entiende tu balance, IVA, modelos fiscales y cobros en lenguaje claro. Sin aprender el ERP, sin esperar al gestor.',
};

type FeatureGroup = {
  title: string;
  badge: string;
  badgeClassName: string;
  icon: LucideIcon;
  summary: string;
  outcome: string;
  capabilities: string[];
};

type RoleCard = {
  title: string;
  body: string;
  bullets: string[];
};

type PainItem = {
  problem: string;
  solution: string;
  icon: LucideIcon;
};

type UseCaseGroup = {
  label: string;
  icon: LucideIcon;
  items: string[];
};

const pains: PainItem[] = [
  {
    problem: 'No sabes qué revisar primero',
    solution:
      'Señala las facturas vencidas, cobros en riesgo y gastos que necesitan atención, ordenados por prioridad.',
    icon: AlertCircle,
  },
  {
    problem: 'Dependes del gestor para entender los números',
    solution:
      'Obtén respuestas claras sobre IVA, gastos y contabilidad sin esperar a la próxima reunión.',
    icon: Users,
  },
  {
    problem: 'Tardas demasiado en entender cobros e IVA',
    solution:
      'Consulta cualquier dato de Holded en lenguaje normal, sin navegar entre pantallas ni entender el ERP.',
    icon: Clock3,
  },
  {
    problem: 'Los datos están en Holded pero no los interpretas',
    solution:
      'Transforma el balance, el diario y los registros de tu cuenta en respuestas útiles con criterio de negocio.',
    icon: BarChart3,
  },
];

const useCaseGroups: UseCaseGroup[] = [
  {
    label: 'Entiende tu negocio',
    icon: BarChart3,
    items: [
      'Ver qué facturas deberías revisar hoy y detectar cobros en riesgo.',
      'Revisar gastos por proveedor, categoría o periodo.',
      'Consultar la revisión de tesorería y saldos disponibles en Holded.',
      'Identificar clientes con seguimiento o cobro pendiente.',
    ],
  },
  {
    label: 'Entiende tu contabilidad',
    icon: BookOpen,
    items: [
      'Leer el diario contable en lenguaje claro, sin tecnicismos.',
      'Interpretar el balance y la cuenta de resultados del ejercicio.',
      'Revisar el cierre trimestral antes de la reunión con el gestor.',
      'Entender qué hay detrás de los asientos de IVA o amortización.',
    ],
  },
  {
    label: 'Revisa impuestos y documentación',
    icon: Receipt,
    items: [
      'Entender el IVA del trimestre y los datos detrás del modelo 303.',
      'Revisar facturas y gastos que afectan al modelo 349, 130 o 390.',
      'Preparar el contexto para el Impuesto sobre Sociedades.',
      'Preparar borradores de factura, siempre con tu confirmación.',
    ],
  },
];

const metrics = [
  {
    icon: ShieldCheck,
    value: 'Sin cambios',
    label: 'No modifica tu cuenta de Holded. Solo genera borradores con tu confirmación explícita.',
  },
  {
    icon: BarChart3,
    value: 'Decide hoy',
    label: 'Detecta qué factura cobrar, qué gasto revisar y qué llevar al gestor.',
  },
  {
    icon: MessageCircleMore,
    value: 'Lenguaje claro',
    label: 'Respuestas en español, sin jerga contable ni tecnicismos.',
  },
  {
    icon: Sparkles,
    value: '0 EUR',
    label: 'Acceso gratuito para usuarios de ChatGPT.',
  },
];

const featureGroups: FeatureGroup[] = [
  {
    title: 'Facturación',
    badge: 'Consulta y borradores',
    badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: FileText,
    summary:
      'Consulta lo emitido, detecta cobros en riesgo y prepara borradores sin salir de la conversación.',
    outcome: 'Ideal para saber qué revisar hoy y reducir el tiempo entre decisión y emisión.',
    capabilities: [
      'Ver facturas emitidas por cliente, fecha, estado o importe.',
      'Detectar vencidas, pendientes de cobro y facturas con seguimiento pendiente.',
      'Entender una factura concreta con IVA, vencimiento y contexto de cliente.',
      'Preparar borradores de factura nuevos, siempre con confirmación explícita.',
    ],
  },
  {
    title: 'Gastos y compras',
    badge: 'Solo consulta',
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: Building2,
    summary: 'Revisa proveedores, gastos e IVA soportado para entender dónde se va el margen.',
    outcome: 'Ayuda a controlar el gasto, pagos pendientes y estructura de proveedores.',
    capabilities: [
      'Consultar facturas de proveedor y gastos por categoría o cuenta.',
      'Revisar pagos pendientes y analizar gasto por periodo o proveedor.',
      'Entender el IVA soportado y deducible en términos claros.',
    ],
  },
  {
    title: 'Contabilidad',
    badge: 'Solo consulta',
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: BookOpen,
    summary:
      'Interpreta balance, cuenta de resultados, diario contable y asientos para convertir los números en criterio de negocio.',
    outcome:
      'Para dirección, finanzas o quien trabaja con gestor y quiere entender qué hay detrás de cada movimiento.',
    capabilities: [
      'Consultar el balance de situación y entender activo, pasivo y patrimonio en lenguaje claro.',
      'Revisar la cuenta de resultados (PyG) y el resultado del ejercicio en el periodo que necesites.',
      'Leer el diario contable y entender los asientos sin ser contable.',
      'Revisar IVA repercutido y soportado, cuotas pendientes de liquidar.',
      'Consultar la revisión de tesorería: cuentas y saldos financieros registrados en Holded.',
      'Preparar contexto para el cierre trimestral o el Impuesto sobre Sociedades.',
    ],
  },
  {
    title: 'Impuestos y documentación',
    badge: 'Solo consulta',
    badgeClassName: 'border-sky-100 bg-sky-50 text-sky-700',
    icon: Receipt,
    summary:
      'Revisa los datos que alimentan tus modelos fiscales y llega con contexto a cada presentación.',
    outcome:
      'Útil para preparar la información antes de trabajar con tu gestor en los modelos fiscales trimestrales o anuales.',
    capabilities: [
      'Revisar los datos de IVA que alimentan el modelo 303 de cada trimestre.',
      'Consultar operaciones intracomunitarias para el modelo 349.',
      'Entender qué hay detrás del modelo 130 (pagos fraccionados IRPF).',
      'Preparar el contexto para los modelos 390, 111, 180 o 190.',
      'Revisar el resultado contable como base para el Impuesto sobre Sociedades.',
      'Detectar facturas o asientos que pueden afectar a la declaración.',
    ],
  },
  {
    title: 'Clientes y CRM',
    badge: 'Solo consulta',
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: Users,
    summary:
      'Cruza clientes, actividad comercial y facturación para saber a quién llamar o revisar primero.',
    outcome: 'Muy útil para seguimiento de cobros y gestión comercial.',
    capabilities: [
      'Ver clientes y contactos por nombre, NIF o actividad reciente.',
      'Identificar cuentas con más riesgo de cobro o seguimiento pendiente.',
      'Relacionar contactos con facturas pendientes y oportunidades.',
    ],
  },
  {
    title: 'Proyectos y tareas',
    badge: 'Solo consulta',
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: FolderKanban,
    summary: 'Lee carga operativa, tareas pendientes y proyectos activos con vista priorizada.',
    outcome: 'Ayuda a coordinar operaciones sin perder el hilo financiero.',
    capabilities: [
      'Ver proyectos activos, estado, tareas y prioridades.',
      'Cruzar proyectos con clientes y facturación asociada.',
      'Detectar bloqueos y trabajo en curso con más contexto.',
    ],
  },
];

const roleCards: RoleCard[] = [
  {
    title: 'Si llevas la gestión por tu cuenta',
    body: 'Resuelve dudas sobre facturas, cobros, IVA y gastos sin depender de entender la contabilidad como un técnico.',
    bullets: [
      'Qué facturas deberías cobrar esta semana.',
      'Cómo va el trimestre en gastos e ingresos.',
      'Qué borradores tienes listos para revisar.',
    ],
  },
  {
    title: 'Si trabajas con gestor o asesoría',
    body: 'Llega con contexto a cada reunión. Detecta incidencias antes y controla mejor qué revisar sin depender de informes.',
    bullets: [
      'Detectar puntos de revisión antes del cierre.',
      'Entender qué hay detrás de cada movimiento.',
      'Preparar preguntas concretas para tu gestor.',
    ],
  },
  {
    title: 'Si diriges una pyme',
    body: 'Ten una visión clara de ventas, cobros, gastos e IVA sin pedir exportaciones cada vez.',
    bullets: [
      'Lectura rápida de cobros y situación de caja.',
      'Qué clientes concentran más riesgo.',
      'Cómo va el negocio sin leer un informe técnico.',
    ],
  },
];

const journeySteps = [
  {
    step: '01',
    title: 'Te conectas en menos de 1 minuto',
    body: 'Solo necesitas tu correo y la API key de Holded. El alta es guiada y valida la conexión antes de que entres.',
  },
  {
    step: '02',
    title: 'Consultas en lenguaje claro',
    body: 'Pregunta sobre facturas, contabilidad, IVA, gastos o proyectos y obtén respuestas directas con contexto de negocio.',
  },
  {
    step: '03',
    title: 'Revisas antes de actuar',
    body: 'Si necesitas preparar una factura, el sistema te muestra el borrador para que lo revises y confirmes antes de guardar nada.',
  },
];

const faqItems = [
  {
    question: '¿Qué puedo consultar exactamente?',
    answer:
      'Facturas emitidas, gastos, contabilidad (balance, cuenta de resultados, diario), clientes y proyectos. También puedes revisar el IVA del trimestre, entender qué datos afectan a los modelos fiscales (303, 349, 130, 390, 111, 180, 190...) y preparar el contexto para el cierre o el Impuesto sobre Sociedades. Todo en lenguaje claro, sin conocer el ERP.',
  },
  {
    question: '¿Solo puedo ver facturas o también la contabilidad?',
    answer:
      'También la contabilidad. Puedes consultar el balance de situación, la cuenta de resultados (PyG), el diario contable y los saldos de cuentas. No necesitas ser contable: lo explica en términos claros con contexto de negocio.',
  },
  {
    question: '¿Puede ayudarme con los modelos fiscales como el 303 o el IS?',
    answer:
      'Te ayuda a entender los datos que alimentan esos modelos y a detectar qué conviene revisar antes de presentarlos. No presenta modelos fiscales automáticamente ni sustituye la validación de tu gestor, pero te permite llegar con más contexto y menos dudas a cada presentación.',
  },
  {
    question: '¿Puedo usarlo para contrastar archivos o extractos externos?',
    answer:
      'Sí. ChatGPT puede analizar archivos que tú subas (Excel, CSV, PDFs de extractos) y contrastarlos con los datos de Holded. Es útil para reconciliaciones, revisiones de tesorería o preparar información para tu gestor.',
  },
  {
    question: '¿Puede modificar datos en mi cuenta de Holded?',
    answer:
      'No realiza cambios en tu cuenta de Holded. El único cambio posible es generar borradores de facturas emitidas, y siempre con tu confirmación explícita antes de crear nada.',
  },
  {
    question: '¿Sustituye a mi gestor o asesoría?',
    answer:
      'No, y no está pensado para eso. Te ayuda a entender mejor tus números para que las conversaciones con tu gestor sean más útiles. La validación profesional de declaraciones fiscales, cierres y auditorías sigue siendo responsabilidad del gestor.',
  },
];

function SectionPill({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 shadow-sm backdrop-blur">
      <Icon className="h-3.5 w-3.5 text-[#ff5460]" />
      {children}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_-42px_rgba(15,23,42,0.55)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff5460]/10">
        <Icon className="h-5 w-5 text-[#ff5460]" />
      </div>
      <div className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{label}</p>
    </article>
  );
}

function PainCard({ item }: { item: PainItem }) {
  const Icon = item.icon;
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.35)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
        <Icon className="h-5 w-5 text-slate-500" />
      </div>
      <h3 className="mt-4 text-base font-bold tracking-tight text-slate-900">{item.problem}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{item.solution}</p>
    </article>
  );
}

function FeatureAccordion({
  feature,
  defaultOpen = false,
}: {
  feature: FeatureGroup;
  defaultOpen?: boolean;
}) {
  const Icon = feature.icon;

  return (
    <details
      className="holded-accordion group rounded-[1.85rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-42px_rgba(15,23,42,0.45)]"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ff5460]/10">
            <Icon className="h-5 w-5 text-[#ff5460]" />
          </div>
          <div>
            <div
              className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${feature.badgeClassName}`}
            >
              {feature.badge}
            </div>
            <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-950">
              {feature.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{feature.summary}</p>
          </div>
        </div>

        <span className="holded-accordion-chevron mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition group-hover:border-[#ff5460]/30 group-hover:text-[#ff5460]">
          <ChevronRight className="h-4 w-4" />
        </span>
      </summary>

      <div className="mt-5 border-t border-slate-100 pt-5">
        <ul className="space-y-2.5">
          {feature.capabilities.map((capability) => (
            <li
              key={capability}
              className="flex items-start gap-3 text-sm leading-6 text-slate-700"
            >
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
              {capability}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm italic text-slate-500">{feature.outcome}</p>
      </div>
    </details>
  );
}

function RolePanel({ title, body, bullets }: RoleCard) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.5)]">
      <h3 className="text-lg font-bold tracking-tight text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
      <ul className="mt-5 space-y-2.5">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#ff5460]" />
            {bullet}
          </li>
        ))}
      </ul>
    </article>
  );
}

import { useState } from 'react';

export default function HoldedHomePage() {
  const [apiKey, setApiKey] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lógica de conexión adaptada
  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/holded/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, channel: 'chatgpt' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Error de conexión');

      // Si requiere onboarding, redirige automáticamente
      if (data?.nextStep === 'onboarding_required') {
        // Redirige a onboarding conversacional, pasando el destino final
        const next = encodeURIComponent('/');
        window.location.assign(`/onboarding/profile?next=${next}`);
        return;
      }

      setConnected(true);
    } catch (e: any) {
      setError(e?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-enter min-h-screen text-slate-900">
      {/* ── Hero ── */}
      <section id="solucion" className="relative overflow-hidden pb-16 pt-12 sm:pt-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8rem] top-[-4rem] h-[20rem] w-[20rem] rounded-full bg-[#ff5460]/10 blur-3xl" />
          <div className="absolute right-[-6rem] top-[8rem] h-[18rem] w-[18rem] rounded-full bg-sky-200/35 blur-3xl" />
          <div className="absolute bottom-[-8rem] left-[24%] h-[16rem] w-[16rem] rounded-full bg-amber-200/30 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4">
          <div className="grid gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <SectionPill icon={Sparkles}>Conector Holded para ChatGPT</SectionPill>

              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-[-0.04em] text-slate-950 sm:text-[3.5rem] sm:leading-[1.0]">
                Controla tu facturación y contabilidad sin complicarte.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Habla con tus datos de Holded en lenguaje claro. Entiende cobros, contabilidad e
                impuestos sin aprender el ERP ni esperar al gestor.
              </p>

              {/* --- NUEVO: Bloque de conexión --- */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row items-center">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="API Key de Holded..."
                  className="w-56 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
                  disabled={loading || connected}
                />
                <button
                  onClick={handleConnect}
                  disabled={apiKey.length < 8 || loading || connected}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#ff5460] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#ef4654] disabled:opacity-40"
                >
                  {loading ? <span className="animate-spin mr-1">⏳</span> : null}
                  {connected ? 'Conectado' : loading ? 'Conectando...' : 'Conectar'}
                </button>
                {error && <span className="ml-3 text-xs text-rose-600">{error}</span>}
              </div>
              {/* --- FIN NUEVO --- */}

              <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm leading-6 text-slate-700 backdrop-blur">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  No realiza cambios en tu cuenta de Holded. Solo puede generar borradores de
                  facturas emitidas, y siempre con tu confirmación explícita.
                </span>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={buildAuthUrl('holded_home_existing')}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/85 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white"
                >
                  Ya tengo acceso
                </Link>
                <Link
                  href="/contacto"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/85 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white"
                >
                  Hablar con un especialista
                </Link>
              </div>
            </div>

            <div className="lg:pl-4">
              <HoldedHeroVisual />
            </div>
          </div>
        </div>
      </section>

      {/* ── Métricas ── */}
      <section className="relative border-y border-slate-200/80 bg-white/80 py-8 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard key={metric.value} {...metric} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Problemas reales ── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <SectionPill icon={AlertCircle}>Problemas que resuelve</SectionPill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.5rem]">
              Si usas Holded, probablemente ya has vivido esto.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              El problema no es no tener datos. Es tardar demasiado en entender qué mirar, qué
              significa y qué conviene hacer ahora.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {pains.map((item) => (
              <PainCard key={item.problem} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Posicionamiento ── */}
      <section className="border-y border-slate-200/80 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_55%,#f6fbff_100%)] py-14 sm:py-18">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <SectionPill icon={Scale}>Más que acceso a Holded</SectionPill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.5rem]">
              Una forma diferente de entender tu contabilidad e impuestos.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              No es solo consultar datos del ERP. Es poder <strong>interpretar tu balance</strong>,
              revisar la cuenta de resultados, leer el diario contable en lenguaje claro, y entender
              qué datos de Holded alimentan tus modelos fiscales trimestrales.
            </p>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Antes de decidir, antes de hablar con el gestor, antes de presentar nada: revisa y
              entiende qué hay detrás de tus números. Sin tecnicismos, sin esperas.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: BookOpen,
                title: 'Contabilidad',
                desc: 'Balance, PyG, diario, cierre trimestral e IS en lenguaje claro.',
              },
              {
                icon: Receipt,
                title: 'Modelos fiscales',
                desc: 'Datos para el 303, 349, 130, 390, 111, 180 y 190 con contexto.',
              },
              {
                icon: FileSearch,
                title: 'Archivos externos',
                desc: 'Contrasta Excel, extractos o documentos con tus datos de Holded.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ff5460]/10">
                  <Icon className="h-4 w-4 text-[#ff5460]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Qué podrás hacer ── */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <SectionPill icon={Sparkles}>Qué podrás hacer</SectionPill>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.4rem]">
                Tus datos en Holded, por fin entendibles.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                No tienes que aprender a usar el ERP. Solo pregunta, y obtén la respuesta que
                necesitas para decidir con más criterio.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  'Menos saltos entre menús, filtros y pantallas.',
                  'Menos dependencia de explicaciones técnicas para entender tus números.',
                  'Más velocidad para detectar cobros, gastos y focos de revisión.',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-[1.35rem] border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-sm leading-6 text-slate-700"
                  >
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#ff5460]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_100%)] p-7 shadow-[0_28px_70px_-52px_rgba(255,84,96,0.45)] sm:p-8">
              <h3 className="text-lg font-bold tracking-tight text-slate-950">
                Consultas que puedes hacer hoy
              </h3>

              <div className="mt-5 space-y-5">
                {useCaseGroups.map((group) => {
                  const Icon = group.icon;
                  return (
                    <div key={group.label}>
                      <div className="mb-2.5 flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-[#ff5460]" />
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {group.label}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {group.items.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-3 text-sm leading-6 text-slate-700"
                          >
                            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-[1.35rem] border border-slate-200 bg-slate-50/70 px-4 py-3.5">
                <FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    También puedes subir archivos
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    Excel, extractos bancarios o documentos externos. ChatGPT los analiza y los
                    contrasta con tus datos de Holded.
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
                >
                  Ver demo
                  <PlayCircle className="h-4 w-4" />
                </Link>
                <Link
                  href="/acceso"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Solicitar acceso anticipado
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Capacidades por área ── */}
      <section id="capacidades" className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <SectionPill icon={FileText}>Capacidades por área</SectionPill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.7rem]">
              Lo que puedes controlar desde hoy.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
              Descripción honesta de qué puedes consultar en cada área y qué te ayuda a decidir.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {featureGroups.map((feature, index) => (
              <FeatureAccordion key={feature.title} feature={feature} defaultOpen={index === 0} />
            ))}
          </div>

          <div className="mt-8 flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-slate-600 shadow-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>
              El alcance cubre facturación, gastos, contabilidad, impuestos, clientes y proyectos.
              La revisión de tesorería está disponible para consultar cuentas y saldos registrados
              en Holded.
            </span>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-100 bg-amber-50/70 px-5 py-4 text-sm leading-6 text-slate-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              La herramienta ayuda a entender, revisar y preparar mejor la información contable y
              fiscal, pero no sustituye la validación profesional cuando corresponda.
            </span>
          </div>
        </div>
      </section>

      {/* ── Para quién encaja ── */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <SectionPill icon={Users}>Para quién encaja</SectionPill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.5rem]">
              No hace falta saber de contabilidad para sacarle partido.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Está pensado para quien trabaja con Holded pero quiere entender mejor sus números, no
              para quien quiere convertirse en experto del ERP.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {roleCards.map((role) => (
              <RolePanel key={role.title} {...role} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Dos plataformas ── */}
      <section className="border-y border-slate-200/80 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <SectionPill icon={Bot}>Dos plataformas, un conector</SectionPill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.5rem]">
              Conecta Holded desde ChatGPT o desde Claude.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              El conector está disponible para las dos principales plataformas de IA. Cada una usa
              su protocolo nativo: GPT Action para ChatGPT, MCP para Claude.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="flex flex-col rounded-[2rem] border border-emerald-200 bg-[linear-gradient(180deg,#f0fdf4_0%,#ffffff_100%)] p-7 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Activo en producción
              </div>
              <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
                Conector Holded para ChatGPT
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Conéctate mediante GPT Action (OpenAI) introduciendo tu API key de Holded.
                Disponible desde ChatGPT Plus y Team.
              </p>
              <ul className="mt-5 space-y-2">
                {[
                  'Facturación, gastos, contactos y proyectos.',
                  'Balance, IVA y contabilidad en lenguaje claro.',
                  'Borradores de factura con tu confirmación.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex gap-3 pt-6">
                <Link
                  href="/acceso"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
                >
                  Conectar con ChatGPT
                </Link>
                <Link
                  href="/docs/chatgpt"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Documentación
                </Link>
              </div>
            </div>

            <div className="flex flex-col rounded-[2rem] border border-amber-200/60 bg-[linear-gradient(180deg,#fffbeb_0%,#ffffff_100%)] p-7 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <Sparkles className="h-3.5 w-3.5" />
                Nuevo — en revisión en el directorio Anthropic
              </div>
              <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
                Conector Holded para Claude
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Conéctate mediante MCP (Model Context Protocol) de Anthropic. Funciona en Claude.ai,
                Claude Desktop y la API de Anthropic.
              </p>
              <ul className="mt-5 space-y-2">
                {[
                  'Las mismas capacidades que en ChatGPT.',
                  'Protocolo MCP nativo — más integrado con Claude.',
                  'OAuth 2.0 estándar, sin guardar API keys en texto.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex gap-3 pt-6">
                <Link
                  href="/claude"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
                >
                  Ver el conector Claude
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Solicitar acceso
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section id="recorrido" className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <SectionPill icon={ShieldCheck}>Cómo funciona</SectionPill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.5rem]">
              Tres pasos, sin configuración técnica.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {journeySteps.map((step) => (
              <article
                key={step.step}
                className="rounded-[1.85rem] border border-slate-200 bg-white p-7 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.4)]"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Paso {step.step}
                </div>
                <h3 className="mt-3 text-lg font-bold tracking-tight text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/acceso"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_-24px_rgba(255,84,96,0.65)] transition hover:bg-[#ef4654]"
            >
              Solicitar acceso anticipado
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ver demo guiada
              <PlayCircle className="h-4 w-4" />
            </Link>
            <Link
              href="/contacto"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Hablar con el equipo
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center">
            <SectionPill icon={ShieldCheck}>FAQ</SectionPill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.5rem]">
              Lo importante, respondido de forma directa.
            </h2>
          </div>

          <div className="mt-10 space-y-3">
            {faqItems.map((item, index) => (
              <details
                key={item.question}
                className="holded-accordion group rounded-[1.5rem] border border-slate-200 bg-white px-6 py-2 shadow-[0_18px_46px_-42px_rgba(15,23,42,0.45)]"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-base font-semibold text-slate-900">
                  {item.question}
                  <span className="holded-accordion-chevron flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </summary>
                <p className="pb-5 text-sm leading-7 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="pb-16 pt-4 sm:pb-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2.25rem] border border-slate-200 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_55%,#f6fbff_100%)] p-8 shadow-[0_32px_85px_-58px_rgba(15,23,42,0.58)] sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <SectionPill icon={Sparkles}>Empieza hoy</SectionPill>
                <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.6rem]">
                  Si Holded ya guarda tus datos, esta es la forma más clara de entenderlos y actuar
                  con criterio.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                  Sin aprender el ERP. Sin esperar al gestor. Con respuestas claras sobre tu
                  contabilidad, tus impuestos y lo que ocurre en tu negocio.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  href="/acceso"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
                >
                  Solicitar acceso anticipado
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/demo-recording"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ver demo grabada
                  <PlayCircle className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
