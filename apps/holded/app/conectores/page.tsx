import { ArrowRight, CheckCircle2, ExternalLink, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Holded con IA | Conectores ChatGPT y Claude',
  description:
    'Elige cómo conectar Holded con ChatGPT o Claude. Consulta facturas, contactos, contabilidad, CRM y proyectos en lenguaje natural.',
  alternates: { canonical: '/conectores' },
};

const connectors = [
  {
    id: 'claude',
    title: 'Holded para Claude',
    body: 'Usa Claude para entender tus datos de Holded en lenguaje natural. Credenciales protegidas y alcance limitado a tu cuenta conectada.',
    href: '/conectores/claude',
    logoSrc: '/brand/claude-logo.svg',
    badge: 'En producción',
    bgGradient: 'bg-[linear-gradient(160deg,#fff7ed_0%,#ffffff_100%)]',
    borderColor: 'border-[#D4570C]/20',
    badgeBorder: 'border-[#D4570C]/25',
    badgeText: 'text-[#D4570C]',
    ctaBg: 'bg-[#D4570C] hover:bg-[#B84509] shadow-[0_10px_25px_-12px_rgba(212,87,12,0.5)]',
    checkColor: 'text-[#D4570C]',
    connectHref:
      'https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=Holded&connectorUrl=https%3A%2F%2Fclaude.verifactu.business%2Fmcp',
    connectLabel: 'Añadir a Claude',
    connectExternal: true,
  },
  {
    id: 'chatgpt',
    title: 'Holded para ChatGPT',
    body: 'Consulta facturas, contactos, contabilidad, CRM y proyectos desde ChatGPT. Solo lectura por defecto y borradores con confirmación.',
    href: '/conectores/chatgpt',
    logoSrc: '/brand/chatgpt-logo.png',
    badge: 'En lanzamiento',
    bgGradient: 'bg-[linear-gradient(160deg,#f0fdf9_0%,#ffffff_100%)]',
    borderColor: 'border-[#10a37f]/20',
    badgeBorder: 'border-[#10a37f]/25',
    badgeText: 'text-[#10a37f]',
    ctaBg: 'bg-[#10a37f] hover:bg-[#0d9270] shadow-[0_10px_25px_-12px_rgba(16,163,127,0.45)]',
    checkColor: 'text-[#10a37f]',
    connectHref: '/auth/holded-direct?source=chatgpt_hub_landing',
    connectLabel: 'Conectar con ChatGPT',
    connectExternal: false,
  },
];

const features = [
  'Facturas, contactos y contabilidad',
  'CRM, proyectos, productos y stock',
  'Solo lectura por defecto',
  'Borradores con confirmación',
];

const shortcuts = [
  { label: 'Docs Claude', href: '/conectores/claude/docs' },
  { label: 'Docs ChatGPT', href: '/conectores/chatgpt/docs' },
  { label: 'Privacidad', href: '/conectores/privacy' },
  { label: 'DPA', href: '/conectores/dpa' },
  { label: 'Soporte', href: '/conectores/soporte' },
];

export default function HoldedConnectorsHubPage() {
  return (
    <main className="page-enter min-h-screen bg-white text-slate-900">
      {/* Header */}
      <section className="border-b border-slate-200 bg-[linear-gradient(175deg,#ffffff_0%,#f8fafc_100%)] pb-16 pt-14">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/15 bg-[#ff5460]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
            <Sparkles className="h-3.5 w-3.5" />
            Hub de conectores Holded
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Conecta Holded con la IA que ya usas.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Elige ChatGPT o Claude para preguntar por facturas, clientes, contabilidad y proyectos
            sin navegar menús ni exportar hojas de cálculo.
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Integración independiente de Verifactu Business — no somos Holded, OpenAI ni Anthropic.
          </p>

          {/* AI logos */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Holded"
                width={30}
                height={30}
                className="h-[30px] w-[30px] object-contain"
              />
            </div>
            <span className="text-xl font-light text-slate-300">+</span>
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-[#D4570C]/20 bg-[#fff7ed] shadow-sm">
              <Image
                src="/brand/claude-logo.svg"
                alt="Claude"
                width={30}
                height={30}
                className="h-[30px] w-[30px] object-contain"
              />
            </div>
            <span className="text-sm font-medium text-slate-400">o</span>
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-[#10a37f]/20 bg-[#f0fdf9] shadow-sm">
              <Image
                src="/brand/chatgpt-logo.png"
                alt="ChatGPT"
                width={30}
                height={30}
                className="h-[30px] w-[30px] object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Connector cards */}
      <section className="py-14">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid gap-6 md:grid-cols-2">
            {connectors.map((c) => (
              <div
                key={c.id}
                className={`flex flex-col rounded-[2rem] border ${c.borderColor} ${c.bgGradient} p-7 shadow-sm`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <Image
                      src={c.logoSrc}
                      alt={c.title}
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                    />
                  </div>
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full border ${c.badgeBorder} bg-white px-3 py-1 text-xs font-semibold ${c.badgeText}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {c.badge}
                  </div>
                </div>

                <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-950">{c.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{c.body}</p>

                <ul className="mt-5 space-y-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 className={`mt-1 h-3.5 w-3.5 shrink-0 ${c.checkColor}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-wrap gap-3 pt-6">
                  {c.connectExternal ? (
                    <a
                      href={c.connectHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition ${c.ctaBg}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {c.connectLabel}
                    </a>
                  ) : (
                    <Link
                      href={c.connectHref}
                      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition ${c.ctaBg}`}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      {c.connectLabel}
                    </Link>
                  )}
                  <Link
                    href={c.href}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver landing
                  </Link>
                  <Link
                    href={`${c.href}/docs`}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Documentación
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* ¿Cuál elegir? */}
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
            <span className="mt-0.5 text-base">💡</span>
            <p>
              <strong className="text-slate-900">¿No sabes cuál elegir?</strong> Si ya usas
              Claude.ai en tu trabajo, elige el conector Claude. Si usas ChatGPT con conectores,
              elige ChatGPT. Ambos ofrecen las mismas capacidades de Holded.{' '}
              <Link href="/contacto" className="font-medium text-[#ff5460] hover:underline">
                Pregúntanos →
              </Link>
            </p>
          </div>

          {/* Quick links */}
          <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Accesos rápidos
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {shortcuts.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              Cada conector mantiene su propia documentación, privacidad, DPA y soporte. El alcance
              de acceso depende de la cuenta de Holded conectada.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
