import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  FolderKanban,
  KeyRound,
  LifeBuoy,
  MessageCircleMore,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import HoldedHeroVisual from './components/HoldedHeroVisual';
import { buildAuthUrl, buildRegisterUrl } from './lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Holded | Tu operativa financiera, por fin clara',
  description:
    'Conecta Holded a ChatGPT para leer facturas, contabilidad, CRM, proyectos y gastos en lenguaje claro, y preparar borradores de factura con confirmacion.',
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

const trustHighlights = [
  'Facturacion, contabilidad, CRM, proyectos, compras y equipo en un mismo flujo conversacional.',
  'La unica accion de escritura publica es preparar borradores de factura, siempre con confirmacion.',
  'Onboarding guiado, validacion real de API key y entrada directa al panel.',
];

const metrics = [
  {
    icon: Zap,
    value: '< 1 min',
    label: 'Validacion real de la conexion con tu API key de Holded.',
  },
  {
    icon: BarChart3,
    value: '6 bloques',
    label: 'Facturacion, contabilidad, CRM, proyectos, compras y equipo.',
  },
  {
    icon: ShieldCheck,
    value: '1 accion',
    label: 'Solo se escribe para dejar borradores de factura y siempre con tu confirmacion.',
  },
  {
    icon: Sparkles,
    value: '0 EUR',
    label: 'Acceso gratuito para usuarios de ChatGPT.',
  },
];

const valueCards = [
  {
    title: 'Priorizar antes de abrir diez pantallas',
    body: 'Ves primero lo urgente: facturas vencidas, clientes con riesgo, gastos raros o proyectos que necesitan foco.',
  },
  {
    title: 'Entender el dato sin traducirlo',
    body: 'La respuesta llega en lenguaje claro, con contexto operativo y sin obligarte a leer el ERP como un tecnico.',
  },
  {
    title: 'Pasar de consulta a accion controlada',
    body: 'Cuando conviene emitir, el sistema puede dejarte un borrador preparado para que solo revises y confirmes.',
  },
];

const featureGroups: FeatureGroup[] = [
  {
    title: 'Facturacion',
    badge: 'Lectura + borrador',
    badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: FileText,
    summary:
      'Consulta lo emitido, detecta cobros en riesgo y prepara nuevos borradores sin salir del flujo.',
    outcome: 'Ideal para saber que revisar hoy y reducir tiempo entre decision y emision.',
    capabilities: [
      'Ver facturas emitidas por cliente, fecha, estado o importe.',
      'Detectar vencidas, pendientes de cobro y anomalas de seguimiento.',
      'Explicar una factura concreta con IVA, vencimiento y contexto de cliente.',
      'Preparar borradores de factura nuevos con confirmacion explicita antes de guardar.',
    ],
  },
  {
    title: 'Contabilidad',
    badge: 'Solo lectura',
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: BookOpen,
    summary:
      'Leer diario, cuentas contables y movimientos para convertir asientos en criterio de negocio.',
    outcome: 'Pensado para direccion, finanzas y despachos que necesitan contexto sin tecnicismos.',
    capabilities: [
      'Consultar plan contable, libro diario y movimientos registrados.',
      'Explicar IVA repercutido, soportado y saldos en lenguaje normal.',
      'Ayudar a leer gastos, cuentas y tendencias desde lo ya contabilizado.',
    ],
  },
  {
    title: 'Contactos y CRM',
    badge: 'Solo lectura',
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: Users,
    summary:
      'Cruza clientes, actividad comercial y facturacion para decidir a quien llamar o revisar primero.',
    outcome: 'Muy util para comercial, administracion y seguimiento de cobros.',
    capabilities: [
      'Ver clientes y contactos por nombre, NIF o actividad reciente.',
      'Identificar cuentas con mas riesgo de cobro o seguimiento.',
      'Relacionar contactos con oportunidades y facturas pendientes.',
    ],
  },
  {
    title: 'Proyectos y tareas',
    badge: 'Solo lectura',
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: FolderKanban,
    summary:
      'Leer carga operativa, tareas pendientes y proyectos activos con una vista priorizada.',
    outcome: 'Sirve para coordinar operaciones sin perder contexto financiero.',
    capabilities: [
      'Ver proyectos activos, estado, tareas y prioridades.',
      'Cruzar proyectos con clientes y facturacion.',
      'Detectar bloqueos y trabajo en curso con mas contexto.',
    ],
  },
  {
    title: 'Compras y gastos',
    badge: 'Solo lectura',
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: Building2,
    summary: 'Revisa proveedores, gastos e IVA soportado para entender donde se va el margen.',
    outcome: 'Ayuda a controlar gasto, pagos pendientes y estructura de proveedores.',
    capabilities: [
      'Consultar facturas de proveedor y gastos por categoria o cuenta.',
      'Revisar pagos pendientes y analizar gasto por periodo o proveedor.',
      'Traducir IVA soportado y deducible a una lectura mas accionable.',
    ],
  },
  {
    title: 'Equipo',
    badge: 'Solo lectura',
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: Users,
    summary: 'Contexto basico de empleados y estructura para entender quien esta donde.',
    outcome: 'Aporta continuidad cuando se cruza operativa con proyectos y responsables.',
    capabilities: [
      'Ver empleados activos y datos basicos disponibles.',
      'Relacionar personas con proyectos y tareas asignadas.',
      'Aclarar la estructura minima del equipo desde Holded.',
    ],
  },
];

const roleCards: RoleCard[] = [
  {
    title: 'Direccion y gerencia',
    body: 'Para quien necesita una lectura rapida de ventas, cobros, caja y foco semanal sin depender siempre de una exportacion.',
    bullets: [
      'Que facturas deberia revisar hoy.',
      'Que clientes concentran mas riesgo.',
      'Como va el trimestre sin leer un informe tecnico.',
    ],
  },
  {
    title: 'Finanzas y administracion',
    body: 'Reduce tiempo de consulta y da una interfaz mas usable para resolver dudas operativas con el dato de Holded.',
    bullets: [
      'Aclarar IVA y diario en lenguaje normal.',
      'Revisar gastos y pagos pendientes.',
      'Preparar borradores sin rehacer el contexto.',
    ],
  },
  {
    title: 'Despachos y soporte al cliente',
    body: 'Sirve como capa de lectura y priorizacion para explicar el dato a negocio de forma mas clara y util.',
    bullets: [
      'Traducir contabilidad a lenguaje comprensible.',
      'Detectar puntos de revision antes de cierre.',
      'Acelerar conversaciones de valor con el cliente.',
    ],
  },
];

const journeySteps = [
  {
    step: '01',
    title: 'Activas acceso y validas la API key',
    body: 'El alta ocurre en el flujo de onboarding, no dentro de la home. Asi la landing vende, y el onboarding convierte.',
  },
  {
    step: '02',
    title: 'Entras con tu contexto real',
    body: 'Una vez conectada la cuenta, ya puedes preguntar sobre facturas, clientes, gastos, diario o proyectos.',
  },
  {
    step: '03',
    title: 'Decides con mas claridad',
    body: 'Primero lectura y criterio. Solo cuando conviene actuar, se propone preparar un borrador con confirmacion.',
  },
];

const faqItems = [
  {
    question: 'Que necesito para empezar?',
    answer:
      'Tu correo y una API key activa de Holded. Durante el flujo validamos la conexion para que no entres a ciegas.',
  },
  {
    question: 'Puede cambiar datos dentro de Holded?',
    answer:
      'La capacidad publica actual se centra en lectura y explicacion. La unica accion de escritura disponible es dejar borradores de factura y siempre requiere confirmacion explicita.',
  },
  {
    question: 'Esto sustituye a Holded?',
    answer:
      'No. Holded sigue siendo el sistema origen. Esta capa esta pensada para leer mejor, priorizar mejor y trabajar mas rapido sobre tus datos reales.',
  },
  {
    question: 'Que modulos no forman parte todavia del alcance?',
    answer:
      'Hoy no incluye productos, usuarios, adjuntos, conciliacion bancaria ni documentos como presupuestos, pedidos o albaranes.',
  },
  {
    question: 'Puedo ver primero una demo o hablar con alguien?',
    answer:
      'Si. La landing deriva a paginas especificas de demo y contacto para no meter formularios largos dentro de la home.',
  },
  {
    question: 'Cuanto cuesta ahora mismo?',
    answer:
      'La experiencia publica actual se presenta como acceso gratuito para usuarios de ChatGPT, con onboarding y conexion guiada.',
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

      <div className="mt-6 grid gap-5 border-t border-slate-100 pt-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="text-sm font-semibold text-slate-900">Incluye hoy</div>
          <ul className="mt-4 space-y-3">
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
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
          <div className="text-sm font-semibold text-slate-900">Valor que aporta</div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{feature.outcome}</p>
          <Link
            href="/capacidades"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#ff5460] transition hover:text-[#ef4654]"
          >
            Ver capacidad real completa
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
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

              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-[-0.04em] text-slate-950 sm:text-[3.75rem] sm:leading-[0.98]">
                Tu Holded, por fin claro, accionable y listo para decidir.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Consulta facturas, clientes, contabilidad, proyectos y gastos en lenguaje claro.
                Detecta prioridades, explica el negocio sin tecnicismos y deja borradores de factura
                listos para validar cuando toca actuar.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={buildRegisterUrl('holded_home_primary')}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_-24px_rgba(255,84,96,0.75)] transition hover:bg-[#ef4654] hover:shadow-[0_22px_55px_-22px_rgba(255,84,96,0.78)]"
                >
                  Conectar Holded ahora
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white/85 px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-white"
                >
                  Solicitar demo guiada
                  <PlayCircle className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {trustHighlights.map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.5rem] border border-white/70 bg-white/75 p-4 text-sm leading-6 text-slate-700 shadow-sm backdrop-blur"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[1.9rem] border border-[#ff5460]/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,84,96,0.08))] p-6 shadow-[0_28px_70px_-48px_rgba(255,84,96,0.55)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <KeyRound className="h-4 w-4 text-[#ff5460]" />
                      Gratis para usuarios de ChatGPT
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      Solo necesitas tu correo y una API key activa de Holded. Si prefieres ver el
                      flujo antes de entrar, puedes ir a la demo o hablar con el equipo.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      href={buildAuthUrl('holded_home_existing_user')}
                      className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Ya tengo acceso
                    </Link>
                    <Link
                      href="/contacto"
                      className="inline-flex items-center justify-center rounded-full border border-[#ff5460]/25 bg-[#ff5460]/10 px-5 py-3 text-sm font-semibold text-[#d83f4f] transition hover:bg-[#ff5460]/15"
                    >
                      Hablar con un especialista
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:pl-4">
              <HoldedHeroVisual />
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-slate-200/80 bg-white/80 py-8 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard key={metric.value} {...metric} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_100%)] p-7 shadow-[0_28px_70px_-52px_rgba(255,84,96,0.5)] sm:p-8">
              <SectionPill icon={MessageCircleMore}>Por que esta landing existe</SectionPill>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.4rem]">
                Holded ya tiene el dato. Lo que faltaba era una capa de lectura y decision.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                El problema no suele ser tener informacion. El problema es tardar demasiado en
                entender que mirar, que significa y que conviene hacer ahora. Esta experiencia esta
                pensada para resolver justo eso.
              </p>

              <div className="mt-7 space-y-3">
                {[
                  'Menos saltos entre menus, filtros y pantallas.',
                  'Menos dependencia de explicar contabilidad con lenguaje tecnico.',
                  'Mas velocidad para detectar cobros, gastos o focos de revision.',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-[1.35rem] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-700"
                  >
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#ff5460]" />
                    {item}
                  </div>
                ))}
              </div>
            </article>

            <div className="grid gap-5 md:grid-cols-3">
              {valueCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.48)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
                    <Sparkles className="h-5 w-5 text-[#ff5460]" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold tracking-tight text-slate-950">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="capacidades" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <SectionPill icon={Zap}>Capacidades en desplegables</SectionPill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.7rem]">
              Lo que puedes hacer hoy, sin inflar el alcance.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
              La landing resume el valor. Aqui lo abrimos por bloques para que veas con honestidad
              que entra ya en el conector y que tipo de utilidad genera en negocio.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {featureGroups.map((feature, index) => (
              <FeatureAccordion key={feature.title} feature={feature} defaultOpen={index === 0} />
            ))}
          </div>

          <div className="mt-8 rounded-[1.9rem] border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <Clock3 className="h-4 w-4" />
              Alcance actual, sin maquillaje
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-amber-900">
              Hoy no incluye productos, usuarios, adjuntos, conciliacion bancaria ni documentos como
              presupuestos, pedidos o albaranes. Esa claridad comercial importa porque evita vender
              algo distinto de lo que el usuario recibe.
            </p>
          </div>
        </div>
      </section>

      <section id="recorrido" className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#081936_0%,#102a58_100%)] p-8 text-white shadow-[0_32px_80px_-52px_rgba(8,25,54,0.85)] sm:p-10">
              <SectionPill icon={ShieldCheck}>Recorrido de conversion</SectionPill>
              <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-[2.6rem]">
                La home inspira. El formulario vive donde debe vivir.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/80">
                Para no romper el ritmo de la landing, la captacion se deriva a paginas especificas
                de demo y contacto. Y cuando alguien quiere conectar de verdad, salta al onboarding
                guiado con un flujo mucho mas limpio.
              </p>

              <div className="mt-8 grid gap-4">
                {journeySteps.map((step) => (
                  <article
                    key={step.step}
                    className="rounded-[1.6rem] border border-white/12 bg-white/8 p-5 backdrop-blur"
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                      Paso {step.step}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/75">{step.body}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <article className="rounded-[1.9rem] border border-slate-200 bg-white p-7 shadow-[0_22px_55px_-45px_rgba(15,23,42,0.55)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <PlayCircle className="h-4 w-4 text-[#ff5460]" />
                  Demo guiada
                </div>
                <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
                  Ensena el caso real sin meter un formulario en mitad del scroll.
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Pagina dedicada para quien necesita ver el encaje antes de conectar. Mejor para
                  conversion asistida y mejor para mantener la home enfocada.
                </p>
                <Link
                  href="/demo"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#ff5460] transition hover:text-[#ef4654]"
                >
                  Ir a la demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>

              <article className="rounded-[1.9rem] border border-slate-200 bg-white p-7 shadow-[0_22px_55px_-45px_rgba(15,23,42,0.55)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <LifeBuoy className="h-4 w-4 text-[#ff5460]" />
                  Contacto comercial o soporte
                </div>
                <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
                  Una via directa para resolver dudas, activar cuenta o destrabar un onboarding.
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Tambien con pagina propia. Menos ruido en la home y una experiencia mas seria para
                  quien quiere hablar con alguien.
                </p>
                <Link
                  href="/contacto"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#ff5460] transition hover:text-[#ef4654]"
                >
                  Ir a contacto
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>

              <article className="rounded-[1.9rem] border border-[#ff5460]/20 bg-[#ff5460]/5 p-7 shadow-[0_22px_55px_-45px_rgba(255,84,96,0.45)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <KeyRound className="h-4 w-4 text-[#ff5460]" />
                  Conversion directa
                </div>
                <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
                  Si ya lo tienes claro, entra directo al onboarding.
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  El flujo ya esta preparado para alta, verificacion, validacion de API key y
                  entrada al panel.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={buildRegisterUrl('holded_home_onboarding_card')}
                    className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
                  >
                    Empezar gratis
                  </Link>
                  <Link
                    href={buildAuthUrl('holded_home_onboarding_existing')}
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Ya tengo acceso
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <SectionPill icon={Users}>Para quien encaja mejor</SectionPill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.5rem]">
              No es solo una integracion. Es una forma mejor de trabajar el dato que ya tienes.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Cuando la informacion esta dentro de Holded pero el trabajo real consiste en
              interpretarla, priorizarla y explicarla, esta capa gana mucho valor.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {roleCards.map((role) => (
              <RolePanel key={role.title} {...role} />
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center">
            <SectionPill icon={ShieldCheck}>FAQ</SectionPill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.5rem]">
              Lo importante, respondido de forma directa.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Sin letra pequena y sin esconder el alcance real.
            </p>
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

      <section className="pb-16 pt-4 sm:pb-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2.25rem] border border-slate-200 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_55%,#f6fbff_100%)] p-8 shadow-[0_32px_85px_-58px_rgba(15,23,42,0.58)] sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <SectionPill icon={Sparkles}>Cierre</SectionPill>
                <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.6rem]">
                  Si Holded ya es tu sistema, esta es la capa que te faltaba para usarlo mejor.
                </h2>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                  Puedes entrar directo al onboarding, pedir una demo guiada o hablar con el equipo.
                  La diferencia real no esta en conectar por conectar, sino en lo rapido que
                  empiezas a entender mejor tu operativa.
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
