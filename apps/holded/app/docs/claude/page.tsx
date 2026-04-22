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
  title: 'Documentación Conector Claude — Holded | verifactu.business',
  description:
    'Guía completa para conectar tu cuenta de Holded con Claude (Anthropic). Requisitos, pasos de configuración, herramientas disponibles y solución de problemas.',
};

const modules = [
  {
    icon: Receipt,
    label: 'Facturación',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    tools: ['list_documents', 'get_document', 'create_invoice_draft'],
    desc: 'Lista facturas, consulta detalles y crea borradores sin modificar datos reales.',
  },
  {
    icon: Users,
    label: 'Contactos / CRM',
    color: 'text-violet-500',
    bg: 'bg-violet-50',
    tools: ['list_contacts', 'get_contact', 'list_crm_funnels', 'list_leads'],
    desc: 'Clientes, proveedores, embudos de venta y leads.',
  },
  {
    icon: Package,
    label: 'Productos',
    color: 'text-sky-500',
    bg: 'bg-sky-50',
    tools: ['list_products', 'get_product', 'list_warehouses'],
    desc: 'Catálogo de productos, precios y almacenes.',
  },
  {
    icon: FolderKanban,
    label: 'Proyectos',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    tools: ['list_projects', 'get_project', 'list_project_tasks', 'list_time_records'],
    desc: 'Estado de proyectos, tareas y registros de tiempo.',
  },
  {
    icon: BookOpen,
    label: 'Contabilidad',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    tools: ['get_chart_of_accounts', 'get_journal', 'get_daily_book'],
    desc: 'Plan de cuentas, libro diario y libro mayor.',
  },
  {
    icon: Building2,
    label: 'Equipo',
    color: 'text-rose-500',
    bg: 'bg-rose-50',
    tools: ['list_employees', 'get_employee'],
    desc: 'Lista de empleados y datos por persona.',
  },
  {
    icon: Wallet,
    label: 'Tesorería',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    tools: ['list_treasury_accounts'],
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
    title: 'Añade el conector en Claude',
    body: (
      <>
        En <strong className="text-slate-800">claude.ai → Ajustes → Conectores</strong>, haz clic en
        «Añadir conector personalizado» e introduce la URL{' '}
        <code className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-mono text-amber-700">
          https://claude.verifactu.business/mcp
        </code>
        .
      </>
    ),
  },
  {
    n: '3',
    title: 'Autoriza con tu API key de Holded',
    body: (
      <>
        La pantalla de autorización OAuth te pedirá tu API key de Holded. Introdúcela y confirma. El
        conector generará un token seguro — tu API key nunca se envía a Anthropic.
      </>
    ),
  },
  {
    n: '4',
    title: 'Empieza a preguntar',
    body: (
      <>
        Una vez conectado, escribe en Claude cualquier pregunta sobre tu negocio:{' '}
        <em>«¿Cuál es el resultado neto de este trimestre?»</em>,{' '}
        <em>«Muéstrame los contactos con más facturación»</em> o{' '}
        <em>«Prepara una factura borrador para Acme S.L.»</em>
      </>
    ),
  },
];

const faqs = [
  {
    q: '¿Necesito Claude Pro o Team?',
    a: 'Los conectores externos con OAuth están disponibles en Claude Pro, Team y Enterprise. No están disponibles en el plan gratuito de claude.ai.',
  },
  {
    q: '¿El conector puede modificar mis datos de Holded?',
    a: 'Solo puede crear borradores de facturas, que requieren confirmación explícita antes de guardarse. El resto de operaciones son de solo lectura.',
  },
  {
    q: '¿Dónde se almacena mi API key?',
    a: 'Tu API key se cifra y se almacena en nuestra base de datos segura (claude.verifactu.business). Nunca se envía a Anthropic ni a terceros. Puedes revocar el acceso en cualquier momento.',
  },
  {
    q: '¿El servidor MCP está en producción?',
    a: 'El servidor está operativo en claude.verifactu.business. La inclusión en el directorio oficial de Anthropic está en proceso de revisión — ya puedes añadirlo como conector personalizado.',
  },
  {
    q: '¿Qué pasa si mi API key caduca o la cambio?',
    a: 'En Claude → Ajustes → Conectores, desconéctate del conector Holded y vuelve a autorizar con la nueva key. El proceso es idéntico al inicial.',
  },
];

export default function ClaudeDocsPage() {
  return (
    <main className="page-enter min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fffbf0_45%,#ffffff_100%)] text-slate-900">
      <section className="mx-auto max-w-5xl px-4 py-16">
        {/* ── Header ── */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <MessageSquare className="h-4 w-4" />
              Documentación del conector
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Conector Holded para Claude
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              Conecta tu cuenta de Holded con Claude (Anthropic) y consulta facturación, contactos,
              contabilidad y mucho más con lenguaje natural — directamente desde claude.ai.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3">
            <Link
              href="/claude"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
            >
              <PlugZap className="h-4 w-4" />
              Ver conector Claude
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Solicitar demo
            </Link>
          </div>
        </div>

        {/* ── Badge en review ── */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <span className="mt-0.5 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
            EN REVISIÓN
          </span>
          <p className="text-sm leading-6 text-amber-800">
            El conector ya está operativo en{' '}
            <code className="font-mono text-amber-700">claude.verifactu.business</code>. La
            inclusión en el directorio oficial de Anthropic está en proceso de revisión. Mientras
            tanto, puedes añadirlo como conector personalizado siguiendo los pasos a continuación.
          </p>
        </div>

        {/* ── Requisitos ── */}
        <article className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CheckCircle2 className="h-4 w-4 text-amber-500" />
            Requisitos previos
          </div>
          <div className="mt-4 grid gap-4 text-sm leading-7 text-slate-600 sm:grid-cols-3">
            {[
              {
                n: '1',
                title: 'Cuenta de Holded activa',
                desc: 'Cualquier plan con módulos activos (facturación, CRM, contabilidad…).',
              },
              {
                n: '2',
                title: 'Claude Pro / Team / Enterprise',
                desc: 'Los conectores OAuth requieren un plan de pago de Anthropic.',
              },
              {
                n: '3',
                title: 'API key de Holded',
                desc: 'Generada en Holded → Configuración → API.',
              },
            ].map((item) => (
              <div key={item.n} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                  {item.n}
                </span>
                <div>
                  <p className="font-semibold text-slate-800">{item.title}</p>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* ── Pasos de configuración ── */}
        <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Key className="h-4 w-4 text-amber-500" />
            Configuración paso a paso
          </div>
          <ol className="mt-4 space-y-5">
            {steps.map((step) => (
              <li key={step.n} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
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
            <FileText className="h-4 w-4 text-amber-500" />
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
                        className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-mono text-amber-700"
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
            <ShieldCheck className="h-4 w-4 text-amber-500" />
            Seguridad y privacidad
          </div>
          <div className="mt-4 grid gap-4 text-sm leading-7 text-slate-600 sm:grid-cols-2">
            {[
              [
                'OAuth 2.0 estándar',
                'Flujo de autorización con código — compatible con la especificación MCP de Anthropic.',
              ],
              [
                'API key cifrada',
                'Tu API key de Holded se almacena cifrada. Nunca se expone a Anthropic ni a terceros.',
              ],
              [
                'Tokens de sesión con TTL',
                'Access token (1 hora) y refresh token (30 días). Revocación explícita disponible.',
              ],
              [
                'Solo lectura + borradores',
                'El conector no puede borrar ni modificar registros. Los borradores requieren confirmación.',
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
            <Link href="/dpa" className="font-medium text-amber-600 underline underline-offset-4">
              Acuerdo de tratamiento de datos (DPA)
            </Link>{' '}
            para información sobre subprocesadores y cumplimiento RGPD.
          </p>
        </article>

        {/* ── FAQ ── */}
        <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageSquare className="h-4 w-4 text-amber-500" />
            Preguntas frecuentes
          </div>
          <div className="mt-4 space-y-5">
            {faqs.map(({ q, a }) => (
              <div key={q}>
                <p className="flex items-start gap-2 text-sm font-semibold text-slate-900">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  {q}
                </p>
                <p className="ml-6 mt-1 text-sm leading-7 text-slate-600">{a}</p>
              </div>
            ))}
          </div>
        </article>

        {/* ── CTA ── */}
        <div className="mt-8 flex flex-col items-center gap-4 rounded-3xl bg-amber-50 px-6 py-10 text-center ring-1 ring-amber-200">
          <p className="text-xl font-bold text-slate-900">
            ¿Listo para conectar Holded con Claude?
          </p>
          <p className="max-w-md text-sm leading-7 text-slate-600">
            El servidor MCP ya está operativo. Añádelo como conector personalizado en claude.ai
            ahora mismo.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/claude"
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
            >
              <PlugZap className="h-4 w-4" />
              Ver conector Claude
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Soporte
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
