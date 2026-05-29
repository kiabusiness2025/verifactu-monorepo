import { ArrowRight, Check, ExternalLink, Sparkles, Zap } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Isaak | Planes y precios',
  description:
    'Empieza gratis con Isaak. Chat fiscal inteligente con IA incluida — sin necesidad de Claude.ai ni ChatGPT.',
};

type Plan = {
  id: 'free' | 'pro';
  name: string;
  tagline: string;
  price: string;
  priceSuffix?: string;
  annualNote?: string;
  highlight?: 'recommended' | 'free';
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  footnote?: string;
};

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Gratis para siempre. Consultas fiscales y facturas ilimitadas.',
    price: '0 €',
    priceSuffix: '/ mes',
    highlight: 'free',
    features: [
      'Consultas ilimitadas con Isaak en español',
      'Chat fiscal y contable — IVA, IRPF, trámites AEAT',
      'Crea y descarga facturas manuales',
      'Sube documentos y facturas para análisis con IA',
      'Plantillas de factura con tu logo y colores',
      'IA incluida — sin cuenta de Claude ni ChatGPT',
    ],
    ctaLabel: 'Empezar gratis',
    ctaHref: '/auth',
    footnote: 'Sin tarjeta. Sin fecha límite.',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Todo lo que necesitas para gestionar tu negocio con IA.',
    price: '29 €',
    priceSuffix: '/ mes + IVA',
    annualNote: '24 €/mes · 2 meses gratis · facturado anual',
    highlight: 'recommended',
    features: [
      'Todo lo de Free',
      'ERPs conectados — Holded, PrestaShop, Revo, Mindbody y más',
      'Dashboard KPIs: ventas, gastos e IVA en tiempo real',
      'OCR automático — sube facturas y tickets',
      'Google Calendar, Gmail y Drive conectados',
      'Microsoft 365 — Outlook, Calendar, OneDrive',
      'Modelos AEAT: 303, 130, 111, 347 y más',
      'Open Banking — movimientos bancarios en tiempo real',
      'Alertas fiscales proactivas y notificaciones push',
      'Voz — dicta a Isaak y escucha las respuestas',
      'Bot de Telegram @IsaakFiscalBot',
      'Historial completo de conversaciones',
      'IA incluida — Claude Sonnet, sin suscripción adicional',
    ],
    ctaLabel: 'Empezar trial 14 días',
    ctaHref: '/signup?plan=pro',
    footnote: 'Trial 14 días sin tarjeta. IVA no incluido en el precio.',
  },
];

const FAQ = [
  {
    q: '¿Necesito Claude.ai, ChatGPT o cualquier otra suscripción de IA?',
    a: 'No. Isaak incluye toda la IA en el precio — usamos Claude y GPT-4o a través de nuestra propia integración. No necesitas ninguna cuenta adicional en Anthropic ni OpenAI.',
  },
  {
    q: '¿Qué diferencia hay entre Free y Pro?',
    a: 'Free te da acceso al asistente fiscal y a la creación de facturas manuales sin límite. Pro conecta Isaak con tu ERP, banco y herramientas (Google, Microsoft, banca), activa los modelos AEAT y desbloquea todas las integraciones.',
  },
  {
    q: '¿Necesito tarjeta para el trial de 14 días?',
    a: 'No. Te damos 14 días completos de Isaak Pro sin pedir tarjeta. Si decides continuar, te avisamos por email antes de cobrar.',
  },
  {
    q: '¿Cuánto es el descuento anual?',
    a: 'Con la facturación anual pagas 10 meses y tienes acceso durante 12 — equivale a 2 meses gratis (€290/año frente a €348 mensual).',
  },
  {
    q: '¿Puedo cancelar en cualquier momento?',
    a: 'Sí. Cancelas desde Ajustes → Facturación en cualquier momento. Mantienes el acceso hasta el final del periodo pagado.',
  },
  {
    q: '¿Qué pasa con mis datos si cancelo?',
    a: 'Tus datos siguen siendo tuyos. Puedes exportar todo desde Ajustes → Datos. Tras 30 días de cancelación, eliminamos los datos del workspace.',
  },
];

export default function IsaakPricingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Hero */}
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#eef4ff_0%,#ffffff_72%)] py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
            <Sparkles className="h-3.5 w-3.5" />
            Planes y precios
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
            Empieza gratis. La IA va incluida.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Isaak incluye Claude y GPT-4o en el precio. No necesitas suscripción a Claude.ai ni a
            ChatGPT — solo Isaak.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            <Zap className="h-4 w-4" />
            Sin tarjeta para empezar · Sin configuración · Listo en 2 minutos
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid gap-6 md:grid-cols-2">
            {PLANS.map((plan) => {
              const isRecommended = plan.highlight === 'recommended';
              const isFree = plan.highlight === 'free';
              return (
                <article
                  key={plan.id}
                  className={`relative flex flex-col rounded-[1.75rem] border bg-white p-8 shadow-sm transition ${
                    isRecommended
                      ? 'border-[#2361d8] shadow-md ring-1 ring-[#2361d8]/30'
                      : 'border-slate-200'
                  }`}
                >
                  {isRecommended && (
                    <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-[#2361d8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                      Recomendado
                    </span>
                  )}
                  {isFree && (
                    <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                      Gratis para siempre
                    </span>
                  )}

                  <h2 className="text-xl font-bold text-[#011c67]">{plan.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{plan.tagline}</p>

                  <div className="mt-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold tracking-tight text-slate-950">
                        {plan.price}
                      </span>
                      {plan.priceSuffix && (
                        <span className="text-sm text-slate-500">{plan.priceSuffix}</span>
                      )}
                    </div>
                    {plan.annualNote && (
                      <p className="mt-1 text-[11px] font-medium text-emerald-600">
                        {plan.annualNote}
                      </p>
                    )}
                  </div>

                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-sm leading-6 text-slate-700"
                      >
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#2361d8]" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Link
                      href={plan.ctaHref}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold transition ${
                        isRecommended
                          ? 'bg-[#2361d8] text-white hover:bg-[#1f55c0]'
                          : 'border border-slate-300 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {plan.ctaLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    {plan.footnote && (
                      <p className="mt-3 text-center text-xs text-slate-500">{plan.footnote}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {/* AI included callout */}
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-[#2361d8]/20 bg-[#2361d8]/5 px-6 py-5 text-center">
            <p className="text-sm font-semibold text-[#011c67]">
              IA incluida en todos los planes — sin suscripciones adicionales
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Isaak usa Claude (Anthropic) y GPT-4o (OpenAI) según el plan. Tú no necesitas cuenta
              en ninguno de los dos. Todo está integrado y gestionado por nosotros.
            </p>
          </div>
        </div>
      </section>

      {/* AEAT Integration */}
      <section className="border-b border-slate-200 bg-slate-50/40 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2361d8]">
              Integración con la Administración
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Conectado a la AEAT y a Verifactu
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
              Isaak integra los principales servicios de la AEAT para que puedas consultar,
              presentar y gestionar sin perder el contexto de tu negocio.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-[#011c67]">Sede Electrónica AEAT</h3>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Disponible
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Consulta notificaciones pendientes, presenta modelos y declaraciones tributarias
                directamente en el portal oficial.
              </p>
              <a
                href="https://sede.agenciatributaria.gob.es/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2361d8] hover:text-[#1f55c0]"
              >
                Ir a la Sede Electrónica
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="rounded-[1.5rem] border border-[#2361d8]/30 bg-white p-6 shadow-sm ring-1 ring-[#2361d8]/10">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-[#011c67]">VeriFactu</h3>
                <span className="shrink-0 rounded-full bg-[#2361d8]/10 px-2 py-0.5 text-[10px] font-semibold text-[#2361d8]">
                  Integrado en Isaak
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Emite facturas con registro automático en la AEAT. Isaak genera el PDF con hash de
                encadenamiento y código QR de verificación incluidos.
              </p>
              <a
                href="https://sede.agenciatributaria.gob.es/Sede/verifactu.html"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2361d8] hover:text-[#1f55c0]"
              >
                Información VeriFactu (AEAT)
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-[#011c67]">SII</h3>
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Próximamente
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Suministro Inmediato de Información. Envío en tiempo real de facturas al SII de la
                AEAT — para empresas obligadas y grupos que anticipan el cumplimiento.
              </p>
              <a
                href="https://www.agenciatributaria.es/AEAT.internet/Inicio/La_Agencia_Tributaria/Campanas/_Campanas_/SII__Suministro_Inmediato_de_Informacion_/SII__Suministro_Inmediato_de_Informacion_.shtml"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Información SII (AEAT)
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-y border-slate-200 bg-slate-50/70 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2361d8]">
              Preguntas frecuentes
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Lo que te preguntas antes de empezar.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {FAQ.map((item) => (
              <article
                key={item.q}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-base font-semibold text-[#011c67]">{item.q}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl rounded-[2rem] bg-[#011c67] px-8 py-12 text-center text-white shadow-sm">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Simple. Dos planes. Sin letra pequeña.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-blue-100">
            Empieza gratis para siempre. Cuando necesites conectar tu ERP, tu banco o la AEAT,
            activa Pro con 14 días de prueba sin tarjeta.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#011c67] hover:bg-slate-100"
            >
              Empezar gratis ahora
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signup?plan=pro"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Trial Pro 14 días (sin tarjeta)
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
