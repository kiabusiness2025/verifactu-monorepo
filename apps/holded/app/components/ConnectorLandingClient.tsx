import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  HelpCircle,
  Landmark,
  LockKeyhole,
  Mail,
  MessageSquareText,
  Play,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type ConnectorId = 'claude' | 'chatgpt';

type Theme = {
  gradient: string;
  pill: string;
  accentText: string;
  accentBg: string;
  ctaBg: string;
  ctaShadow: string;
  chip: string;
  sectionBg: string;
  linkBorder: string;
};

type ConnectorConfig = {
  id: ConnectorId;
  aiName: string;
  provider: string;
  label: string;
  status: string;
  logoSrc: string;
  docsHref: string;
  demoHref: string;
  supportHref: string;
  dpaHref: string;
};

type Capability = {
  title: string;
  subtitle: string;
  Icon: ComponentType<{ className?: string }>;
  tools: string[];
  examples: string[];
};

const THEMES: Record<ConnectorId, Theme> = {
  claude: {
    gradient: 'bg-[linear-gradient(175deg,#ffffff_0%,#fff7ed_100%)]',
    pill: 'border-amber-200 bg-amber-50 text-amber-800',
    accentText: 'text-amber-700',
    accentBg: 'bg-amber-50',
    ctaBg: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
    ctaShadow: 'shadow-[0_18px_45px_-20px_rgba(217,119,6,0.55)]',
    chip: 'border-amber-200 bg-amber-50 text-amber-800',
    sectionBg: 'bg-amber-50/55',
    linkBorder: 'border-amber-200 hover:border-amber-300 hover:bg-amber-50',
  },
  chatgpt: {
    gradient: 'bg-[linear-gradient(175deg,#ffffff_0%,#f0fdf4_100%)]',
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    accentText: 'text-emerald-700',
    accentBg: 'bg-emerald-50',
    ctaBg: 'bg-[#10a37f] hover:bg-[#0d8f6f] active:bg-[#0b7a61]',
    ctaShadow: 'shadow-[0_18px_45px_-20px_rgba(16,163,127,0.6)]',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    sectionBg: 'bg-emerald-50/55',
    linkBorder: 'border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50',
  },
};

const CONFIGS: Record<ConnectorId, ConnectorConfig> = {
  claude: {
    id: 'claude',
    aiName: 'Claude',
    provider: 'Anthropic',
    label: 'Conector Holded para Claude',
    status: 'Operativo - MCP - Anthropic',
    logoSrc: '/brand/claude-logo.svg',
    docsHref: '/conectores/claude/docs',
    demoHref: '/demo-recording',
    supportHref: '/conectores/claude/soporte',
    dpaHref: '/conectores/claude/dpa',
  },
  chatgpt: {
    id: 'chatgpt',
    aiName: 'ChatGPT',
    provider: 'OpenAI',
    label: 'Conector Holded para ChatGPT',
    status: 'Operativo - Apps SDK / MCP - OpenAI',
    logoSrc: '/brand/chatgpt-logo.png',
    docsHref: '/conectores/chatgpt/docs',
    demoHref: '/conectores/chatgpt/openai-review-demo',
    supportHref: '/conectores/chatgpt/soporte',
    dpaHref: '/conectores/chatgpt/dpa',
  },
};

const CAPABILITIES: Capability[] = [
  {
    title: 'Facturas',
    subtitle: 'Lista facturas recientes y consulta el detalle de una factura existente.',
    Icon: Receipt,
    tools: ['holded_list_invoices', 'holded_get_invoice'],
    examples: [
      'List my latest Holded invoices.',
      'Show me the details of one invoice from the list.',
    ],
  },
  {
    title: 'Contactos',
    subtitle: 'Revisa contactos y datos disponibles sin crear ni modificar registros.',
    Icon: Users,
    tools: ['holded_list_contacts', 'holded_get_contact'],
    examples: ['List my Holded contacts.', 'Show me the details of one contact from that list.'],
  },
  {
    title: 'Cuentas contables',
    subtitle: 'Consulta el plan de cuentas y resume codigos, nombres y tipos cuando existan.',
    Icon: Landmark,
    tools: ['holded_list_accounts'],
    examples: ['List my main accounting accounts in Holded.'],
  },
  {
    title: 'Diario contable',
    subtitle: 'Lee apuntes existentes solo cuando el usuario indique fecha inicial y final.',
    Icon: BookOpen,
    tools: ['holded_list_daily_ledger'],
    examples: ['Show my Holded daily ledger entries from 2026-03-01 to 2026-03-31.'],
  },
  {
    title: 'Borradores de factura',
    subtitle: 'Prepara borradores solo despues de confirmacion explicita del usuario.',
    Icon: FileText,
    tools: ['holded_create_invoice_draft'],
    examples: [
      'Create a draft invoice for an existing customer for 100 euros plus VAT. Ask for confirmation before creating it.',
    ],
  },
];

const TRUST_POINTS = [
  'Tenant-scoped: solo accede a la cuenta de Holded conectada por el usuario autenticado.',
  'Credenciales protegidas server-side por Verifactu; no se muestran a la IA ni al cliente.',
  'Solo lectura por defecto; crear un borrador de factura requiere confirmacion explicita.',
  'No envia, emite, cobra, finaliza, elimina ni sobrescribe facturas o registros existentes.',
];

function ConnectorLogo({ cfg }: { cfg: ConnectorConfig }) {
  return (
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
  );
}

export function ConnectorLandingClient({ connector }: { connector: ConnectorId }) {
  const theme = THEMES[connector];
  const cfg = CONFIGS[connector];

  return (
    <main className="page-enter min-h-screen bg-white text-slate-900">
      <section className={`border-b border-slate-200 ${theme.gradient} pb-20 pt-16 sm:pt-20`}>
        <div className="mx-auto max-w-4xl px-4 text-center">
          <ConnectorLogo cfg={cfg} />

          <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${theme.pill}`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {cfg.label}
          </div>

          <h1 className="mt-7 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl sm:leading-[1.06]">
            Trabaja con datos clave de Holded desde {cfg.aiName}.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Consulta facturas, contactos, cuentas contables y apuntes del diario con rango de
            fechas. Crea borradores de factura solo tras confirmacion explicita. El conector esta
            limitado a la cuenta de Holded conectada por el usuario.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href={cfg.demoHref}
              className={`inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition ${theme.ctaBg} ${theme.ctaShadow}`}
            >
              <Play className="h-4 w-4 fill-current" />
              Ver demo
            </Link>
            <Link
              href={cfg.docsHref}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Como conectar
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={cfg.supportHref}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Soporte
              <HelpCircle className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {[
              'Solo lectura por defecto',
              'Borradores con confirmacion',
              'Tenant-scoped',
              'Credenciales server-side',
            ].map((chip) => (
              <span
                key={chip}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${theme.chip}`}
              >
                {chip}
              </span>
            ))}
          </div>

          <p className="mt-5 text-xs text-slate-400">{cfg.status}</p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Alcance validado
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Trabaja con datos clave de Holded en lenguaje natural.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Esta plantilla evita prometer modulos que no forman parte del alcance validado. Otros
              modulos de Holded se estan revisando y no son parte del alcance publico de esta
              pagina.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {CAPABILITIES.map((cap) => {
              const { Icon } = cap;
              return (
                <article
                  key={cap.title}
                  className="flex min-h-[18rem] flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.accentBg}`}
                  >
                    <Icon className={`h-5 w-5 ${theme.accentText}`} />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-950">{cap.title}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-6 text-slate-500">{cap.subtitle}</p>
                  <div className="mt-4 space-y-1">
                    {cap.tools.map((tool) => (
                      <code
                        key={tool}
                        className="block rounded-md bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600"
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
      </section>

      <section className={`border-y border-slate-100 py-16 sm:py-20 ${theme.sectionBg}`}>
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Como funciona
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              El mismo flujo base para {cfg.aiName} y futuras integraciones.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Abre la documentacion',
                text: `Sigue el flujo del conector Holded para ${cfg.aiName}. Cada pagina mantiene enlaces exclusivos a su propia documentacion, soporte y demo.`,
                Icon: BookOpen,
              },
              {
                title: 'Autoriza la conexion',
                text: `Verifactu valida la conexion y guarda las credenciales de Holded en servidor. Las credenciales no se devuelven a ${cfg.aiName} ni al navegador.`,
                Icon: LockKeyhole,
              },
              {
                title: 'Pregunta con control',
                text: `${cfg.aiName} consulta datos de Holded dentro del tenant conectado. Las acciones de borrador requieren confirmacion antes de ejecutarse.`,
                Icon: MessageSquareText,
              },
            ].map((step, index) => {
              const { Icon } = step;
              return (
                <article
                  key={step.title}
                  className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <span className="text-[11px] font-bold tabular-nums tracking-widest text-slate-300">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div
                    className={`mt-3 flex h-10 w-10 items-center justify-center rounded-xl ${theme.accentBg}`}
                  >
                    <Icon className={`h-5 w-5 ${theme.accentText}`} />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Seguridad y alcance
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Solo lectura por defecto. Borradores con confirmacion.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              El conector esta disenado para un alcance cerrado y reproducible. No cambia de tenant,
              no muestra credenciales, no envia facturas y no realiza acciones contables amplias de
              forma autonoma.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {TRUST_POINTS.map((item) => (
                <li key={item} className="flex items-start gap-3 px-5 py-4">
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${theme.accentText}`} />
                  <span className="text-sm leading-6 text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={`border-y border-slate-100 py-16 sm:py-20 ${theme.sectionBg}`}>
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Soporte</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Tres vias de contacto, separadas y claras.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Chat con Isaak',
                text: 'Ayuda guiada en una ventana independiente, sin incrustar chats dentro de la landing.',
                href: `/support/chat?source=${cfg.id}_connector&prompt=${encodeURIComponent(
                  `Necesito ayuda con el conector Holded para ${cfg.aiName}`
                )}`,
                label: 'Abrir chat',
                Icon: MessageSquareText,
                external: true,
              },
              {
                title: 'Formulario autenticado',
                text: 'Usuarios registrados pueden abrir un ticket vinculado a su tenant y enviar contexto al equipo.',
                href: cfg.supportHref,
                label: 'Abrir soporte',
                Icon: FileText,
                external: false,
              },
              {
                title: 'Email directo',
                text: 'Para incidencias urgentes o con adjuntos, escribe a soporte@verifactu.business.',
                href: `mailto:soporte@verifactu.business?subject=${encodeURIComponent(
                  `Soporte conector Holded para ${cfg.aiName}`
                )}`,
                label: 'Enviar email',
                Icon: Mail,
                external: true,
              },
            ].map((option) => {
              const { Icon } = option;
              const className = `flex h-full flex-col rounded-lg border bg-white p-5 shadow-sm transition ${theme.linkBorder}`;
              const content = (
                <>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.accentBg}`}
                  >
                    <Icon className={`h-5 w-5 ${theme.accentText}`} />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-950">{option.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{option.text}</p>
                  <span
                    className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${theme.accentText}`}
                  >
                    {option.label}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </>
              );

              return option.external ? (
                <a
                  key={option.title}
                  href={option.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {content}
                </a>
              ) : (
                <Link key={option.title} href={option.href} className={className}>
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            Operado por Verifactu Business - no por {cfg.provider} ni Holded
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
            Preparado para conectar Holded con {cfg.aiName}.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Usa la demo, revisa la documentacion o abre soporte. Cada enlace mantiene el contexto
            del conector {cfg.aiName}.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href={cfg.demoHref}
              className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition ${theme.ctaBg} ${theme.ctaShadow}`}
            >
              <Play className="h-4 w-4 fill-current" />
              Ver demo
            </Link>
            <Link
              href={cfg.docsHref}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Documentacion
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-5 text-xs">
            {[
              ['Docs', cfg.docsHref],
              ['Privacy', '/privacy'],
              ['DPA', cfg.dpaHref],
              ['Terms', '/terms'],
              ['Support', cfg.supportHref],
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
    </main>
  );
}
