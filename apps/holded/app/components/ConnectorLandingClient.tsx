import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  FileDown,
  FileText,
  FolderKanban,
  HelpCircle,
  KeyRound,
  Landmark,
  Link2,
  LockKeyhole,
  Mail,
  MessageSquareText,
  Package,
  Play,
  Receipt,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ComponentType } from 'react';
import { ConnectorComparison } from '@/app/components/ConnectorComparison';
import { ConnectorFAQ } from '@/app/components/ConnectorFAQ';
import { ConnectorRequirementsCard } from '@/app/components/ConnectorRequirementsCard';

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
  logoSrc: string;
  docsHref: string;
  demoHref: string;
  supportHref: string;
  dpaHref: string;
  privacyHref: string;
  termsHref: string;
  connectHref?: string;
};

type Capability = {
  title: string;
  subtitle: string;
  Icon: ComponentType<{ className?: string }>;
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
    logoSrc: '/brand/claude-logo.svg',
    docsHref: '/conectores/claude/docs',
    demoHref: '/conectores/claude/demo',
    supportHref: '/conectores/claude/soporte',
    dpaHref: '/conectores/claude/dpa',
    privacyHref: '/conectores/claude/privacy',
    termsHref: '/conectores/claude/terms',
    connectHref: 'https://claude.verifactu.business/launch',
  },
  chatgpt: {
    id: 'chatgpt',
    aiName: 'ChatGPT',
    provider: 'OpenAI',
    label: 'Conector Holded para ChatGPT',
    logoSrc: '/brand/chatgpt-logo.png',
    docsHref: '/conectores/chatgpt/docs',
    demoHref: '/conectores/chatgpt/openai-review-demo',
    supportHref: '/conectores/chatgpt/soporte',
    dpaHref: '/conectores/chatgpt/dpa',
    privacyHref: '/conectores/chatgpt/privacy',
    termsHref: '/conectores/chatgpt/terms',
    connectHref: '/auth/holded-direct?source=chatgpt_connector_landing',
  },
};

const CAPABILITIES: Capability[] = [
  {
    title: 'Facturas',
    subtitle: 'Lista facturas recientes y consulta el detalle de una factura existente.',
    Icon: Receipt,
    examples: ['¿Cuánto he facturado este mes?', 'Enséñame las últimas facturas de un cliente.'],
  },
  {
    title: 'Contactos',
    subtitle: 'Revisa contactos y datos disponibles sin crear ni modificar registros.',
    Icon: Users,
    examples: [
      'Busca los datos fiscales de este cliente.',
      '¿Qué contactos tienen facturas pendientes?',
    ],
  },
  {
    title: 'Cuentas contables',
    subtitle: 'Consulta el plan de cuentas y resume codigos, nombres y tipos cuando existan.',
    Icon: Landmark,
    examples: ['Resume mis principales cuentas contables.', '¿Dónde se concentra el gasto?'],
  },
  {
    title: 'Diario contable',
    subtitle: 'Lee apuntes existentes solo cuando el usuario indique fecha inicial y final.',
    Icon: BookOpen,
    examples: ['Muéstrame los apuntes de marzo.', 'Explícame este asiento en lenguaje claro.'],
  },
  {
    title: 'Borradores de factura',
    subtitle: 'Prepara borradores solo después de confirmación explícita del usuario.',
    Icon: FileText,
    examples: [
      'Prepara un borrador para Acme por 100 € + IVA.',
      'Pídeme confirmación antes de crearlo.',
    ],
  },
  {
    title: 'Productos y stock',
    subtitle: 'Lista catálogo, ficha de producto y stock disponible cuando está habilitado.',
    Icon: Package,
    examples: ['¿Qué productos tengo con stock bajo?', 'Enséñame precio y stock de este SKU.'],
  },
  {
    title: 'Proyectos y tareas',
    subtitle: 'Consulta proyectos abiertos, tareas pendientes e imputaciones de horas.',
    Icon: FolderKanban,
    examples: ['Resume mis proyectos activos.', '¿Qué tareas están pendientes esta semana?'],
  },
  {
    title: 'CRM: leads y embudo',
    subtitle: 'Visualiza el embudo de ventas y los leads asignados sin modificar nada.',
    Icon: TrendingUp,
    examples: ['Resume mi embudo por fases.', '¿Qué leads esperan seguimiento?'],
  },
  {
    title: 'PDFs de documentos',
    subtitle: 'Descarga el PDF de una factura, presupuesto o albaran existente.',
    Icon: FileDown,
    examples: [
      'Dame el PDF de la última factura de este cliente.',
      'Recupera el presupuesto que necesito adjuntar.',
    ],
  },
  {
    title: 'Equipo, tesoreria y catalogos',
    subtitle: 'Empleados, cuentas de tesoreria, tipos de IVA, almacenes y series de numeracion.',
    Icon: Briefcase,
    examples: [
      'Muéstrame mi equipo y cuentas de tesorería.',
      'Lista almacenes y series antes de crear un borrador.',
    ],
  },
];

const TRUST_POINTS = [
  'Solo accede a la cuenta de Holded conectada por el usuario autenticado.',
  'Credenciales protegidas en servidores de Verifactu; no se muestran a la IA ni al cliente.',
  'Solo lectura por defecto; crear un borrador de factura requiere confirmación explícita.',
  'No envía, emite, cobra, finaliza, elimina ni sobrescribe facturas o registros existentes.',
];

const CONNECTOR_STATUS: Record<ConnectorId, string> = {
  claude:
    process.env.NEXT_PUBLIC_HOLDED_CLAUDE_CONNECTOR_STATUS || 'Disponible en acceso controlado',
  chatgpt:
    process.env.NEXT_PUBLIC_HOLDED_CHATGPT_CONNECTOR_STATUS ||
    'Acceso controlado durante lanzamiento',
};

function isExternalHref(href: string) {
  return /^https?:\/\//.test(href);
}

function ConnectorPrimaryCta({
  href,
  aiName,
  className,
}: {
  href: string;
  aiName: string;
  className: string;
}) {
  const content = (
    <>
      {isExternalHref(href) ? (
        <ExternalLink className="h-4 w-4" />
      ) : (
        <ArrowRight className="h-4 w-4" />
      )}
      Conectar Holded con {aiName}
    </>
  );

  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

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

const QUICK_CONNECT_STEPS: Record<
  ConnectorId,
  { n: string; Icon: ComponentType<{ className?: string }>; title: string; text: string }[]
> = {
  claude: [
    {
      n: '01',
      Icon: Link2,
      title: 'Pulsa el botón "Añadir a Claude"',
      text: 'Claude.ai abre el diálogo "Añadir conector personalizado" con el nombre "Holded" y la URL del servidor MCP ya rellenados automáticamente.',
    },
    {
      n: '02',
      Icon: Zap,
      title: 'Acepta el aviso y haz clic en "Añadir"',
      text: 'Claude muestra un aviso de seguridad estándar indicando que el conector fue sugerido por un enlace externo — es el comportamiento esperado. Verifica que el nombre sea "Holded" y la URL "claude.verifactu.business/mcp", luego pulsa "Añadir".',
    },
    {
      n: '03',
      Icon: KeyRound,
      title: 'Autoriza con tu API key de Holded',
      text: 'La pantalla segura de Verifactu solicita tu API key de Holded. Se guarda en servidor y no se devuelve a Claude ni al navegador.',
    },
  ],
  chatgpt: [
    {
      n: '01',
      Icon: Link2,
      title: 'Conecta tu cuenta de Holded',
      text: 'Haz clic en el botón y accede a la pantalla de autorización de Verifactu. Puedes entrar con Google o con tu email.',
    },
    {
      n: '02',
      Icon: KeyRound,
      title: 'Introduce tu API key de Holded',
      text: 'Tu clave queda guardada en servidor y no se muestra a ChatGPT ni al navegador. El alcance queda limitado a tu cuenta.',
    },
    {
      n: '03',
      Icon: Zap,
      title: 'El conector queda activo en ChatGPT',
      text: 'ChatGPT recibe el token de acceso vía OAuth. A partir de ese momento puedes preguntar a Holded directamente desde ChatGPT.',
    },
  ],
};

function ConnectorQuickConnect({ cfg, theme }: { cfg: ConnectorConfig; theme: Theme }) {
  if (!cfg.connectHref) return null;

  const steps = QUICK_CONNECT_STEPS[cfg.id];
  const isExternal = isExternalHref(cfg.connectHref);

  return (
    <section className={`border-y border-slate-100 py-14 sm:py-20 ${theme.sectionBg}`}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {cfg.id === 'claude' && (
              <div
                className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${theme.pill}`}
              >
                <Sparkles className="h-3 w-3" />
                Disponible ahora como conector personalizado
              </div>
            )}
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Conectar en 3 pasos
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Añade Holded a {cfg.aiName} en menos de dos minutos.
            </h2>
            {cfg.id === 'claude' && (
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                El conector usa el flujo de conector personalizado de Claude mientras finaliza la
                revisión en el directorio oficial de Anthropic. Ya está operativo.
              </p>
            )}
          </div>
          <ConnectorPrimaryCta
            href={cfg.connectHref}
            aiName={cfg.aiName}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition ${theme.ctaBg} ${theme.ctaShadow}`}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => {
            const { Icon } = step;
            return (
              <div
                key={step.n}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="text-[11px] font-bold tabular-nums tracking-widest text-slate-300">
                  {step.n}
                </span>
                <div
                  className={`mt-3 flex h-9 w-9 items-center justify-center rounded-xl ${theme.accentBg}`}
                >
                  <Icon className={`h-5 w-5 ${theme.accentText}`} />
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
              </div>
            );
          })}
        </div>

        {cfg.id === 'claude' && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
            <ShieldCheck className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${theme.accentText}`} />
            <span>
              Si ya tienes cuenta en Verifactu Business, el flujo detecta tu sesión activa y omite
              el paso de registro. La autorización se completa en segundos.
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

export function ConnectorLandingClient({ connector }: { connector: ConnectorId }) {
  const theme = THEMES[connector];
  const cfg = CONFIGS[connector];
  const connectorStatus = CONNECTOR_STATUS[connector];

  return (
    <main className="page-enter min-h-screen bg-white text-slate-900">
      <section className={`border-b border-slate-200 ${theme.gradient} pb-20 pt-16 sm:pt-20`}>
        <div className="mx-auto max-w-4xl px-4 text-center">
          <ConnectorLogo cfg={cfg} />

          {/* Launch banner — visible above the connector label during free-launch period.
              Uses the connector theme.pill so it adopts amber on Claude and emerald on
              ChatGPT, avoiding color collision with the connector chip below.
              Quitar este bloque cuando se active el modelo freemium con límites. */}
          <div
            className={`mx-auto mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] shadow-sm ${theme.pill}`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Acceso gratuito durante lanzamiento
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${theme.pill}`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {cfg.label}
          </div>

          <h1 className="mt-7 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl sm:leading-[1.06]">
            Pregunta a Holded desde {cfg.aiName}.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Consulta facturas, contactos, contabilidad, CRM y proyectos en lenguaje natural. Crea
            borradores de factura solo con confirmación explícita. Tus credenciales se guardan en
            servidor y el acceso queda limitado a tu cuenta conectada.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            {cfg.connectHref && (
              <ConnectorPrimaryCta
                href={cfg.connectHref}
                aiName={cfg.aiName}
                className={`inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition ${theme.ctaBg} ${theme.ctaShadow}`}
              />
            )}
            <Link
              href={cfg.demoHref}
              className={
                cfg.connectHref
                  ? 'inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50'
                  : `inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition ${theme.ctaBg} ${theme.ctaShadow}`
              }
            >
              <Play className="h-4 w-4 fill-current" />
              Ver demo
            </Link>
            <Link
              href={cfg.docsHref}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Cómo conectar
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
              'Borradores con confirmación',
              'Cuenta conectada',
              'Credenciales en servidor',
            ].map((chip) => (
              <span
                key={chip}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${theme.chip}`}
              >
                {chip}
              </span>
            ))}
          </div>

          <p className="mt-5 text-xs text-slate-400">{connectorStatus}</p>
        </div>
      </section>

      <ConnectorQuickConnect cfg={cfg} theme={theme} />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Capacidades actuales
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Preguntas de negocio, no menús.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Estas son las capacidades actuales del conector. El usuario pregunta en lenguaje
              natural y {cfg.aiName} consulta Holded dentro de la cuenta autorizada.
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
                  <div className="mt-4 space-y-1.5">
                    {cap.examples.map((example) => (
                      <span
                        key={example}
                        className="block rounded-md bg-slate-50 px-2 py-1.5 text-[11px] font-medium leading-4 text-slate-600"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          {cfg.connectHref && (
            <div className="mt-10 flex justify-center">
              <ConnectorPrimaryCta
                href={cfg.connectHref}
                aiName={cfg.aiName}
                className={`inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition ${theme.ctaBg} ${theme.ctaShadow}`}
              />
            </div>
          )}
        </div>
      </section>

      {/* Comparativa Con conector vs Sin conector — argumento de valor del
          conector frente a usar Claude/ChatGPT solo, sin acceso a Holded. */}
      <ConnectorComparison
        connector={connector}
        aiName={cfg.aiName}
        connectHref={cfg.connectHref}
      />

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
                title: 'Inicia la conexión',
                text: `Empieza desde ${cfg.aiName} o desde el acceso directo de Verifactu. Solo necesitas tu API key de Holded y una cuenta autorizada.`,
                Icon: BookOpen,
              },
              {
                title: 'Autoriza Holded',
                text: `Verifactu valida la API key y guarda la conexión en servidor. Las credenciales no se devuelven a ${cfg.aiName} ni al navegador.`,
                Icon: LockKeyhole,
              },
              {
                title: 'Pregunta con control',
                text: `${cfg.aiName} consulta datos de Holded dentro de la cuenta conectada. Las acciones de borrador requieren confirmación antes de ejecutarse.`,
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
              Solo lectura por defecto. Borradores con confirmación.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              El conector está diseñado para un alcance cerrado y reproducible. No cambia de cuenta,
              no muestra credenciales, no envía facturas y no realiza acciones contables amplias de
              forma autónoma.
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

      {/* Requisitos y limitaciones — cláusulas ajenas al conector (licencias
          ChatGPT/Claude, autenticación previa en claude.ai) + enlaces
          externos a Holded/ChatGPT/Claude para usuarios que no conocen las
          plataformas. Posicionada antes del FAQ para que las objeciones
          comerciales se resuelvan ANTES de hacer scroll por las preguntas. */}
      <ConnectorRequirementsCard connector={connector} />

      {/* FAQ — preguntas frecuentes con JSON-LD FAQPage inyectado en page.tsx.
          Posicionada justo antes de Soporte porque resuelve objeciones que
          podrian llevar al usuario a contactar (privacidad, planes, costes). */}
      <ConnectorFAQ connector={connector} aiName={cfg.aiName} provider={cfg.provider} />

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
                title: 'Chat de soporte',
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
                text: 'Usuarios registrados pueden abrir un ticket vinculado a su cuenta conectada y enviar contexto al equipo.',
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
            Conecta Holded con {cfg.aiName}.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Autoriza el conector en segundos. Solo lectura por defecto; los borradores requieren
            confirmación explícita antes de crearse.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {cfg.connectHref && (
              <ConnectorPrimaryCta
                href={cfg.connectHref}
                aiName={cfg.aiName}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition ${theme.ctaBg} ${theme.ctaShadow}`}
              />
            )}
            <Link
              href={cfg.demoHref}
              className={
                cfg.connectHref
                  ? 'inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50'
                  : `inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition ${theme.ctaBg} ${theme.ctaShadow}`
              }
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
              // URLs específicas del conector — cada conector tiene su propia
              // política y DPA porque los sub-procesadores difieren (Anthropic
              // vs OpenAI). El hub /conectores/privacy y /conectores/dpa siguen
              // existiendo como selectores generales.
              ['Docs', cfg.docsHref],
              ['Privacidad', cfg.privacyHref],
              ['DPA', cfg.dpaHref],
              ['Soporte', cfg.supportHref],
              ['Términos', cfg.termsHref],
              ['Aviso legal', '/legal'],
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
