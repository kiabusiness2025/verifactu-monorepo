import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Files,
  FolderKanban,
  MessageCircleMore,
  Package,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import HoldedHeroVisual from './components/HoldedHeroVisual';
import { buildAuthUrl, buildRegisterUrl } from './lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Holded | Controla tu facturación y contabilidad sin complicarte',
  description:
    'Consulta facturas, IVA, gastos, clientes, productos y documentos desde Holded en lenguaje claro. Detecta qué revisar hoy, qué cobrar antes y qué hablar con tu gestor.',
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
      'Transforma los registros de tu cuenta en respuestas útiles con contexto y criterio de negocio.',
    icon: BarChart3,
  },
];

const useCases = [
  'Ver qué facturas deberías revisar hoy',
  'Detectar cobros pendientes y clientes con riesgo',
  'Entender el IVA del trimestre sin tecnicismos',
  'Revisar gastos por proveedor o periodo',
  'Consultar productos, precios y catálogo',
  'Localizar presupuestos, pedidos o albaranes',
  'Preparar borradores de factura con tu confirmación',
  'Llegar a la reunión con tu gestor sabiendo qué preguntar',
];

const metrics = [
  {
    icon: ShieldCheck,
    value: 'Sin cambios',
    label: 'No modifica tu cuenta de Holded. Solo genera borradores con tu confirmación explícita.',
  },
  {
    icon: BarChart3,
    value: '8 áreas',
    label: 'Facturación, contabilidad, cobros, productos, documentos y más.',
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
    summary: 'Lee diario, cuentas y movimientos para convertir asientos en criterio de negocio.',
    outcome: 'Pensado para dirección y finanzas que necesitan contexto sin tecnicismos.',
    capabilities: [
      'Consultar plan contable, libro diario y movimientos registrados.',
      'Entender IVA repercutido, soportado y saldos en lenguaje normal.',
      'Leer gastos, cuentas y tendencias desde lo ya contabilizado.',
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
    title: 'Productos',
    badge: 'Solo consulta',
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: Package,
    summary:
      'Consulta el catálogo de productos, referencias, precios y datos registrados en Holded.',
    outcome:
      'Útil para localizar productos, confirmar precios y relacionar catálogo con pedidos o facturas.',
    capabilities: [
      'Ver productos y referencias con precio, descripción y categoría.',
      'Localizar un producto concreto y consultar sus datos registrados.',
      'Relacionar productos con facturas, pedidos y documentos comerciales.',
    ],
  },
  {
    title: 'Documentos',
    badge: 'Solo consulta',
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: Files,
    summary:
      'Consulta presupuestos, pedidos y albaranes registrados en Holded con contexto de cliente y estado.',
    outcome:
      'Ideal para localizar documentos comerciales, revisar pendientes y preparar seguimiento.',
    capabilities: [
      'Ver presupuestos emitidos con estado, importe y cliente.',
      'Consultar pedidos y albaranes por fecha, referencia o cliente.',
      'Detectar presupuestos sin respuesta y documentos con seguimiento pendiente.',
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
  {
    title: 'Equipo',
    badge: 'Solo consulta',
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: Users,
    summary: 'Contexto básico de empleados y estructura para entender quién está dónde.',
    outcome: 'Aporta continuidad cuando se cruza operativa con proyectos y responsables.',
    capabilities: [
      'Ver empleados activos y datos básicos disponibles.',
      'Relacionar personas con proyectos y tareas asignadas.',
      'Entender la estructura mínima del equipo desde Holded.',
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
    body: 'Pregunta sobre facturas, clientes, IVA, gastos, productos o documentos y obtén respuestas directas con contexto de negocio.',
  },
  {
    step: '03',
    title: 'Revisas antes de actuar',
    body: 'Si necesitas preparar una factura, el sistema te muestra el borrador para que lo revises y confirmes antes de guardar nada.',
  },
];

const faqItems = [
  {
    question: '¿Qué necesito para empezar?',
    answer:
      'Tu correo y una API key de Holded. El proceso de alta es guiado y valida la conexión antes de que entres.',
  },
  {
    question: '¿Puede modificar datos en mi cuenta de Holded?',
    answer:
      'No realiza cambios en tu cuenta de Holded. El único cambio posible es generar borradores de facturas emitidas, y siempre con tu confirmación explícita antes de crear nada.',
  },
  {
    question: '¿Puedo consultar productos, presupuestos y documentos?',
    answer:
      'Sí. El conector soporta productos, presupuestos, pedidos, albaranes y otros documentos comerciales disponibles en la API oficial de Holded. Puedes consultar, localizar y relacionarlos con clientes y facturas.',
  },
  {
    question: '¿Se pueden usar archivos o adjuntos?',
    answer:
      'Los adjuntos están soportados en la API de Holded. Además, ChatGPT permite trabajar con archivos cargados directamente en el chat. La disponibilidad concreta puede depender del plan de ChatGPT y del entorno de uso.',
  },
  {
    question: '¿Incluye tesorería y consulta bancaria?',
    answer:
      'Sí. El conector incluye acceso conversacional a Tesorería para consultar cuentas y revisar información financiera disponible en Holded. El matching o conciliación automática de movimientos bancarios no está validado y no forma parte del alcance comunicado.',
  },
  {
    question: '¿Esto sustituye a Holded?',
    answer:
      'No. Holded sigue siendo el sistema origen. Esta herramienta está pensada para entender mejor los datos que ya tienes allí, no para reemplazarlo.',
  },
  {
    question: '¿Puedo ver primero una demo?',
    answer:
      'Sí. Puedes solicitar una demo guiada o contactar con el equipo antes de conectar tu cuenta.',
  },
  {
    question: '¿Cuánto cuesta?',
    answer:
      'El acceso es gratuito para usuarios de ChatGPT, con onboarding y conexión guiada incluidos.',
  },
];

const scopeAvailable = [
  'Facturas emitidas y recibidas',
  'Contactos y clientes',
  'Productos y catálogo',
  'Presupuestos',
  'Pedidos y albaranes',
  'Empleados y equipo',
  'Adjuntos',
  'Contabilidad y diario',
  'Tesorería (cuentas y saldos)',
];

const scopeChatGPT = [
  'Carga y lectura de archivos en el chat',
  'Documentos e imágenes en conversación',
  'Interacción por voz (según plan)',
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

export default function HoldedHomePage() {
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
                Consulta en lenguaje claro tus facturas, IVA, gastos, clientes, productos y
                documentos desde Holded. Detecta qué revisar hoy, qué cobrar antes y qué hablar con
                tu gestor.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_-24px_rgba(255,84,96,0.75)] transition hover:bg-[#ef4654] hover:shadow-[0_22px_55px_-22px_rgba(255,84,96,0.78)]"
                >
                  Ver demo
                  <PlayCircle className="h-4 w-4" />
                </Link>

                <Link
                  href={buildRegisterUrl('holded_home_hero_secondary')}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white/85 px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-white"
                >
                  Conectar Holded
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

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
              <ul className="mt-5 space-y-3">
                {useCases.map((useCase) => (
                  <li
                    key={useCase}
                    className="flex items-start gap-3 text-sm leading-6 text-slate-700"
                  >
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                    {useCase}
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
                >
                  Ver demo
                  <PlayCircle className="h-4 w-4" />
                </Link>
                <Link
                  href={buildRegisterUrl('holded_home_usecases')}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Conectar Holded
                  <ArrowRight className="h-4 w-4" />
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
              Ocho áreas con descripción honesta de qué puedes consultar y qué te ayuda a decidir.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {featureGroups.map((feature, index) => (
              <FeatureAccordion key={feature.title} feature={feature} defaultOpen={index === 0} />
            ))}
          </div>

          {/* ── Alcance y compatibilidad ── */}
          <div className="mt-10">
            <div className="max-w-xl">
              <h3 className="text-xl font-bold tracking-tight text-slate-950">
                Alcance y compatibilidad
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Una vista clara de lo que está disponible, lo que es compatible con ChatGPT y lo que
                está pendiente de validación.
              </p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {/* A: Ya disponible */}
              <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  Disponible en API Holded
                </div>
                <ul className="mt-4 space-y-2">
                  {scopeAvailable.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-emerald-900">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* B: Compatible con ChatGPT */}
              <div className="rounded-[1.75rem] border border-sky-200 bg-sky-50 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-sky-800">
                  <Sparkles className="h-4 w-4" />
                  Compatible con ChatGPT
                </div>
                <ul className="mt-4 space-y-2">
                  {scopeChatGPT.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-sky-900">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs leading-5 text-sky-700">
                  Puede variar según el plan de ChatGPT y el entorno de uso.
                </p>
              </div>

              {/* C: Con matiz */}
              <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <Clock3 className="h-4 w-4" />
                  Con matiz
                </div>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-start gap-2 text-sm text-amber-900">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    Matching automático de movimientos bancarios
                  </li>
                </ul>
                <p className="mt-4 text-xs leading-5 text-amber-700">
                  La consulta de tesorería está disponible. El matching o conciliación automática de
                  movimientos no está validado y no se comunica como parte del alcance operativo.
                </p>
              </div>
            </div>
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
              href={buildRegisterUrl('holded_home_journey_primary')}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_-24px_rgba(255,84,96,0.65)] transition hover:bg-[#ef4654]"
            >
              Empezar gratis
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
                  Sin aprender el ERP. Sin esperar al gestor. Con respuestas claras y control sobre
                  lo que ocurre en tu negocio.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  href={buildRegisterUrl('holded_home_final_primary')}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
                >
                  Conectar Holded
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
