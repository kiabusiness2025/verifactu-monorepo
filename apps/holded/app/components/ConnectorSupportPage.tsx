import { getHoldedSession } from '@/app/lib/holded-session';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  LifeBuoy,
  Mail,
  MessageSquareText,
  ShieldCheck,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ConnectorSupportForm } from './ConnectorSupportForm';

type ConnectorId = 'chatgpt' | 'claude';

type SupportConfig = {
  connector: ConnectorId;
  aiName: string;
  logoSrc: string;
  connectorHref: string;
  docsHref: string;
  privacyHref: string;
  termsHref: string;
  dpaHref: string;
  accent: string;
  accentSoft: string;
  accentBorder: string;
};

const SUPPORT_EMAIL = 'soporte@verifactu.business';

const CONFIGS: Record<ConnectorId, SupportConfig> = {
  chatgpt: {
    connector: 'chatgpt',
    aiName: 'ChatGPT',
    logoSrc: '/brand/chatgpt-logo.png',
    connectorHref: '/conectores/chatgpt',
    docsHref: '/conectores/chatgpt/docs',
    privacyHref: '/conectores/chatgpt/privacy',
    termsHref: '/conectores/chatgpt/terms',
    dpaHref: '/conectores/chatgpt/dpa',
    accent: 'text-emerald-700',
    accentSoft: 'bg-emerald-50',
    accentBorder: 'border-emerald-200',
  },
  claude: {
    connector: 'claude',
    aiName: 'Claude',
    logoSrc: '/brand/claude-logo.svg',
    connectorHref: '/conectores/claude',
    docsHref: '/conectores/claude/docs',
    privacyHref: '/conectores/claude/privacy',
    termsHref: '/conectores/claude/terms',
    dpaHref: '/conectores/claude/dpa',
    accent: 'text-amber-700',
    accentSoft: 'bg-amber-50',
    accentBorder: 'border-amber-200',
  },
};

function mailtoHref(aiName: string) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Soporte conector Holded para ${aiName}`
  )}`;
}

export async function ConnectorSupportPage({ connector }: { connector: ConnectorId }) {
  const cfg = CONFIGS[connector];
  const session = await getHoldedSession();
  const isRegistered = !!session?.userId;
  const chatHref = `/support/chat?source=${connector}_connector&prompt=${encodeURIComponent(
    `Necesito ayuda con el conector Holded para ${cfg.aiName}`
  )}`;

  const links = [
    { label: 'Documentacion', href: cfg.docsHref, Icon: BookOpen },
    { label: 'Privacidad', href: cfg.privacyHref, Icon: ShieldCheck },
    { label: 'DPA', href: cfg.dpaHref, Icon: FileText },
    { label: 'Terminos', href: cfg.termsHref, Icon: FileText },
  ];

  return (
    <main
      className={`min-h-screen bg-[linear-gradient(175deg,#ffffff_0%,#f8fafc_100%)] text-slate-900`}
    >
      <nav
        className={`sticky top-0 z-10 border-b ${cfg.accentBorder} bg-white/90 backdrop-blur-sm`}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href={cfg.connectorHref}
            className={`inline-flex items-center gap-2 text-sm font-medium ${cfg.accent} transition hover:text-slate-950`}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al conector {cfg.aiName}
          </Link>
          <div className="flex items-center gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hidden text-xs font-medium text-slate-500 transition hover:text-slate-800 sm:inline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Holded"
                width={36}
                height={36}
                className="rounded-lg"
              />
              <span className="text-slate-300">+</span>
              <Image
                src={cfg.logoSrc}
                alt={cfg.aiName}
                width={32}
                height={32}
                className="rounded-lg"
              />
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border ${cfg.accentBorder} ${cfg.accentSoft} px-3 py-1 text-xs font-semibold ${cfg.accent}`}
            >
              <LifeBuoy className="h-4 w-4" />
              Soporte / Ayuda
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Centro de soporte
              <span className={`block text-2xl font-semibold ${cfg.accent}`}>
                Conector Holded para {cfg.aiName}
              </span>
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Elige una via de contacto. El chat de Isaak se abre en una ventana independiente; el
              formulario crea un ticket solo para usuarios autenticados; y el email directo queda
              disponible para urgencias o adjuntos.
            </p>
          </div>

          <div
            className={`shrink-0 rounded-lg border ${cfg.accentBorder} bg-white p-6 shadow-sm lg:w-[22rem]`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Mail className={`h-4 w-4 ${cfg.accent}`} />
              Contacto directo
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Para incidencias urgentes o que requieren adjuntos:
            </p>
            <a
              href={mailtoHref(cfg.aiName)}
              className={`mt-4 inline-flex items-center gap-2 rounded-lg border ${cfg.accentBorder} ${cfg.accentSoft} px-4 py-2.5 text-sm font-semibold ${cfg.accent} transition hover:bg-white`}
            >
              <Mail className="h-4 w-4" />
              {SUPPORT_EMAIL}
            </a>
            {isRegistered && (
              <p className="mt-3 text-xs text-slate-500">
                Sesion activa: puedes crear un ticket vinculado a tu tenant.
              </p>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className={`h-4 w-4 ${cfg.accent}`} />
              Formulario autenticado
            </div>
            <p className="mb-5 text-sm leading-6 text-slate-600">
              Usa esta opcion cuando quieras que la consulta quede registrada con tu usuario. Para
              adjuntos, usa el email directo e incluye la referencia del ticket si ya la tienes.
            </p>
            <ConnectorSupportForm connector={connector} isRegistered={isRegistered} />
          </section>

          <aside className="flex flex-col gap-4">
            <a
              href={chatHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <MessageSquareText className={`h-4 w-4 ${cfg.accent}`} />
                Chat con Isaak
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Ayuda guiada en ventana independiente, con la pregunta de soporte ya preparada.
              </p>
              <span className={`mt-4 inline-flex text-xs font-semibold ${cfg.accent}`}>
                Abrir chat
              </span>
            </a>

            <a
              href={mailtoHref(cfg.aiName)}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Mail className={`h-4 w-4 ${cfg.accent}`} />
                Email directo
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Escribe a {SUPPORT_EMAIL}. Recomendado para adjuntos o incidencias urgentes.
              </p>
              <span className={`mt-4 inline-flex text-xs font-semibold ${cfg.accent}`}>
                Enviar email
              </span>
            </a>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold text-slate-500">Recursos utiles</p>
              <div className="mt-3 flex flex-col gap-2">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-12 border-t border-slate-100 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href={cfg.connectorHref}
              className={`inline-flex items-center gap-2 text-sm font-semibold ${cfg.accent} transition hover:text-slate-950`}
            >
              <ArrowLeft className="h-4 w-4" />
              Conector {cfg.aiName}
            </Link>
            <p className="w-full text-center text-xs text-slate-400 sm:w-auto sm:text-right">
              Expert Estudios Profesionales, SLU - Verifactu Business - Holded Solution Partner
            </p>
          </div>
        </footer>
      </section>
    </main>
  );
}
