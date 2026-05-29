import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Landmark,
  Mail,
  MessageCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import SectorLogoItem from './SectorLogoItem';
import IsaakLiveDemo from './IsaakLiveDemo';
import IsaakMetricsBar from './IsaakMetricsBar';

// ── Data ─────────────────────────────────────────────────────────────────────

const TIME_PAINS = [
  'Buscar facturas de meses anteriores para el gestor',
  'Esperar al asesor para saber cómo van las cuentas de verdad',
  'Cuadrar manualmente el banco con los gastos del mes',
  'Revisar si hay obligaciones fiscales próximas de vencer',
  'Preparar el resumen trimestral en hojas de cálculo',
];

const ERROR_PAINS = [
  'Un decimal mal → expediente sancionador de la AEAT',
  'Factura sin IVA registrado → error en el modelo 303',
  'Cobro sin registrar → desfase de tesorería sin detectar',
  'Gasto duplicado → pérdida invisible mes a mes',
  'Fecha de vencimiento ignorada → recargo del 20%',
];

const TRADITIONAL = [
  'La IA es un módulo añadido al software existente',
  'Tú introduces los datos manualmente al sistema',
  'Tu gestor te informa una vez al mes sobre cómo vas',
  'Los errores humanos son inevitables y frecuentes',
  '80% de tu tiempo: gestionando y administrando',
  'Eres esclavo del software, no al revés',
];

const ISAAK_DIFF = [
  'La IA ES el producto — central, no un accesorio',
  'Tú preguntas en español, Isaak conecta y responde',
  'Isaak te alerta en tiempo real, sin esperar a nadie',
  'Los errores se detectan antes de que ocurran',
  '80% de tu tiempo: dirigiendo y tomando decisiones',
  'Tu software sectorial + banco + AEAT — un solo chat',
];

// Software de gestión sectorial — Isaak conecta directamente con el software que el cliente ya usa
const SECTOR_PARTNERS = [
  {
    name: 'HotelGest',
    sector: 'Hoteles',
    domain: 'hotelgest.com',
    href: 'https://hotelgest.com',
    initial: 'H',
    color: '#1a56db',
    connected: true,
  },
  {
    name: 'Inmovilla',
    sector: 'Inmobiliarias',
    domain: 'inmovilla.com',
    href: 'https://inmovilla.com',
    initial: 'I',
    color: '#6D28D9',
    connected: false,
  },
  {
    name: 'Revo XEF',
    sector: 'Restaurantes',
    domain: 'revo.works',
    href: 'https://revo.works',
    initial: 'R',
    color: '#DC2626',
    connected: false,
  },
  {
    name: 'Nubimed',
    sector: 'Clínicas',
    domain: 'nubimed.com',
    href: 'https://nubimed.com',
    initial: 'N',
    color: '#059669',
    connected: false,
  },
  {
    name: 'TeamUp',
    sector: 'Gimnasios',
    domain: 'goteamup.com',
    href: 'https://goteamup.com',
    initial: 'T',
    color: '#D97706',
    connected: false,
  },
  {
    name: 'Loyverse',
    sector: 'Comercio',
    domain: 'loyverse.com',
    href: 'https://loyverse.com',
    initial: 'L',
    color: '#0284C7',
    connected: false,
  },
  {
    name: 'RepairShopr',
    sector: 'Talleres',
    domain: 'repairshopr.com',
    href: 'https://repairshopr.com',
    initial: 'T',
    color: '#7C3AED',
    connected: false,
  },
];

type Connector = {
  name: string;
  tag: string;
  icon: ReactNode;
  desc: string;
  example: string;
};

const CONNECTORS: Connector[] = [
  {
    name: 'Tu software de gestión',
    tag: 'HotelGest · Inmovilla · Revo · Nubimed',
    icon: <Database className="h-5 w-5 text-[#2361d8]" />,
    desc: 'Isaak obtiene datos de tu software sectorial y los convierte en asesoramiento fiscal real. Sin cambiar de programa, sin exportar nada. Incluye Ficha Empresa automática con perfil fiscal y alertas de cumplimiento.',
    example: '¿Cuánto hemos facturado este mes y qué IVA tengo que declarar?',
  },
  {
    name: 'Open Banking',
    tag: 'Tu banco en tiempo real',
    icon: <Landmark className="h-5 w-5 text-[#2361d8]" />,
    desc: 'Movimientos bancarios en tiempo real. Conciliación automática: Isaak cruza transacciones con facturas.',
    example: '¿Qué movimientos no tienen factura asociada?',
  },
  {
    name: 'Google Workspace',
    tag: 'Gmail · Calendar · Drive',
    icon: <Mail className="h-5 w-5 text-[#2361d8]" />,
    desc: 'Lee tu email, gestiona tu calendario y accede a documentos. Isaak conecta la operación diaria con las finanzas.',
    example: '¿Tengo emails sin contestar de clientes con facturas vencidas?',
  },
  {
    name: 'OCR · Facturas',
    tag: 'Extracción automática',
    icon: <FileText className="h-5 w-5 text-[#2361d8]" />,
    desc: 'Sube tickets y facturas en cualquier formato. Isaak extrae todos los datos, los categoriza y los registra.',
    example: '¿Qué gastos del mes no están categorizados todavía?',
  },
  {
    name: 'WhatsApp',
    tag: 'Isaak en tu bolsillo',
    icon: <MessageCircle className="h-5 w-5 text-[#2361d8]" />,
    desc: 'Pregunta a Isaak desde WhatsApp en cualquier momento. Tu empresa siempre disponible desde el móvil.',
    example: '¿Cómo voy hoy? (mientras desayunas)',
  },
  {
    name: 'Verifactu · AEAT',
    tag: 'Obligaciones fiscales',
    icon: <ShieldCheck className="h-5 w-5 text-[#2361d8]" />,
    desc: 'El único plan gratis del mercado que incluye emisión de facturas con registro AEAT real. Sin software adicional, sin cuotas extra.',
    example: 'Emite una factura a nombre de cliente X por 1.200 € + IVA',
  },
];

const PROFILES = [
  {
    type: 'Autónomo',
    quote:
      'Antes el viernes era el día de las cuentas. Dos horas cuadrando Excel, buscando facturas, mirando el banco. Ahora le pregunto a Isaak en 30 segundos y sé exactamente cómo voy.',
    name: 'Carlos M.',
    role: 'Consultor independiente',
    initial: 'C',
  },
  {
    type: 'PYME',
    quote:
      'Mi asesor me llamaba una vez al mes con el resumen. Ahora Isaak me avisa en tiempo real cuando algo no cuadra. Llego a cada reunión con datos reales, no con dudas.',
    name: 'Laura T.',
    role: 'Directora · Empresa de servicios',
    initial: 'L',
  },
  {
    type: 'Asesoría',
    quote:
      'Mis clientes tienen Isaak con mi marca. Resuelve el 80% de las consultas del día a día. Yo me concentro en el asesoramiento estratégico. Es un multiplicador real.',
    name: 'Jordi F.',
    role: 'Socio · Asesoría contable',
    initial: 'J',
  },
];

// V1 LAUNCH (2026-05): planes simplificados a Free + Pro. Los legacy
// (Starter / Pro 49 / Business 149) quedan archivados en Stripe — clientes
// existentes mantienen su plan hasta que cancelen. Ver docs/product/
// ISAAK_LAUNCH_V1_2026-05-28.md.
const PRICE_TEASER = [
  {
    id: 'free',
    name: 'Free',
    price: '0 €',
    tagline: 'Chat ilimitado · Corpus AEAT completo · Sin tarjeta · Sin Holded conectado',
    cta: 'Empezar gratis',
    href: '/signup',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '29 €',
    tagline: 'Holded conectado · 20 tools · Alertas AEAT · IA incluida · 14 días gratis sin tarjeta',
    cta: 'Probar 14 días gratis',
    href: '/signup?plan=pro',
    highlight: true,
  },
  {
    id: 'pro-annual',
    name: 'Pro anual',
    price: '290 €',
    tagline: '🎁 2 meses gratis · Todo lo del plan Pro · Pago una vez al año',
    cta: 'Probar 14 días gratis',
    href: '/signup?plan=pro&cadence=annual',
    highlight: false,
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export const landingMetadata: Metadata = {
  title: 'Isaak | IA empresarial que libera el 80% de tu tiempo',
  description:
    'Isaak es la capa de inteligencia encima del software que ya usas: HotelGest, Revo, Nubimed, tu ERP. Gestión fiscal, alertas proactivas y CFO digital en un chat. Empieza gratis.',
};

export default function IsaakHomeLanding() {
  return (
    <main>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* S1 — HERO                                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#010b2e] pb-24 pt-20 sm:pb-32 sm:pt-28">
        {/* Glow orbs */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="isaak-orb absolute left-[10%] top-[15%] h-[480px] w-[480px] rounded-full bg-blue-600/15 blur-[100px]" />
          <div className="isaak-orb-2 absolute bottom-[10%] right-[8%] h-[360px] w-[360px] rounded-full bg-blue-400/10 blur-[120px]" />
          <div
            className="absolute left-1/2 top-0 h-px w-full max-w-5xl -translate-x-1/2 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"
            style={{ top: 0 }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                IA empresarial · Para el empresario
              </div>

              <h1 className="mt-7 text-4xl font-black leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[48px] xl:text-[56px]">
                Recupera el{' '}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  80%
                </span>{' '}
                de tu tiempo.
                <br />
                Elimina el{' '}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  99%
                </span>{' '}
                de los errores.
                <br />
                <span className="text-white/80">Dirige con IA.</span>
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
                La mayoría de empresarios pasan más tiempo mirando hojas de cálculo y persiguiendo
                facturas que tomando decisiones. Isaak invierte eso:{' '}
                <span className="font-semibold text-slate-300">tú diriges, él gestiona.</span>
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/auth"
                  className="group inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:bg-[#1f55c0] hover:shadow-blue-500/50"
                >
                  Empezar gratis ahora
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#demo"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-bold text-white/75 transition hover:border-white/30 hover:text-white"
                >
                  Ver cómo funciona ↓
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Sin tarjeta
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Sin configuración
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Listo en 2 minutos
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  IA incluida
                </span>
              </div>
            </div>

            {/* Right: Hero video */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-blue-500/20 lg:aspect-auto lg:max-h-[540px]">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover"
                src="/isaak_banner_hero_v2.mp4"
              />
            </div>
          </div>
        </div>

        {/* Bottom fade to white */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-white" />
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* S1b — METRICS BAR                                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <IsaakMetricsBar />

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* S2 — EL PROBLEMA                                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
              El problema real del empresario español
            </div>
            <h2 className="mt-6 text-4xl font-black leading-[1.1] tracking-tight text-slate-950 sm:text-5xl">
              El día a día está diseñado <span className="text-blue-700">para hacerle perder</span>
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-500">
              No es falta de capacidad. Es que el sistema de gestión empresarial está construido
              para contables, no para empresarios.
            </p>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {/* Time column */}
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50/70 p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-black text-slate-950">
                  El 80% de tu jornada se evapora aquí
                </h3>
              </div>
              <div className="mt-6 space-y-2.5">
                {TIME_PAINS.map((p) => (
                  <div
                    key={p}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <p className="text-sm font-medium text-slate-700">{p}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm font-semibold italic text-slate-600">
                "El empresario que debería dirigir, está administrando."
              </p>
            </div>

            {/* Errors column */}
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50/70 p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100">
                  <AlertTriangle className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-black text-slate-950">
                  Un solo error humano puede costarte miles
                </h3>
              </div>
              <div className="mt-6 space-y-2.5">
                {ERROR_PAINS.map((p) => (
                  <div
                    key={p}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <p className="text-sm font-medium text-slate-700">{p}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm font-semibold italic text-slate-600">
                "No es negligencia. Es que el sistema exige demasiado al humano."
              </p>
            </div>
          </div>

          {/* Bridge */}
          <div className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-[2rem] bg-[#011c67]">
            <div className="px-8 py-10 text-center">
              <p className="text-2xl font-black leading-snug text-white sm:text-3xl">
                El problema no es el empresario.
                <br />
                <span className="text-blue-300">Es el sistema en el que opera.</span>
              </p>
              <p className="mt-4 text-base text-blue-200/70">
                Isaak invierte ese sistema por completo.
              </p>
              <a
                href="#demo"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
              >
                Ver cómo lo resuelve ↓
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* S3 — EL PARADIGMA AL REVÉS                                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#030e26] py-20 sm:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-700/10 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
              ✦ El paradigma al revés
            </div>
            <h2 className="mt-6 text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl">
              Mientras el mercado añade IA a sus programas,
              <br />
              <span className="text-blue-400">Isaak pone los programas alrededor de la IA</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            {/* Traditional - faded */}
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <div className="inline-flex rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-bold text-white/60">
                Software de gestión tradicional
              </div>
              <ul className="mt-7 space-y-4">
                {TRADITIONAL.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                    <span className="text-sm leading-6 text-white/70">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Isaak - glowing */}
            <div className="rounded-[2rem] border border-blue-500/25 bg-gradient-to-br from-blue-600/15 to-blue-900/10 p-8 ring-1 ring-blue-500/15">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-bold text-blue-300">
                <Bot size={12} />
                Isaak
              </div>
              <ul className="mt-7 space-y-4">
                {ISAAK_DIFF.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="text-sm font-medium leading-6 text-white/90">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mx-auto mt-14 max-w-3xl text-center">
            <blockquote className="text-2xl font-black leading-snug text-white sm:text-3xl">
              "Isaak no sustituye tu software ni a tu gestor.
              <br />
              <span className="text-blue-400">Es la capa de IA que los conecta</span>
              <br />y los hace hablar en español con el empresario."
            </blockquote>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* S4 — LIVE DEMO                                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section id="demo" className="bg-[#f0f5ff] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/25 bg-[#2361d8]/8 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#2361d8]">
              Demo interactivo
            </div>
            <h2 className="mt-6 text-4xl font-black tracking-tight text-[#011c67] sm:text-5xl">
              Pregúntale a tu empresa.
              <br />
              <span className="text-[#2361d8]">Ahora mismo.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-500">
              Sin dashboards complicados. Sin formación. Sin fricción.
              <br />
              Solo pregunta en español y obtén respuestas con datos reales.
            </p>
          </div>
          <div className="mt-12">
            <IsaakLiveDemo />
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Respuestas en tiempo real
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Sin comandos ni formación
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              IA incluida en el precio
            </span>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* S5 — CONECTORES                                                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-[#011c67] sm:text-4xl">
              Asesora y gestiona tu empresa con los datos que ya tienes
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-500">
              Isaak obtiene los datos directamente de tu software habitual — sin migraciones, sin
              configuración — y los convierte en asesoramiento fiscal y de negocio en tiempo real.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CONNECTORS.map((c) => (
              <div
                key={c.name}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-[#2361d8]/30 hover:shadow-lg hover:shadow-blue-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2361d8]/8 transition group-hover:bg-[#2361d8]/15">
                    {c.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.tag}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-600">{c.desc}</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#2361d8]">
                  <span className="text-slate-400">"</span>
                  {c.example}
                  <span className="text-slate-400">"</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-slate-400">
            HotelGest activo ·{' '}
            <span className="font-semibold text-slate-600">Inmovilla, Revo XEF, Nubimed y más</span>{' '}
            próximamente ·{' '}
            <Link href="/integraciones" className="font-semibold text-[#2361d8] hover:underline">
              Ver todas las integraciones →
            </Link>
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* S5b — ERP ECOSYSTEM                                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Isaak como centro de operaciones
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-[#011c67]">
              La inteligencia encima del software que ya usas.
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Tu hotel tiene HotelGest. Tu restaurante tiene Revo. Isaak se convierte en el centro
              de operaciones encima — sin que cambies nada de lo que ya usas.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-end justify-center gap-6">
            {SECTOR_PARTNERS.map((s) => (
              <SectorLogoItem key={s.name} {...s} />
            ))}

            {/* más sectores */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">
                <span className="text-base font-black text-slate-400">+</span>
              </div>
              <span className="text-xs font-semibold text-slate-500">más</span>
              <span className="text-[10px] text-slate-400">próximamente</span>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            Hoteles · Restaurantes · Clínicas · Inmobiliarias · Gimnasios · Comercio · Talleres y
            más sectores
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* S6 — TESTIMONIOS                                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-[#011c67] sm:text-4xl">
              Empresarios que recuperaron su tiempo
            </h2>
            <p className="mt-4 text-base text-slate-500">
              El 80% del tiempo liberado no es un eslogan. Es lo que dicen los que ya usan Isaak.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PROFILES.map((p) => (
              <article
                key={p.name}
                className="flex flex-col rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
              >
                <div className="inline-flex self-start rounded-full border border-[#2361d8]/20 bg-[#2361d8]/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#2361d8]">
                  {p.type}
                </div>
                <blockquote className="mt-5 flex-1 text-base leading-7 text-slate-700">
                  "{p.quote}"
                </blockquote>
                <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2361d8] text-sm font-bold text-white">
                    {p.initial}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* S6b — CASO DE ÉXITO: EXPERT ESTUDIOS                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="bg-[#010b2e] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-16">
              {/* Left: label + quote */}
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
                  Beta · Primer caso real
                </div>
                <blockquote className="mt-6 text-2xl font-bold leading-snug text-white sm:text-3xl">
                  "Gestionamos el VeriFactu de nuestros clientes como colaboradores sociales de la
                  AEAT. Con Isaak, revisar estados, detectar incidencias y preparar datos para
                  declaraciones pasa de horas a minutos. Primera asesoría en probarlo antes del
                  lanzamiento."
                </blockquote>
                <div className="mt-8 flex items-center gap-4 border-t border-white/10 pt-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2361d8] text-lg font-black text-white">
                    E
                  </div>
                  <div>
                    <p className="font-bold text-white">Expert Estudios Profesionales SLU</p>
                    <p className="mt-0.5 text-sm text-blue-200">
                      Asesoría · Colaborador social AEAT · Beta tester Isaak
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: stats */}
              <div className="grid grid-cols-2 gap-4 lg:w-72 lg:shrink-0">
                {[
                  { value: '-80%', label: 'Tiempo en consultas recurrentes' },
                  { value: '6+', label: 'Clientes gestionados con Isaak' },
                  { value: '100%', label: 'Acceso a datos del ERP + API' },
                  { value: '1ª', label: 'Asesoría beta tester en España' },
                ].map(({ value, label }) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="text-3xl font-black text-white">{value}</div>
                    <div className="mt-1 text-xs leading-5 text-blue-200">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* S7 — PRECIOS TEASER                                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-[#011c67] sm:text-4xl">
              Empieza gratis. La IA va incluida.
            </h2>
            <p className="mt-4 text-base text-slate-500">
              No necesitas ChatGPT ni Claude. Isaak incluye toda la IA en el precio desde el plan
              gratuito.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2 md:grid-cols-4">
            {PRICE_TEASER.map((plan) => (
              <article
                key={plan.id}
                className={`relative flex flex-col rounded-[2rem] border p-7 ${
                  plan.highlight
                    ? 'border-[#2361d8] shadow-xl shadow-blue-100/60 ring-1 ring-[#2361d8]/20'
                    : 'border-slate-200'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-[#2361d8] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                    Más popular
                  </span>
                )}
                <h3 className="text-lg font-black text-[#011c67]">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-950">{plan.price}</span>
                  {plan.id !== 'free' && <span className="text-sm text-slate-500">/mes</span>}
                </div>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{plan.tagline}</p>
                <Link
                  href={plan.href}
                  className={`mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold transition ${
                    plan.highlight
                      ? 'bg-[#2361d8] text-white hover:bg-[#1f55c0]'
                      : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/pricing" className="text-sm font-semibold text-[#2361d8] hover:underline">
              Ver todos los planes con comparativa completa →
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* S8 — CTA FINAL                                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#010b2e] py-24 sm:py-32">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="isaak-orb absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/12 blur-[130px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          {/* Stat strip */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-blue-400/50">
            <span>80% tiempo liberado</span>
            <span className="h-1 w-1 rounded-full bg-blue-600/40" />
            <span>99% menos errores</span>
            <span className="h-1 w-1 rounded-full bg-blue-600/40" />
            <span>24/7 disponible</span>
            <span className="h-1 w-1 rounded-full bg-blue-600/40" />
            <span>IA incluida</span>
          </div>

          <h2 className="mt-10 text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            ¿Cuándo fue la última vez que
            <br />
            tu empresa te dio respuestas
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              en tiempo real?
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Isaak está listo ahora mismo. Gratis. Sin tarjeta. Sin configuración.
            <br />
            Empieza a dirigir en lugar de gestionar.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth"
              className="group inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-8 py-4 text-base font-bold text-white shadow-xl shadow-blue-500/30 transition hover:bg-[#1f55c0] hover:shadow-blue-500/50"
            >
              Empezar gratis en 2 minutos
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-8 py-4 text-base font-bold text-white/75 transition hover:border-white/30 hover:text-white"
            >
              Hablar con el equipo
            </Link>
          </div>

          <p className="mt-8 text-xs text-slate-700">
            Trial de 14 días en plan Pro · Sin tarjeta · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Isaak',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
              'Copiloto fiscal y contable de IA para la pyme española. Capa de inteligencia encima de HotelGest, Revo, Nubimed, tu ERP y banca. Gestión fiscal, alertas proactivas y CFO digital en un chat.',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'EUR',
              description: 'Plan gratuito disponible',
            },
            provider: {
              '@type': 'Organization',
              name: 'Verifactu Business',
              url: 'https://verifactu.business',
            },
          }),
        }}
      />
    </main>
  );
}
