import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Layers,
  MessageCircleMore,
  PlayCircle,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Holded con IA — Claude y ChatGPT | Verifactu Business',
  description:
    'Conecta Holded con Claude o ChatGPT. Pregunta por facturas, clientes, contabilidad y proyectos en lenguaje claro.',
  alternates: {
    canonical: '/',
  },
};

function SectionPill({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 shadow-sm backdrop-blur">
      <Icon className="h-3.5 w-3.5 text-[#ff5460]" />
      {children}
    </div>
  );
}

const connectorFeatures = [
  'Facturas y contactos',
  'Cuentas contables y diario',
  'Alcance cerrado por tenant',
  'Borradores de factura con confirmación',
];

const whyItems = [
  {
    icon: ShieldCheck,
    title: 'Solo lectura por defecto',
    desc: 'Consulta datos de Holded sin modificar tu cuenta. Crear un borrador de factura requiere confirmación explícita antes.',
  },
  {
    icon: Zap,
    title: 'Especialistas en Holded',
    desc: 'Diseñados específicamente para Holded. Conocemos el ERP, sus módulos y lo que realmente necesitan sus usuarios.',
  },
  {
    icon: Users,
    title: 'Soporte real incluido',
    desc: 'Chat de soporte disponible en cualquier página. Y si necesitas ayuda humana, el equipo de Verifactu Business responde por email en horario laboral.',
  },
];

const serviceItems = [
  {
    icon: Settings2,
    title: 'Onboarding de Holded',
    desc: 'Configuración guiada de tu cuenta de Holded. Empiezas a usarlo bien desde el primer día, sin atascos.',
  },
  {
    icon: Layers,
    title: 'Migración de datos',
    desc: 'Migración de ejercicios fiscales completos, inventario y productos desde tu software actual a Holded.',
  },
  {
    icon: GraduationCap,
    title: 'Formación personalizada',
    desc: 'Sesiones adaptadas a tu equipo y al uso real que hacéis de Holded en tu empresa.',
  },
];

export default function HoldedHomePage() {
  return (
    <main className="page-enter min-h-screen text-slate-900">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden pb-16 pt-12 sm:pt-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8rem] top-[-4rem] h-[22rem] w-[22rem] rounded-full bg-[#ff5460]/8 blur-3xl" />
          <div className="absolute right-[-6rem] top-[6rem] h-[18rem] w-[18rem] rounded-full bg-sky-200/30 blur-3xl" />
          <div className="absolute bottom-[-6rem] left-[30%] h-[16rem] w-[16rem] rounded-full bg-violet-200/22 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.92fr] lg:items-center">
            {/* Left: copy */}
            <div>
              <SectionPill icon={Sparkles}>Verifactu Business</SectionPill>

              <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-[-0.04em] text-slate-950 sm:text-[3.25rem] sm:leading-[1.05]">
                Conecta Holded con la IA que ya usas.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Pregunta por facturas, clientes, contabilidad y proyectos en lenguaje claro, sin
                navegar menús ni exportar hojas de cálculo.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/conectores/claude"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4570C] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_-14px_rgba(212,87,12,0.55)] transition hover:bg-[#B84509]"
                >
                  Conector para Claude
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/conectores/chatgpt"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#10a37f] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_-14px_rgba(16,163,127,0.45)] transition hover:bg-[#0d9270]"
                >
                  Conector para ChatGPT
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <p className="mt-5 flex items-center gap-2 text-sm text-slate-500">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                Solo lectura por defecto - borradores solo con confirmación
              </p>
            </div>

            {/* Right: dual connector status card */}
            <div className="lg:pl-4">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.18)]">
                {/* Header */}
                <div className="mb-4 flex items-center gap-2">
                  <Image
                    src="/brand/holded/holded-diamond-logo.png"
                    alt="Holded"
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px]"
                  />
                  <span className="text-xs font-semibold text-slate-600">Holded conectado con</span>
                </div>

                {/* Claude */}
                <div className="rounded-[1.5rem] border border-[#D4570C]/20 bg-[#D4570C]/[0.05] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <Image
                          src="/brand/claude-logo.svg"
                          alt="Claude"
                          width={26}
                          height={26}
                          className="h-[26px] w-[26px] object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Claude</p>
                        <p className="text-[11px] text-slate-500">MCP · OAuth 2.0</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full border border-[#D4570C]/20 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#D4570C]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#D4570C]" />
                      Activo
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {['Facturas y contactos', 'Cuentas contables', 'Diario con fechas'].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-[11px] text-slate-600">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#D4570C]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/conectores/claude"
                    className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#D4570C] hover:underline"
                  >
                    Ver conector <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="my-3 flex items-center gap-3 text-[11px] text-slate-400">
                  <div className="h-px flex-1 bg-slate-100" />o también
                  <div className="h-px flex-1 bg-slate-100" />
                </div>

                {/* ChatGPT */}
                <div className="rounded-[1.5rem] border border-[#10a37f]/20 bg-[#10a37f]/[0.05] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <Image
                          src="/brand/chatgpt-logo.png"
                          alt="ChatGPT"
                          width={26}
                          height={26}
                          className="h-[26px] w-[26px] object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">ChatGPT</p>
                        <p className="text-[11px] text-slate-500">Apps SDK / MCP</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full border border-[#10a37f]/20 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#10a37f]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#10a37f]" />
                      Lanzamiento
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {['Facturas y contactos', 'Cuentas contables', 'Diario con fechas'].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-[11px] text-slate-600">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#10a37f]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/conectores/chatgpt"
                    className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#10a37f] hover:underline"
                  >
                    Ver conector <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>

                <p className="mt-4 text-center text-[10px] text-slate-400">
                  Verifactu Business — No somos Holded
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DOS CONECTORES ── */}
      <section className="border-y border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <SectionPill icon={Bot}>Dos conectores</SectionPill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.5rem]">
              Elige la plataforma con la que ya trabajas.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Ambos conectores dan acceso a las mismas capacidades de Holded. La diferencia está en
              el protocolo y el flujo de conexión.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {/* Claude */}
            <div className="flex flex-col rounded-[2rem] border border-[#D4570C]/20 bg-[linear-gradient(160deg,#fff7ed_0%,#ffffff_100%)] p-7 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <Image
                    src="/brand/claude-logo.svg"
                    alt="Claude"
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#D4570C]/25 bg-white px-3 py-1 text-xs font-semibold text-[#D4570C]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  En producción
                </div>
              </div>
              <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
                Holded para Claude
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Conectate mediante el flujo seguro de Verifactu para usar Holded desde Claude. Las
                credenciales se guardan server-side y no se muestran a Claude.
              </p>
              <ul className="mt-5 space-y-2">
                {[
                  'Claude.ai Desktop y Web',
                  'Credenciales protegidas server-side',
                  'Protocolo MCP para Claude',
                  ...connectorFeatures.slice(2),
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-[#D4570C]" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex gap-3 pt-6">
                <Link
                  href="/conectores/claude"
                  className="inline-flex items-center gap-2 rounded-full bg-[#D4570C] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B84509]"
                >
                  Ver conector Claude
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/docs/claude"
                  className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Documentación
                </Link>
              </div>
            </div>

            {/* ChatGPT */}
            <div className="flex flex-col rounded-[2rem] border border-[#10a37f]/20 bg-[linear-gradient(160deg,#f0fdf9_0%,#ffffff_100%)] p-7 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <Image
                    src="/brand/chatgpt-logo.png"
                    alt="ChatGPT"
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#10a37f]/25 bg-white px-3 py-1 text-xs font-semibold text-[#10a37f]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  En lanzamiento
                </div>
              </div>
              <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
                Holded para ChatGPT
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Conectate mediante el flujo seguro de Verifactu para usar Holded desde ChatGPT. Las
                credenciales se guardan server-side y no se muestran a OpenAI.
              </p>
              <ul className="mt-5 space-y-2">
                {[
                  'ChatGPT Plus, Pro, Business, Enterprise y Edu',
                  'Credenciales protegidas server-side',
                  'Apps SDK / MCP para ChatGPT',
                  connectorFeatures[3],
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-[#10a37f]" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex gap-3 pt-6">
                <Link
                  href="/conectores/chatgpt"
                  className="inline-flex items-center gap-2 rounded-full bg-[#10a37f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d9270]"
                >
                  Ver conector ChatGPT
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/conectores/chatgpt/docs"
                  className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Documentación
                </Link>
              </div>
            </div>
          </div>

          {/* Comparison helper */}
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
            <MessageCircleMore className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>
              <strong className="text-slate-900">¿No sabes cuál elegir?</strong> Si ya usas
              Claude.ai en tu trabajo, elige el conector Claude. Si usas ChatGPT con conectores,
              elige ChatGPT. Ambos ofrecen las mismas capacidades de Holded.{' '}
              <Link href="/contacto" className="font-medium text-[#ff5460] hover:underline">
                Pregúntanos →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── POR QUÉ VERIFACTU BUSINESS ── */}
      <section className="py-14 sm:py-18">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 max-w-xl">
            <SectionPill icon={ShieldCheck}>Por qué Verifactu Business</SectionPill>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-950 sm:text-[2rem]">
              Especialistas en Holded. Con soporte real.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {whyItems.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff5460]/10">
                  <Icon className="h-5 w-5 text-[#ff5460]" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICIOS ── */}
      <section className="border-y border-slate-200/80 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_55%,#f6fbff_100%)] py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <SectionPill icon={GraduationCap}>Servicios para Holded</SectionPill>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.5rem]">
              Más allá del conector.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Si estás empezando con Holded, migrando desde otro software o necesitas sacarle más
              partido, te ayudamos.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {serviceItems.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff5460]/10">
                  <Icon className="h-5 w-5 text-[#ff5460]" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-950">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{desc}</p>
                <div className="mt-5">
                  <Link
                    href="/contacto"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#ff5460] transition hover:underline"
                  >
                    Más información <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO ── */}
      <section className="py-14 sm:py-18">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2.25rem] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.3)] sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <SectionPill icon={PlayCircle}>Demo guiada</SectionPill>
                <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-950 sm:text-[2rem]">
                  Mira cómo funciona antes de conectar.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
                  Una demo real con datos de Holded: facturas, contactos, cuentas contables, diario
                  con rango de fechas y borradores con confirmación. Sin registro.
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  href="/demo-recording"
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#ff5460] px-7 py-4 text-sm font-semibold text-white shadow-[0_16px_40px_-20px_rgba(255,84,96,0.6)] transition hover:bg-[#ef4654]"
                >
                  <PlayCircle className="h-5 w-5" />
                  Ver demos
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="border-t border-slate-200/80 bg-white pb-16 pt-14 sm:pb-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <SectionPill icon={Sparkles}>Empieza hoy</SectionPill>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.5rem]">
            Tu Holded, por fin en lenguaje claro.
          </h2>
          <p className="mt-5 mx-auto max-w-2xl text-base leading-8 text-slate-600">
            Sin aprender el ERP. Sin esperar al gestor. Elige el conector para la IA que ya usas y
            empieza a entender tus números hoy.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/conectores/claude"
              className="inline-flex items-center gap-2 rounded-full bg-[#D4570C] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_-14px_rgba(212,87,12,0.55)] transition hover:bg-[#B84509]"
            >
              Conector para Claude
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/conectores/chatgpt"
              className="inline-flex items-center gap-2 rounded-full bg-[#10a37f] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_-14px_rgba(16,163,127,0.45)] transition hover:bg-[#0d9270]"
            >
              Conector para ChatGPT
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contacto"
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Hablar con el equipo
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
