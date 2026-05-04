import { ArrowRight, Check, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Isaak | Planes y precios',
  description:
    'Empieza gratis con el conector Holded para Claude. Pasa a Isaak Pro cuando necesites memoria, libros AEAT, multi-conector y modo ejecucion controlado.',
};

type Plan = {
  id: 'connector' | 'pro' | 'business' | 'asesoria';
  name: string;
  tagline: string;
  price: string;
  priceSuffix?: string;
  highlight?: 'recommended' | 'free';
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  ctaExternal?: boolean;
  footnote?: string;
};

const PLANS: Plan[] = [
  {
    id: 'connector',
    name: 'Conector Holded para Claude',
    tagline: 'La entrada gratuita. Habla con tus datos de Holded desde Claude.ai.',
    price: '0 €',
    priceSuffix: '/ mes',
    highlight: 'free',
    features: [
      '24 tools de Holded (facturas, contactos, contabilidad, CRM, productos)',
      'Modo lectura por defecto',
      'Borrador de factura con confirmacion explicita',
      'Tenant-scoped: solo tu cuenta de Holded',
      'OAuth seguro con PKCE + DCR',
    ],
    ctaLabel: 'Conectar en Claude',
    ctaHref: 'https://holded.verifactu.business/conectores/claude',
    ctaExternal: true,
    footnote: 'Plan gratis para siempre durante el lanzamiento. Sin tarjeta.',
  },
  {
    id: 'pro',
    name: 'Isaak Pro',
    tagline: 'Memoria, libros AEAT, multi-conector y modo ejecucion controlado.',
    price: '49 €',
    priceSuffix: '/ mes',
    highlight: 'recommended',
    features: [
      'Todo lo del conector Holded +',
      'Memoria persistente entre sesiones',
      'Libros AEAT preconfigurados (modelos 130, 303, 390)',
      'Multi-conector: Holded + Excel + Email + Drive',
      'Modo ejecucion con confirmacion granular',
      'Bancos via PSD2 (proximamente)',
    ],
    ctaLabel: 'Empezar trial 14 dias',
    ctaHref: '/signup?plan=pro',
    footnote: 'Trial de 14 dias sin tarjeta. Cancela cuando quieras.',
  },
  {
    id: 'business',
    name: 'Isaak Business',
    tagline: 'Multi-empresa, roles y auditoria completa para equipos.',
    price: '149 €',
    priceSuffix: '/ mes',
    features: [
      'Todo lo de Pro +',
      'Multi-tenant / multi-empresa',
      'Roles y permisos por usuario',
      'Auditoria completa de acciones',
      'Soporte prioritario',
      'SLA 99.9 % uptime',
    ],
    ctaLabel: 'Hablar con ventas',
    ctaHref: '/support',
    footnote: 'Facturacion anual disponible. IVA no incluido.',
  },
  {
    id: 'asesoria',
    name: 'Asesorias',
    tagline: 'Para asesorias contables que gestionan varios clientes en Holded.',
    price: 'A medida',
    features: [
      'Multi-cliente bajo una sola cuenta',
      'Pricing por volumen de clientes',
      'Onboarding guiado por nuestro equipo',
      'Plantillas para cierre fiscal y modelos AEAT',
      'White-label opcional',
    ],
    ctaLabel: 'Solicitar piloto asesoria',
    ctaHref: '/asesorias',
  },
];

const FAQ = [
  {
    q: 'Necesito tarjeta para empezar el trial de Pro?',
    a: 'No. Te damos 14 dias completos de Isaak Pro sin pedir tarjeta. Si decides continuar, te avisamos por email antes de cobrar.',
  },
  {
    q: 'Puedo seguir usando solo el conector de Holded en Claude sin pagar?',
    a: 'Si. El conector de Holded para Claude es y seguira siendo gratis durante todo el lanzamiento. Cuando activemos limites, los avisaremos con antelacion.',
  },
  {
    q: 'Que pasa con mis datos si cancelo?',
    a: 'Tus datos siguen siendo tuyos. Puedes exportar todo desde Configuracion > Datos. Tras 30 dias de cancelacion, eliminamos los datos del workspace.',
  },
  {
    q: 'Hay descuento si pago anual?',
    a: 'Si. La facturacion anual aplica un descuento del 16 % (equivalente a 2 meses gratis). Disponible en Pro y Business.',
  },
];

export default function IsaakPricingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#eef4ff_0%,#ffffff_72%)] py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
            <Sparkles className="h-3.5 w-3.5" />
            Planes y precios
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
            Empieza gratis. Crece cuando lo necesites.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            El conector de Holded para Claude es la entrada gratuita. Cuando necesites memoria,
            libros AEAT, multi-conector y trazabilidad, Isaak Pro es el siguiente paso natural.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((plan) => {
              const isRecommended = plan.highlight === 'recommended';
              const isFree = plan.highlight === 'free';
              return (
                <article
                  key={plan.id}
                  className={`relative flex flex-col rounded-[1.75rem] border bg-white p-6 shadow-sm transition ${
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
                      Gratis
                    </span>
                  )}

                  <h2 className="text-lg font-bold text-[#011c67]">{plan.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{plan.tagline}</p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight text-slate-950">
                      {plan.price}
                    </span>
                    {plan.priceSuffix && (
                      <span className="text-sm text-slate-500">{plan.priceSuffix}</span>
                    )}
                  </div>

                  <ul className="mt-6 flex-1 space-y-2.5">
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
                    {plan.ctaExternal ? (
                      <a
                        href={plan.ctaHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                          isRecommended
                            ? 'bg-[#2361d8] text-white hover:bg-[#1f55c0]'
                            : 'border border-slate-300 text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        {plan.ctaLabel}
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    ) : (
                      <Link
                        href={plan.ctaHref}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                          isRecommended
                            ? 'bg-[#2361d8] text-white hover:bg-[#1f55c0]'
                            : 'border border-slate-300 text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        {plan.ctaLabel}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                    {plan.footnote && (
                      <p className="mt-3 text-center text-xs text-slate-500">{plan.footnote}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

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

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl rounded-[2rem] bg-[#011c67] px-8 py-12 text-center text-white shadow-sm">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Aun no tienes claro que plan elegir?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-blue-100">
            Empieza con el conector de Holded en Claude. Es gratis, no pide tarjeta y puedes saltar
            a Pro cuando notes que necesitas memoria o multi-conector.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="https://holded.verifactu.business/conectores/claude"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#011c67] hover:bg-slate-100"
            >
              Conectar Holded en Claude (gratis)
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/signup?plan=pro"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Empezar trial Pro
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
