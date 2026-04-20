import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  FolderKanban,
  KeyRound,
  MessageCircleMore,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import ContactForm from './components/ContactForm';
import DemoLeadForm from './components/DemoLeadForm';
import HoldedHeroVisual from './components/HoldedHeroVisual';
import { buildAuthUrl, buildRegisterUrl } from './lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Holded | Facturas, contactos y contabilidad en claro',
  description:
    'Consulta facturas, contactos, cuentas contables, diario y proyectos de Holded, y prepara borradores de factura con confirmacion.',
};

const problemPoints = [
  'No sabes que factura revisar primero.',
  'Te cuesta entender IVA, gastos y cobros.',
  'Pierdes tiempo saltando entre pantallas.',
  'Necesitas una explicacion clara antes de actuar.',
];

const everydayGoals = [
  'Saber que facturas revisar hoy.',
  'Entender mejor IVA y gastos.',
  'Preparar un borrador sin perder tiempo.',
];

const solutionExamples = [
  'Que facturas deberia revisar hoy para proteger caja?',
  'Ensename los contactos con mas riesgo de cobro.',
  'Explicame el diario de esta semana en lenguaje claro.',
  'Prepara un borrador de factura para este cliente.',
];

const scopeModules = [
  {
    icon: FileText,
    color: 'text-[#ff5460]',
    bg: 'bg-[#ff5460]/10',
    title: 'Facturacion',
    badge: 'Lectura + Borrador',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Acceso completo a facturas emitidas con capacidad de preparar borradores nuevos.',
    capabilities: [
      'Ver facturas emitidas por cliente, fecha o estado',
      'Filtrar vencidas, pendientes de cobro o pagadas',
      'Consultar importes, IVA desglosado y condiciones de pago',
      'Revisar historial completo de facturacion',
      'Preparar borradores de factura nuevos (siempre con tu confirmacion antes de guardar)',
    ],
  },
  {
    icon: BookOpen,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    title: 'Contabilidad',
    badge: 'Solo lectura',
    badgeColor: 'bg-slate-50 text-slate-600 border-slate-200',
    description: 'Acceso al plan contable, diario y movimientos para entender la situacion real.',
    capabilities: [
      'Consultar el plan contable completo',
      'Leer el libro diario y asientos contables',
      'Entender IVA liquidado y pendiente en lenguaje claro',
      'Revisar gastos clasificados por cuenta contable',
      'Analizar saldos y movimientos de caja',
    ],
  },
  {
    icon: Users,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    title: 'Contactos y CRM',
    badge: 'Solo lectura',
    badgeColor: 'bg-slate-50 text-slate-600 border-slate-200',
    description: 'Vista completa de contactos, clientes y oportunidades de venta.',
    capabilities: [
      'Ver contactos y clientes registrados en Holded',
      'Consultar reservas y oportunidades abiertas',
      'Revisar pipeline de ventas y estado por contacto',
      'Identificar contactos con mayor riesgo de cobro',
      'Buscar clientes por nombre, NIF o actividad reciente',
    ],
  },
  {
    icon: FolderKanban,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    title: 'Proyectos y Tareas',
    badge: 'Solo lectura',
    badgeColor: 'bg-slate-50 text-slate-600 border-slate-200',
    description: 'Panorama claro de proyectos activos, tareas y progreso del equipo.',
    capabilities: [
      'Ver todos los proyectos activos y su estado',
      'Consultar tareas pendientes y prioridades',
      'Priorizar trabajo segun fechas y estados',
      'Revisar avance y tiempo registrado por proyecto',
      'Relacionar proyectos con clientes y facturas',
    ],
  },
  {
    icon: Building2,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    title: 'Compras y Gastos',
    badge: 'Solo lectura',
    badgeColor: 'bg-slate-50 text-slate-600 border-slate-200',
    description: 'Vision completa de facturas de proveedor, gastos y pagos pendientes.',
    capabilities: [
      'Ver facturas de proveedor y gastos registrados',
      'Consultar gastos por categoria o cuenta contable',
      'Revisar estado de pagos pendientes a proveedores',
      'Analizar gasto por proveedor o por periodo',
      'Entender IVA soportado y deducible en lenguaje claro',
    ],
  },
  {
    icon: Users,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    title: 'Equipo',
    badge: 'Solo lectura',
    badgeColor: 'bg-slate-50 text-slate-600 border-slate-200',
    description: 'Informacion basica de empleados y estructura del equipo.',
    capabilities: [
      'Ver empleados activos y su informacion basica',
      'Consultar estructura del equipo',
      'Relacionar empleados con proyectos y tareas asignadas',
    ],
  },
  {
    icon: Rocket,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    title: 'Proximamente en Isaak',
    badge: 'Proximamente',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description:
      'Capacidades avanzadas en desarrollo para la proxima version completa del asistente Isaak.',
    capabilities: [
      'Productos e inventario',
      'Adjuntos y documentos escaneados',
      'Conciliacion bancaria',
      'Presupuestos, pedidos y albaranes',
      'Gestion de usuarios y permisos',
      'Envio directo de facturas',
    ],
    isComingSoon: true,
  },
];

const faqItems = [
  {
    question: '¿Que es Holded?',
    answer:
      'Holded es un software de gestion empresarial espanol (ERP) que integra facturacion, contabilidad, CRM, proyectos, inventario y equipo en una sola plataforma en la nube. Es especialmente popular entre autonomos, pymes y agencias que quieren centralizar su operativa sin instalar nada.',
  },
  {
    question: '¿Que necesito para empezar?',
    answer:
      'Tu correo y una API key activa de Holded. Validamos la conexion durante el alta para que no entres a ciegas.',
  },
  {
    question: '¿Tengo que pagar ahora?',
    answer:
      'No, y nunca lo sera para usuarios de ChatGPT. El conector Holded es gratis para siempre como parte del programa de conectores de ChatGPT.',
  },
  {
    question: '¿Que pasa si la API key falla?',
    answer: 'Te lo decimos al momento y puedes pegar otra sin salir del onboarding.',
  },
  {
    question: '¿Que puede hacer ahora mismo?',
    answer:
      'Consultar facturas, contactos, cuentas contables, movimientos del diario, proyectos, compras y tareas, y preparar borradores de factura con confirmacion.',
  },
  {
    question: '¿Puede cambiar mis datos?',
    answer:
      'Solo prepara borradores de factura cuando tu lo confirmas. Todo lo demas es lectura guiada.',
  },
  {
    question: '¿Que no conviene esperar todavia?',
    answer:
      'El conector no incluye productos, usuarios, adjuntos, conciliacion bancaria ni documentos como presupuestos, pedidos o albaranes.',
  },
];

const stats = [
  {
    icon: BarChart3,
    value: '5 módulos',
    label: 'Facturación, contactos, contabilidad, proyectos y equipo',
  },
  { icon: Star, value: '0 €', label: 'Gratis para siempre para usuarios de ChatGPT' },
  { icon: Zap, value: '< 1 min', label: 'Conexion validada al instante con tu API key' },
];

const howItWorks = [
  {
    icon: KeyRound,
    step: '1',
    title: 'Conecta tu API key de Holded',
    description: 'Alta con tu correo, pega la API key y validamos la conexion al momento.',
  },
  {
    icon: MessageCircleMore,
    step: '2',
    title: 'Pregunta lo que necesites',
    description:
      'Consulta facturas, contactos, contabilidad y proyectos en lenguaje natural desde ChatGPT.',
  },
  {
    icon: ShieldCheck,
    step: '3',
    title: 'Tu decides antes de cualquier cambio',
    description:
      'Solo preparamos borradores de factura. Nada se guarda sin tu confirmacion explicita.',
  },
];

export default function HoldedHomePage() {
  return (
    <main className="min-h-screen text-slate-900">
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes pop   { from { opacity:0; transform:scale(0.88); } to { opacity:1; transform:scale(1); } }
        @keyframes float  { 0%,100% { transform:translateY(0) scale(1); } 50% { transform:translateY(-18px) scale(1.04); } }
        @keyframes float2 { 0%,100% { transform:translateY(0) scale(1); } 50% { transform:translateY(14px) scale(0.97); } }
        .anim-fade-up  { animation: fadeUp  0.65s cubic-bezier(.22,.68,0,1.2) both; }
        .anim-fade-in  { animation: fadeIn  0.5s ease both; }
        .anim-pop      { animation: pop     0.55s cubic-bezier(.22,.68,0,1.3) both; }
        .anim-float    { animation: float  7s ease-in-out infinite; }
        .anim-float2   { animation: float2 9s ease-in-out infinite; }
        .d-0  { animation-delay: 0ms; }
        .d-1  { animation-delay: 80ms; }
        .d-2  { animation-delay: 160ms; }
        .d-3  { animation-delay: 240ms; }
        .d-4  { animation-delay: 320ms; }
        .d-5  { animation-delay: 400ms; }
        .d-6  { animation-delay: 480ms; }
        .d-7  { animation-delay: 560ms; }
      `}</style>

      {/* Hero */}
      <section id="solucion" className="py-14 sm:py-18">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#ff5460]" />
                Para usuarios de Holded
              </div>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-[3.4rem] sm:leading-[1.02]">
                Facturas, contactos y contabilidad de Holded en lenguaje claro
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Ya puedes revisar facturas, contactos, cuentas contables, diario y proyectos, y
                preparar borradores de factura con confirmacion sin pelearte con menus ni
                tecnicismos.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={buildRegisterUrl('holded_home_primary')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#ef4654] hover:shadow-xl"
                >
                  Conectar Holded en 1 minuto
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={buildAuthUrl('holded_home_secondary')}
                  className="inline-flex items-center justify-center rounded-xl border border-[#ff5460]/40 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Ya tengo acceso
                </Link>
              </div>

              <div className="mt-8 rounded-3xl border border-[#ff5460]/20 bg-[#ff5460]/5 p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">
                  Gratis para siempre · Empieza en un minuto
                </div>
                <div className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-700">
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5460]" />
                  Solo te hara falta tu correo y una API key activa de Holded. Validamos la conexion
                  al momento. El conector es gratuito para todos los usuarios de ChatGPT, sin fecha
                  de caducidad.
                </div>
              </div>
            </div>

            <HoldedHeroVisual />
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-slate-100 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.value}
                  className={`anim-pop d-${i + 1} flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff5460]/10">
                    <Icon className="h-5 w-5 text-[#ff5460]" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-950">{s.value}</div>
                    <div className="mt-0.5 text-xs leading-5 text-slate-500">{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
              <Zap className="h-3.5 w-3.5 text-[#ff5460]" />
              Como funciona
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              De cero a conectado en menos de un minuto
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {howItWorks.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className={`anim-fade-up d-${i + 1} relative rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff5460] text-sm font-bold text-white">
                      {item.step}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff5460]/10">
                      <Icon className="h-4.5 w-4.5 text-[#ff5460]" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Problema / Solucion */}
      <section id="acceso-libre" className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <article className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_100%)] p-6 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#ff5460]">
                El problema
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Usar Holded no siempre es tan facil como deberia
              </h2>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {problemPoints.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                <div className="text-sm font-semibold text-slate-900">
                  Y al final solo quieres algo simple
                </div>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {everydayGoals.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                La solucion
              </div>
              <h3 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Lo importante ya lo puedes pedir hablando normal
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Lectura clara para el dia a dia y una unica accion de escritura: preparar borradores
                de factura con tu confirmacion.
              </p>
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <MessageCircleMore className="h-4 w-4 text-[#ff5460]" />
                  Preguntas y listo
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                  {solutionExamples.map((item) => (
                    <li
                      key={item}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href={buildRegisterUrl('holded_home_card_register')}
                  className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
                >
                  Conectar Holded en 1 minuto
                </Link>
                <Link
                  href={buildAuthUrl('holded_home_card_login')}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Iniciar sesion
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Capacidades detalladas por modulo */}
      <section id="capacidades" className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
              <Zap className="h-3.5 w-3.5 text-[#ff5460]" />
              Capacidades del conector
            </div>
            <h2 className="mt-5 text-4xl font-bold tracking-tight text-slate-950">
              Todo lo que puedes hacer hoy con tu Holded
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              El conector accede a la API oficial de Holded. Estas son las capacidades reales
              disponibles desde ChatGPT, modulo a modulo.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {scopeModules.map((module, i) => {
              const Icon = module.icon;
              const isComingSoon = 'isComingSoon' in module && module.isComingSoon;
              return (
                <article
                  key={module.title}
                  className={`anim-fade-up d-${Math.min(i, 7)} rounded-[1.75rem] border p-6 shadow-sm ${
                    isComingSoon
                      ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-white'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl ${module.bg}`}
                    >
                      <Icon className={`h-5 w-5 ${module.color}`} />
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${module.badgeColor}`}
                    >
                      {isComingSoon && <Clock className="h-3 w-3" />}
                      {module.badge}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-950">{module.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{module.description}</p>

                  <ul className="mt-4 space-y-2">
                    {module.capabilities.map((cap) => (
                      <li key={cap} className="flex items-start gap-2 text-sm text-slate-700">
                        {isComingSoon ? (
                          <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                        ) : (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        )}
                        {cap}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-[#ff5460]" />
                  Conexion directa con la API oficial de Holded
                </div>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  El conector usa tu API key de Holded directamente. Ningun dato pasa por servidores
                  de terceros sin tu control. Puedes desconectar en cualquier momento.
                </p>
              </div>
              <Link
                href={buildRegisterUrl('holded_capacidades_cta')}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
              >
                Empezar gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <style>{`
        details summary { list-style:none; cursor:pointer; }
        details summary::-webkit-details-marker { display:none; }
        details[open] .faq-chevron { transform:rotate(180deg); }
        .faq-chevron { transition: transform 0.25s ease; display:inline-block; }
      `}</style>
      <section id="faq" className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">Preguntas rapidas</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Todo lo necesario para empezar sin perder tiempo.
            </p>
          </div>

          <div className="mx-auto max-w-3xl space-y-3">
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-slate-200 bg-slate-50 px-6 py-1"
              >
                <summary className="flex items-center justify-between gap-4 py-4 text-base font-semibold text-slate-900">
                  {item.question}
                  <span className="faq-chevron text-slate-400">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M4 6l4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </summary>
                <p className="pb-5 text-sm leading-7 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Demo gratuita — sin Holded */}
      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white px-8 py-10 shadow-sm sm:px-10">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                  <Sparkles className="h-3.5 w-3.5 text-[#ff5460]" />
                  Prueba gratuita personalizada
                </div>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                  Pruébalo con datos reales de tu empresa
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Rellena el formulario y nuestro equipo prepara un entorno real con tus datos de
                  Holded. Te hacemos una demostración en directo para que veas exactamente lo que
                  puede hacer por tu empresa — sin instalar nada, sin compromiso.
                </p>
                <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                  {[
                    'Activamos un entorno real con tus datos',
                    'Demostración en directo con nuestro equipo',
                    'Sin tarjeta de crédito ni compromiso',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <DemoLeadForm />
            </div>
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2rem] border border-[#ff5460]/15 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_60%,#f8fafc_100%)] px-8 py-10 shadow-[0_32px_90px_-48px_rgba(255,84,96,0.3)] sm:px-10">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#ff5460]">
                  <MessageCircleMore className="h-3.5 w-3.5" />
                  Contacto y soporte
                </div>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                  ¿Tienes alguna duda?
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Escríbenos y te respondemos en menos de 24 horas en días laborables.
                </p>

                <div className="mt-6 space-y-3">
                  <a
                    href="mailto:info@verifactu.business"
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-[#ff5460]/30 hover:text-[#ff5460]"
                  >
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-[#ff5460]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    info@verifactu.business
                  </a>
                  <a
                    href="https://wa.me/34696550480"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-green-300 hover:text-green-700"
                  >
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    +34 696 55 04 80
                  </a>
                </div>
              </div>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
