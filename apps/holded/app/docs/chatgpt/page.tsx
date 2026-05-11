import {
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  FileText,
  FolderKanban,
  Key,
  MessageSquare,
  Package,
  PlugZap,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentación Conector ChatGPT — Holded | verifactu.business',
  description:
    'Guía completa para conectar tu cuenta de Holded con ChatGPT. Requisitos, pasos de configuración, herramientas disponibles y solución de problemas.',
};

const modules = [
  {
    icon: Receipt,
    label: 'Facturación',
    color: 'text-[#ff5460]',
    bg: 'bg-[#ff5460]/8',
    tools: ['holded_list_invoices', 'holded_get_invoice', 'holded_create_invoice_draft'],
    desc: 'Lista facturas, consulta detalles y crea borradores sin modificar datos reales.',
  },
  {
    icon: Users,
    label: 'Contactos / CRM',
    color: 'text-violet-500',
    bg: 'bg-violet-50',
    tools: [
      'holded_list_contacts',
      'holded_get_contact',
      'holded_list_bookings',
      'holded_list_crm_funnels',
      'holded_list_leads',
    ],
    desc: 'Clientes, proveedores, embudos de venta y leads.',
  },
  {
    icon: Package,
    label: 'Productos',
    color: 'text-sky-500',
    bg: 'bg-sky-50',
    tools: ['holded_list_products', 'holded_get_product', 'holded_list_warehouses'],
    desc: 'Catálogo de productos, precios y almacenes.',
  },
  {
    icon: FolderKanban,
    label: 'Proyectos',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    tools: [
      'holded_list_projects',
      'holded_get_project',
      'holded_list_project_tasks',
      'holded_list_time_records',
    ],
    desc: 'Estado de proyectos, tareas y registros de tiempo.',
  },
  {
    icon: BookOpen,
    label: 'Contabilidad',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    tools: ['holded_list_accounts', 'holded_list_daily_ledger'],
    desc: 'Plan de cuentas, libro diario y libro mayor.',
  },
  {
    icon: Building2,
    label: 'Equipo',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
    tools: ['holded_list_employees', 'holded_get_employee'],
    desc: 'Lista de empleados y datos por persona.',
  },
  {
    icon: Wallet,
    label: 'Tesorería',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    tools: ['holded_list_treasury_accounts'],
    desc: 'Cuentas bancarias y saldos.',
  },
];

const steps = [
  {
    n: '1',
    title: 'Obtén tu API key de Holded',
    body: (
      <>
        Ve a{' '}
        <strong className="text-slate-800">Holded → Configuración → Integraciones → API</strong> y
        genera una nueva API key. Cópiala: la necesitarás en el paso 3.
      </>
    ),
  },
  {
    n: '2',
    title: 'Abre el Conector en ChatGPT',
    body: (
      <>
        Visita{' '}
        <Link href="/acceso" className="font-semibold text-[#ff5460] underline underline-offset-4">
          holded.verifactu.business/acceso
        </Link>{' '}
        o abre ChatGPT y busca el conector «Holded» en la sección de Conectores del panel lateral.
      </>
    ),
  },
  {
    n: '3',
    title: 'Introduce tu API key y autoriza',
    body: (
      <>
        En la pantalla de autorización OAuth introduce tu API key de Holded. El conector verificará
        el acceso y generará un token seguro — tu API key nunca se envía a OpenAI.
      </>
    ),
  },
  {
    n: '4',
    title: 'Empieza a preguntar',
    body: (
      <>
        Una vez conectado, escribe en el chat cualquier pregunta sobre tu negocio:{' '}
        <em>«¿Cuánto he facturado este mes?»</em>,{' '}
        <em>«Lista los contactos con pagos pendientes»</em> o{' '}
        <em>«Prepara una factura borrador para Acme S.L.»</em>
      </>
    ),
  },
];

const faqs = [
  {
    q: '¿Necesito ChatGPT Plus o Team?',
    a: 'Sí. Los conectores (Actions / GPTs personalizados con OAuth) solo están disponibles en los planes de pago de ChatGPT. No funciona en el plan gratuito.',
  },
  {
    q: '¿El conector puede modificar mis datos de Holded?',
    a: 'Solo puede crear borradores de facturas, que requieren confirmación explícita antes de guardarse. El resto de operaciones son de solo lectura.',
  },
  {
    q: '¿Dónde se almacena mi API key?',
    a: 'Tu API key se cifra y se almacena en nuestra base de datos segura. Nunca se envía a OpenAI ni a terceros. Puedes revocar el acceso en cualquier momento desde tu panel.',
  },
  {
    q: '¿Funciona con el Plan de Gestión Básico de Holded?',
    a: 'Sí, siempre que los módulos que quieras consultar estén activos en tu plan de Holded. El conector solo puede acceder a lo que tu API key tiene permisos para ver.',
  },
  {
    q: '¿Qué pasa si mi API key caduca o la cambio?',
    a: 'Desconéctate desde «Gestionar conexiones» en ChatGPT y vuelve a autorizar con la nueva key. El proceso es idéntico al inicial.',
  },
];

export default function ChatGPTDocsPage() {
  return (
    <main className="page-enter min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_45%,#ffffff_100%)] text-slate-900">
      <section className="mx-auto max-w-5xl px-4 py-16">
        {/* ── Header ── */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
              <MessageSquare className="h-4 w-4" />
              Documentación del conector
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Conector Holded para ChatGPT
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              Conecta tu cuenta de Holded con ChatGPT y consulta facturas, contactos, contabilidad y
              mucho más con lenguaje natural — sin salir del chat.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3">
            <Link
              href="/acceso"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ef4654]"
            >
              <PlugZap className="h-4 w-4" />
              Conectar ahora
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Solicitar demo
            </Link>
          </div>
        </div>

        {/* ── Requisitos ── */}
        <article className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CheckCircle2 className="h-4 w-4 text-[#ff5460]" />
            Requisitos previos
          </div>
          <div className="mt-4 grid gap-4 text-sm leading-7 text-slate-600 sm:grid-cols-3">
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ff5460]/10 text-[10px] font-bold text-[#ff5460]">
                1
              </span>
              <div>
                <p className="font-semibold text-slate-800">Cuenta de Holded activa</p>
                <p>Cualquier plan con módulos activos (facturación, CRM, contabilidad…).</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ff5460]/10 text-[10px] font-bold text-[#ff5460]">
                2
              </span>
              <div>
                <p className="font-semibold text-slate-800">ChatGPT Plus / Team / Enterprise</p>
                <p>Los conectores OAuth requieren un plan de pago de OpenAI.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ff5460]/10 text-[10px] font-bold text-[#ff5460]">
                3
              </span>
              <div>
                <p className="font-semibold text-slate-800">API key de Holded</p>
                <p>
                  Generada en <strong>Holded → Configuración → API</strong>.
                </p>
              </div>
            </div>
          </div>
        </article>

        {/* ── Pasos de configuración ── */}
        <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Key className="h-4 w-4 text-[#ff5460]" />
            Configuración paso a paso
          </div>
          <ol className="mt-4 space-y-5">
            {steps.map((step) => (
              <li key={step.n} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ff5460] text-xs font-bold text-white">
                  {step.n}
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-1 text-sm leading-7 text-slate-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>

        {/* ── Herramientas disponibles ── */}
        <div className="mt-4">
          <div className="mb-4 flex items-center gap-2 px-1 text-sm font-semibold text-slate-900">
            <FileText className="h-4 w-4 text-[#ff5460]" />
            Módulos y herramientas disponibles
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <article
                  key={mod.label}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className={`rounded-xl p-2 ${mod.bg}`}>
                      <Icon className={`h-4 w-4 ${mod.color}`} />
                    </span>
                    <p className="text-sm font-semibold text-slate-900">{mod.label}</p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{mod.desc}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {mod.tools.map((tool) => (
                      <code
                        key={tool}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600"
                      >
                        {tool}
                      </code>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* ── Seguridad ── */}
        <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-[#ff5460]" />
            Seguridad y privacidad
          </div>
          <div className="mt-4 grid gap-4 text-sm leading-7 text-slate-600 sm:grid-cols-2">
            {[
              [
                'OAuth 2.0 estándar',
                'Flujo autorización con código — compatible con la especificación oficial de ChatGPT connectors.',
              ],
              [
                'API key cifrada',
                'Tu API key de Holded se almacena cifrada. Nunca se expone a OpenAI ni a terceros.',
              ],
              [
                'Tokens de sesión con TTL',
                'Access token (1 hora) y refresh token (30 días). Revocación explícita disponible en cualquier momento.',
              ],
              [
                'Solo lectura + borradores',
                'El conector no puede borrar ni modificar registros. Los borradores de factura requieren confirmación explícita.',
              ],
            ].map(([title, desc]) => (
              <div key={title}>
                <p className="font-semibold text-slate-800">{title}</p>
                <p>{desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Consulta el{' '}
            <Link href="/dpa" className="font-medium text-[#ff5460] underline underline-offset-4">
              Acuerdo de tratamiento de datos (DPA)
            </Link>{' '}
            para más información sobre subprocesadores y cumplimiento RGPD.
          </p>
        </article>

        {/* ── FAQ ── */}
        <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageSquare className="h-4 w-4 text-[#ff5460]" />
            Preguntas frecuentes
          </div>
          <div className="mt-4 space-y-5">
            {faqs.map(({ q, a }) => (
              <div key={q}>
                <p className="flex items-start gap-2 text-sm font-semibold text-slate-900">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5460]" />
                  {q}
                </p>
                <p className="ml-6 mt-1 text-sm leading-7 text-slate-600">{a}</p>
              </div>
            ))}
          </div>
        </article>

        {/* ── CTA ── */}
        <div className="mt-8 flex flex-col items-center gap-4 rounded-3xl bg-[#ff5460]/5 px-6 py-10 text-center ring-1 ring-[#ff5460]/10">
          <p className="text-xl font-bold text-slate-900">
            ¿Listo para conectar Holded con ChatGPT?
          </p>
          <p className="max-w-md text-sm leading-7 text-slate-600">
            Empieza en menos de 2 minutos — solo necesitas tu API key de Holded.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/acceso"
              className="inline-flex items-center gap-2 rounded-full bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ef4654]"
            >
              <PlugZap className="h-4 w-4" />
              Conectar ahora
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Solicitar demo
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
