import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ChefHat,
  Landmark,
  ShieldCheck,
  Sparkles,
  Users,
  Utensils,
} from 'lucide-react';
import Link from 'next/link';
import Header from './Header';
import { Container, Footer } from '../lib/home/ui';

const ISAAK_URL = 'https://isaak.verifactu.business';

const navLinks = [
  { label: 'Isaak', href: ISAAK_URL },
  { label: 'Integraciones', href: '/integraciones' },
  { label: 'Asesorías', href: '/asesorias' },
  { label: 'Precios', href: '/precios' },
  { label: 'Contacto', href: '/contacto' },
];

const pillars = [
  {
    title: 'Cumplimiento VeriFactu',
    body: 'Registro AEAT, firma garantizada y trazabilidad completa. Preparado para la Ley Antifraude sin que tengas que gestionar nada manualmente.',
    icon: ShieldCheck,
  },
  {
    title: 'Tu IA fiscal y contable',
    body: 'Isaak entiende tu negocio. Pregunta en español, obtén respuestas con datos reales: IVA estimado, ingresos, gastos, alertas fiscales y modelos AEAT.',
    icon: Sparkles,
  },
  {
    title: 'Tu software sectorial, conectado',
    body: 'HotelGest, Revo XEF, WooCommerce, Salesforce, Mindbody y más. Isaak lee tu operativa directamente y la convierte en contabilidad inteligente.',
    icon: Bot,
  },
  {
    title: 'Open Banking',
    body: 'Tus cuentas bancarias en tiempo real. Conciliación automática con facturas, IVA estimado siempre actualizado.',
    icon: Landmark,
  },
];

const audienceCards = [
  {
    icon: ChefHat,
    label: 'Hostelería y restauración',
    body: 'Conecta tu TPV (Revo XEF, Loyverse) y ten la contabilidad al día sin tocar ningún ERP.',
  },
  {
    icon: Building2,
    label: 'Hoteles y alojamientos',
    body: 'HotelGest conectado. Reservas, ingresos y pagos convertidos en fiscalidad automática.',
  },
  {
    icon: Utensils,
    label: 'Comercio y e-commerce',
    body: 'WooCommerce, PrestaShop y marketplaces. Facturas, IVA y cierres de caja listos para la AEAT.',
  },
  {
    icon: Users,
    label: 'Asesorías y gestorías',
    body: 'Gestiona múltiples clientes desde un único panel. Modo asesoría con contexto de empresa por cliente.',
  },
];

const ECOSYSTEM_CARDS = [
  {
    icon: ShieldCheck,
    title: 'VeriFactu · AEAT',
    desc: 'Registro de facturas con firma garantizada. Cumplimiento Ley Antifraude sin esfuerzo.',
  },
  {
    icon: Sparkles,
    title: 'IA Fiscal y Contable',
    desc: 'Pregunta en español, obtén respuestas con datos reales. IVA, modelos y alertas incluidas.',
  },
  {
    icon: Bot,
    title: 'Integraciones sectoriales',
    desc: 'Hoteles, restaurantes, comercio, clínicas, CRM. Tu software de sector ya conectado.',
  },
  {
    icon: Landmark,
    title: 'Open Banking',
    desc: 'Movimientos bancarios en tiempo real. Conciliación automática con tus facturas.',
  },
];

export default function LandingPublicHubPhase1() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] py-16 sm:py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                Verifactu Business
              </div>
              <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl sm:leading-[1.06]">
                El copiloto fiscal y contable para tu negocio. Sin ERP de por medio.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                Isaak conecta con el software que ya usas en tu sector, automatiza tu contabilidad,
                cumple con la AEAT y responde tus preguntas en español — sin instalar ni aprender
                ningún programa de contabilidad.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Sin tarjeta
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  IA incluida desde el plan gratuito
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  VeriFactu y AEAT incluidos
                </span>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href={ISAAK_URL}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
                >
                  Empezar gratis
                  <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  href="/integraciones"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Ver integraciones
                </Link>
                <Link
                  href="/asesorias"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Soy asesoría
                </Link>
              </div>
            </div>

            {/* Right: Ecosystem cards */}
            <div className="space-y-3">
              {ECOSYSTEM_CARDS.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#2361d8]/20 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2361d8]/10 text-[#2361d8]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-[#011c67]">{title}</span>
                    <div className="mt-0.5 text-sm leading-6 text-slate-500">{desc}</div>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-700">
                    Disponible hoy · Plan gratuito
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-emerald-600">
                  Sin tarjeta · Listo en 2 minutos · Cumplimiento AEAT incluido
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── PILARES ──────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              Todo en uno
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Fiscalidad, contabilidad e inteligencia sectorial. Sin programas intermedios.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article
                  key={pillar.title}
                  className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2361d8]/10 text-[#2361d8]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{pillar.body}</p>
                </article>
              );
            })}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/integraciones"
              className="text-sm font-semibold text-[#2361d8] hover:underline"
            >
              Ver todas las integraciones disponibles →
            </Link>
          </div>
        </Container>
      </section>

      {/* ── PARA QUIÉN ───────────────────────────────────────────────────── */}
      <section className="border-y border-slate-200 bg-slate-50/70 py-16 sm:py-20">
        <Container>
          <div className="mb-10 max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              Diseñado para cada sector
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Tu sector ya tiene su integración. Isaak hace el resto.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              No necesitas cambiar de software ni aprender contabilidad. Conecta el programa que ya
              usas cada día y deja que Isaak gestione la parte fiscal, contable y tributaria por ti.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {audienceCards.map(({ icon: Icon, label, body }) => (
              <article
                key={label}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2361d8]/10 text-[#2361d8]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/integraciones"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#2361d8] hover:underline"
            >
              Ver el catálogo completo de integraciones
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="rounded-[2rem] border border-slate-200 bg-[#011c67] px-6 py-8 text-white shadow-sm sm:px-10 sm:py-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                  Empieza hoy — gratis
                </div>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Deja de perder tiempo con la contabilidad.
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-blue-100 sm:text-base">
                  Isaak hace tu fiscalidad y contabilidad desde el primer día. Sin ERP, sin
                  formación, sin papeles. Solo pregunta y Isaak te responde con datos reales de tu
                  negocio.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <a
                  href={ISAAK_URL}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#011c67] transition hover:bg-slate-100"
                >
                  Empezar gratis
                  <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  href="/integraciones"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Ver integraciones
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
