import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  FileText,
  FolderKanban,
  KeyRound,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
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
    icon: XCircle,
    color: 'text-slate-400',
    bg: 'bg-slate-100',
    title: 'Fuera de scope',
    badge: 'No incluido',
    badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
    description: 'Estas areas quedan fuera del conector en esta version.',
    capabilities: [
      'Productos e inventario',
      'Adjuntos y documentos escaneados',
      'Conciliacion bancaria',
      'Presupuestos, pedidos y albaranes',
      'Gestion de usuarios y permisos',
      'Envio directo de facturas (solo borradores)',
    ],
    isLimitation: true,
  },
];

const faqItems = [
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
      'Consultar facturas, contactos, cuentas contables, movimientos del diario, proyectos y tareas, y preparar borradores de factura con confirmacion.',
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

export default function HoldedHomePage() {
  return (
    <main className="min-h-screen text-slate-900">
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
            {scopeModules.map((module) => {
              const Icon = module.icon;
              return (
                <article
                  key={module.title}
                  className={`rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm ${module.isLimitation ? 'opacity-75' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl ${module.bg}`}
                    >
                      <Icon className={`h-5 w-5 ${module.color}`} />
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${module.badgeColor}`}
                    >
                      {module.badge}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-950">{module.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{module.description}</p>

                  <ul className="mt-4 space-y-2">
                    {module.capabilities.map((cap) => (
                      <li key={cap} className="flex items-start gap-2 text-sm text-slate-700">
                        {module.isLimitation ? (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
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
      <section id="faq" className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">Preguntas rapidas</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Todo lo necesario para empezar sin perder tiempo.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {faqItems.map((item) => (
              <article
                key={item.question}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
              >
                <h3 className="text-base font-semibold text-slate-900">{item.question}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
