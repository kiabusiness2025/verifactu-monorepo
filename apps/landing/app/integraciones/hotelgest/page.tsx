import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  FileText,
  Hotel,
  Key,
  Landmark,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Header from '../../components/Header';
import { Container, Footer } from '../../lib/home/ui';
import { getIsaakUrl } from '../../lib/urls';

export const metadata: Metadata = {
  title: 'Isaak para hoteles — HotelGest conectado | Verifactu Business',
  description:
    'Isaak es el centro de operaciones de tu hotel: conecta HotelGest, tu banco y la AEAT en un chat. Ocupación, RevPAR, modelo 303, SES.Hospedajes y más — en tiempo real.',
  openGraph: {
    title: 'Isaak para hoteles — HotelGest conectado',
    description:
      'Isaak es el centro de operaciones de tu hotel. HotelGest + banco + AEAT en un chat, en tiempo real.',
    type: 'website',
    locale: 'es_ES',
    url: 'https://verifactu.business/integraciones/hotelgest',
    siteName: 'Verifactu Business',
  },
};

const navLinks = [
  { label: 'Integraciones', href: '/integraciones' },
  { label: 'Precios', href: '/precios' },
  { label: 'Contacto', href: '/contacto' },
];

const CHAT_EXAMPLES = [
  {
    q: '¿Cuántas reservas confirmadas tenemos para julio?',
    a: 'Tienes 47 reservas confirmadas para julio: 31 directas, 11 vía Booking.com y 5 vía Expedia. Ocupación estimada del 82% sobre 57 habitaciones disponibles.',
    category: 'Operaciones',
  },
  {
    q: '¿Cuánto hemos facturado este mes entre los 3 hoteles?',
    a: 'Facturación total del mes: 84.320 €. Hotel A: 41.200 € · Hotel B: 28.150 € · Hotel C: 14.970 €. Vs. mismo mes año anterior: +12,4%.',
    category: 'Finanzas',
  },
  {
    q: '¿Qué facturas de clientes están pendientes de cobro?',
    a: '6 facturas pendientes por un total de 9.840 €. La más antigua lleva 47 días sin cobrar (Grupo Viajes Sol, 3.200 €). ¿Quieres que prepare un recordatorio?',
    category: 'Cobros',
  },
  {
    q: 'Prepárame el desglose de IVA para el modelo 303 de este trimestre',
    a: 'IVA repercutido: 8.432 € (base 84.320 € al 10% hostelería). IVA soportado: 3.210 €. Cuota diferencial a ingresar: 5.222 €. Plazo: 20 de julio.',
    category: 'Fiscal',
  },
  {
    q: '¿Cuál es el RevPAR de este mes vs el año pasado?',
    a: 'RevPAR actual: 98,40 €/habitación. Año anterior: 87,20 €. Mejora del 12,8%, impulsada por aumento de tarifa media ADR (+8%) y ocupación (+4,8 pp).',
    category: 'KPIs',
  },
  {
    q: '¿Qué canal de reservas genera más ingresos?',
    a: 'Canal directo (web propia): 41% de ingresos con comisión 0%. Booking.com: 35% con comisión media 15%. Expedia: 14%. Agencias: 10%. Tu canal más rentable es el directo.',
    category: 'Estrategia',
  },
];

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Conecta tu cuenta HotelGest',
    body: 'Entra en Isaak → Integraciones → HotelGest. Pega la API key de tu cuenta. Isaak la cifra con AES-256 y la guarda de forma segura.',
    icon: Key,
  },
  {
    step: '2',
    title: 'Isaak lee tus datos en tiempo real',
    body: 'Reservas, facturas, ocupación, RevPAR, cobros pendientes. Isaak obtiene los datos actualizados de HotelGest cada vez que preguntas.',
    icon: Zap,
  },
  {
    step: '3',
    title: 'Pregunta lo que necesites',
    body: 'En español, sin comandos. "¿Cómo va el mes?" "¿Cuánto IVA tengo que declarar?" "¿Qué reservas se van esta semana?" Isaak responde con datos reales.',
    icon: MessageSquare,
  },
];

const FISCAL_BENEFITS = [
  'IVA al 10% (hostelería) calculado automáticamente — sin errores de clasificación',
  'Modelo 303 trimestral pre-rellenado con datos reales de HotelGest',
  'Alerta D-15 antes del vencimiento del IVA y IRPF trimestral',
  'Desglose por tipo de ingreso: habitaciones, restaurante, eventos, extras',
  'Facturas pendientes de cobro con días vencidos y sugerencia de acción',
  'Comparativa mensual y anual de ingresos para el modelo 390',
  'SES.Hospedajes: alerta automática de partes de viajeros (obligatorio en 24h)',
];

export default function HotelGestLandingPage() {
  const isaakUrl = getIsaakUrl();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#010b2e] pb-24 pt-20 sm:pb-32 sm:pt-28">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-[15%] top-[20%] h-[400px] w-[400px] rounded-full bg-blue-600/12 blur-[100px]" />
          <div className="absolute bottom-[10%] right-[10%] h-[300px] w-[300px] rounded-full bg-blue-400/8 blur-[120px]" />
        </div>

        <Container>
          <div className="relative max-w-3xl">
            <div className="mb-4">
              <Link
                href="/integraciones"
                className="text-xs font-medium text-blue-400/70 hover:text-blue-300"
              >
                ← Integraciones
              </Link>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              HotelGest · Activo en producción
            </div>

            <h1 className="mt-6 text-4xl font-black leading-[1.06] tracking-tight text-white sm:text-5xl">
              HotelGest lleva tu hotel.
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Isaak lo dirige.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
              Tu hotel ya tiene su software de gestión. Isaak se convierte en la capa de
              inteligencia encima — conecta HotelGest con tu banco y la AEAT, interpreta tus datos
              en tiempo real y te dice qué hacer a continuación. Sin exportar Excel. Sin esperar al
              gestor.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={isaakUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:bg-[#1f55c0]"
              >
                Conectar HotelGest
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <Link
                href="/contacto"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-bold text-white/75 transition hover:border-white/30 hover:text-white"
              >
                Hablar con ventas
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
              {[
                'Sin cambiar tu software',
                'Holded opcional',
                'CFO digital incluido',
                'IA incluida en el plan',
              ].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Hub — centro de operaciones */}
      <section className="overflow-hidden border-b border-slate-100 bg-white py-20 sm:py-24">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/20 bg-[#2361d8]/6 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2361d8]">
              <Sparkles className="h-3.5 w-3.5" />
              Arquitectura
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-[#011c67] sm:text-4xl">
              El centro de operaciones de tu hotel
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-500">
              Isaak no es otro software que tienes que aprender. Es la capa de inteligencia que
              conecta lo que ya usas y lo convierte en decisiones.
            </p>
          </div>

          {/* Hub diagram */}
          <div className="mt-16 grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
            {/* Inputs */}
            <div className="flex flex-col gap-4">
              {[
                {
                  icon: Hotel,
                  label: 'HotelGest',
                  desc: 'Reservas · Facturas · Ocupación · RevPAR',
                  badge: 'Principal',
                  badgeColor: 'bg-emerald-100 text-emerald-700',
                  highlight: true,
                },
                {
                  icon: Building2,
                  label: 'Holded',
                  desc: 'Contabilidad · Asientos · Libro mayor',
                  badge: 'Opcional',
                  badgeColor: 'bg-amber-100 text-amber-700',
                  highlight: false,
                },
                {
                  icon: Landmark,
                  label: 'Open Banking',
                  desc: 'Movimientos · Conciliación · Tesorería',
                  badge: 'Incluido',
                  badgeColor: 'bg-blue-100 text-blue-700',
                  highlight: false,
                },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className={`flex items-center gap-4 rounded-2xl border p-4 ${
                      s.highlight
                        ? 'border-[#2361d8]/25 bg-[#2361d8]/4 shadow-sm'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        s.highlight ? 'bg-[#2361d8]' : 'bg-white border border-slate-200'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${s.highlight ? 'text-white' : 'text-slate-500'}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{s.label}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.badgeColor}`}
                        >
                          {s.badge}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Center: ISAAK hub */}
            <div className="flex flex-col items-center gap-3 py-4">
              {/* Arrow row */}
              <div className="hidden items-center gap-0 lg:flex">
                <div className="h-px w-10 bg-gradient-to-r from-slate-200 to-[#2361d8]/40" />
                <ChevronRight className="h-4 w-4 text-[#2361d8]/60" />
              </div>

              {/* Hub circle */}
              <div className="relative flex h-32 w-32 flex-col items-center justify-center rounded-full border-2 border-[#2361d8]/40 bg-[#2361d8] shadow-2xl shadow-blue-500/40 ring-8 ring-[#2361d8]/10">
                <span className="text-xl font-black tracking-tight text-white">ISAAK</span>
                <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-blue-200">
                  hub central
                </span>
              </div>

              {/* Arrow row */}
              <div className="hidden items-center gap-0 lg:flex">
                <ChevronRight className="h-4 w-4 text-[#2361d8]/60" />
                <div className="h-px w-10 bg-gradient-to-l from-slate-200 to-[#2361d8]/40" />
              </div>
            </div>

            {/* Outputs */}
            <div className="flex flex-col gap-4">
              {[
                {
                  icon: MessageSquare,
                  label: 'Chat en español',
                  desc: 'Preguntas, análisis, asesoramiento — respuestas con datos reales',
                },
                {
                  icon: FileText,
                  label: 'Modelos AEAT pre-rellenados',
                  desc: 'Modelo 303, 390, 130 — IVA al 10% calculado automáticamente',
                },
                {
                  icon: Bell,
                  label: 'Alertas proactivas',
                  desc: 'WhatsApp, push, email — vencimientos, cobros, anomalías',
                },
              ].map((o) => {
                const Icon = o.icon;
                return (
                  <div
                    key={o.label}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
                      <Icon className="h-5 w-5 text-[#2361d8]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{o.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{o.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            * Holded es opcional. Si ya facturas desde HotelGest, Isaak funciona sin él para las
            operaciones diarias. Holded añade la capa de contabilidad formal cuando la necesitas.
          </p>
        </Container>
      </section>

      {/* Chat examples */}
      <section className="bg-[#f0f5ff] py-20 sm:py-24">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/20 bg-[#2361d8]/8 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2361d8]">
              <Sparkles className="h-3.5 w-3.5" />
              Ejemplos reales
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-[#011c67] sm:text-4xl">
              Esto es lo que puedes preguntarle a Isaak
            </h2>
            <p className="mt-4 text-base text-slate-500">
              Con HotelGest conectado, Isaak responde con tus datos reales — no estimaciones, no
              ejemplos genéricos.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CHAT_EXAMPLES.map((ex) => (
              <div
                key={ex.q}
                className="flex flex-col rounded-2xl border border-[#2361d8]/10 bg-white p-6 shadow-sm"
              >
                <span className="mb-3 inline-flex self-start rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2361d8]">
                  {ex.category}
                </span>
                <div className="mb-3 flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#2361d8] px-4 py-2.5">
                    <p className="text-xs font-medium leading-5 text-white">{ex.q}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-700">
                    I
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-slate-50 px-4 py-2.5">
                    <p className="text-xs leading-5 text-slate-700">{ex.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section className="bg-white py-20 sm:py-24">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-[#011c67] sm:text-4xl">
              Listo en 3 pasos
            </h2>
            <p className="mt-4 text-base text-slate-500">
              Sin instalaciones, sin soporte técnico, sin migraciones. Solo una API key.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="relative flex flex-col items-start">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2361d8] text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="absolute left-6 top-6 -z-10 hidden h-px w-full bg-slate-200 sm:block" />
                  <h3 className="mt-5 text-lg font-bold text-[#011c67]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{step.body}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Fiscal benefits */}
      <section className="bg-[#010b2e] py-20 sm:py-24">
        <Container>
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Fiscal · Hostelería
                </div>
                <h2 className="mt-5 text-3xl font-black leading-snug text-white sm:text-4xl">
                  IVA al 10%, modelo 303
                  <br />
                  <span className="text-blue-400">sin cálculos manuales</span>
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-400">
                  El sector hotelero tiene fiscalidad específica — IVA reducido al 10%, desglose por
                  tipo de servicio, SES.Hospedajes, retenciones. Isaak conoce las reglas del sector
                  y las aplica automáticamente con los datos reales de tu HotelGest.
                </p>
                <a
                  href={isaakUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1f55c0]"
                >
                  Conectar ahora
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <ul className="space-y-3">
                {FISCAL_BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="text-sm leading-6 text-slate-300">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Multi-hotel */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600">
              <Hotel className="h-3.5 w-3.5" />
              Multi-hotel
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-[#011c67] sm:text-3xl">
              Varios hoteles, una sola vista
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Isaak agrega los datos de todos tus hoteles HotelGest en una sola conversación.
              Compara ocupación entre propiedades, identifica cuál arrastra más cobros pendientes y
              obtén el IVA consolidado de toda la cadena — todo desde el chat.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: TrendingUp,
                  label: 'KPIs consolidados',
                  desc: 'Ocupación, RevPAR y ADR de todos tus hoteles en un vistazo',
                },
                {
                  icon: ShieldCheck,
                  label: 'Fiscal unificado',
                  desc: 'IVA y modelos AEAT de todas las propiedades en un solo informe',
                },
                {
                  icon: Zap,
                  label: 'Alertas integradas',
                  desc: 'Isaak detecta anomalías en cualquiera de tus hoteles y te avisa',
                },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.label}
                    className="rounded-2xl border border-slate-200 bg-white p-5 text-left"
                  >
                    <Icon className="h-5 w-5 text-[#2361d8]" />
                    <p className="mt-3 text-sm font-bold text-[#011c67]">{f.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      {/* Roadmap teaser — "Hoy trabajan juntos. Mañana, solo Isaak." */}
      <section className="border-y border-[#2361d8]/10 bg-[#f4f8ff] py-20 sm:py-24">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/20 bg-white px-4 py-1.5 text-xs font-semibold text-[#2361d8]">
              Roadmap · Próximamente
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-[#011c67] sm:text-4xl">
              Hoy trabajan juntos.
              <br />
              <span className="text-[#2361d8]">Mañana, solo Isaak.</span>
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Estamos construyendo el camino para que Isaak gestione la contabilidad y los impuestos
              directamente desde tus datos de HotelGest — sin necesidad de ningún software
              adicional.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {/* HOY */}
            <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
              <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Hoy · Disponible
              </div>
              <h3 className="text-lg font-black text-[#011c67]">HotelGest + Holded* + Isaak</h3>
              <ul className="mt-5 space-y-3">
                {[
                  'HotelGest → operaciones, reservas, KPIs en tiempo real',
                  'Isaak → inteligencia, asesoramiento y alertas proactivas',
                  'Holded → contabilidad formal (opcional, si lo usas)',
                  'Open Banking → conciliación automática de cobros',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[11px] leading-5 text-slate-400">
                * Si ya facturas desde HotelGest, no necesitas Holded para las operaciones diarias.
                Isaak funciona como centro de operaciones sin él.
              </p>
            </div>

            {/* PRÓXIMAMENTE */}
            <div className="rounded-2xl border border-dashed border-[#2361d8]/30 bg-[#2361d8]/3 p-8">
              <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-[#2361d8]/10 px-3 py-1 text-xs font-bold text-[#2361d8]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2361d8]" />
                Próximamente · En desarrollo
              </div>
              <h3 className="text-lg font-black text-[#011c67]">Solo HotelGest + Isaak</h3>
              <ul className="mt-5 space-y-3">
                {[
                  'Isaak lleva la contabilidad completa desde HotelGest',
                  'Modelos 303, 130 y 390 presentados automáticamente',
                  'Asientos contables generados desde los datos del PMS',
                  'Sin necesidad de ningún ERP o software adicional',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#2361d8]/60" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[11px] font-semibold leading-5 text-[#2361d8]">
                El CFO digital completo de tu hotel — todo en un chat.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-[#010b2e] py-24 sm:py-32">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[130px]" />
        </div>
        <Container>
          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
              Tu hotel tiene datos.
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Isaak los convierte en decisiones.
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-slate-400">
              Conecta HotelGest en 2 minutos. Sin tarjeta. Sin configuración técnica. Isaak es el
              CFO digital que tu hotel no podía permitirse hasta ahora.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <a
                href={isaakUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-8 py-4 text-base font-bold text-white shadow-xl shadow-blue-500/30 transition hover:bg-[#1f55c0]"
              >
                Empezar gratis
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>
              <Link
                href="/contacto"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-8 py-4 text-base font-bold text-white/75 transition hover:border-white/30 hover:text-white"
              >
                Hablar con el equipo
              </Link>
            </div>
            <p className="mt-6 text-xs text-slate-700">
              Plan Business · 149 €/mes · Multi-hotel · IA incluida · Cancela cuando quieras
            </p>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
