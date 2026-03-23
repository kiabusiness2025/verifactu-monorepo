'use client';

import { ArrowRight, CheckCircle2, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { buildOnboardingUrl } from '../lib/holded-navigation';

type BillingCycle = 'monthly' | 'yearly';

const plans = [
  {
    id: 'free',
    name: 'Free',
    badge: null,
    tagline: 'Descubre si Isaak vale para ti.',
    priceMonthly: 0,
    priceYearly: 0,
    ctaLabel: 'Empezar gratis',
    ctaPlan: null,
    trial: null,
    highlight: false,
    features: [
      'Conecta tu cuenta Holded via API key',
      '50 preguntas al mes a Isaak',
      'Resúmenes de ventas, gastos y cobros',
      'Alertas básicas de facturas pendientes',
      'Acceso desde web y móvil',
    ],
    notIncluded: [
      'Historial de conversaciones',
      'Alertas proactivas automáticas',
      'Borrador de facturas',
      'Exportación de informes',
    ],
  },
  {
    id: 'fiscal',
    name: 'Isaak Fiscal',
    badge: '30 días gratis',
    tagline: 'Isaak como tu asistente fiscal diario.',
    priceMonthly: 29,
    priceYearly: 290,
    ctaLabel: 'Probar 30 días gratis',
    ctaPlan: 'isaak_fiscal',
    ctaPlanYearly: 'isaak_fiscal_yearly',
    trial: '30 días sin coste',
    highlight: true,
    features: [
      'Todo lo del plan Free',
      'Preguntas ilimitadas a Isaak',
      'Historial completo de conversaciones',
      'Alertas proactivas: IVA, cobros, gastos',
      'Resúmenes semanales automáticos por email',
      'Borradores de facturas desde lenguaje natural',
      'Informes personalizados en PDF / Excel',
      'Soporte prioritario',
    ],
    notIncluded: ['Workspace multiusuario', 'Asistente de migraciones'],
  },
  {
    id: 'migraciones',
    name: 'Isaak + Migraciones',
    badge: '2 meses gratis al pagar anual',
    tagline: 'Isaak lleva tus datos de donde estén a donde necesitas.',
    priceMonthly: 79,
    priceYearly: 790,
    ctaLabel: 'Contratar ahora',
    ctaPlan: 'isaak_migraciones',
    ctaPlanYearly: 'isaak_migraciones_yearly',
    trial: null,
    highlight: false,
    features: [
      'Todo lo del plan Fiscal',
      'Asistente de migración guiado desde Excel u otro ERP',
      'Revisión y limpieza de datos históricos importados',
      'Workspace multiusuario (hasta 5 usuarios)',
      'Acceso anticipado a nuevas integraciones',
      'SLA de soporte 24h en días laborables',
    ],
    notIncluded: [],
  },
];

function PlanCard({ plan, billing }: { plan: (typeof plans)[number]; billing: BillingCycle }) {
  const price = billing === 'yearly' ? plan.priceYearly : plan.priceMonthly;
  const isYearly = billing === 'yearly';
  const ctaPlan = isYearly && 'ctaPlanYearly' in plan ? plan.ctaPlanYearly : plan.ctaPlan;
  const ctaHref = ctaPlan ? `/api/checkout?plan=${ctaPlan}` : buildOnboardingUrl('holded_planes');

  return (
    <article
      className={`relative flex flex-col rounded-[2rem] border p-7 transition-shadow hover:shadow-xl ${
        plan.highlight
          ? 'border-[#ff5460]/40 bg-[linear-gradient(145deg,#fff5f5_0%,#ffffff_60%)] shadow-lg ring-2 ring-[#ff5460]/20'
          : 'border-slate-200 bg-white shadow-sm'
      }`}
    >
      {plan.badge && (
        <div
          className={`absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wide shadow-md ${
            plan.highlight ? 'bg-[#ff5460] text-white' : 'bg-slate-900 text-white'
          }`}
        >
          {plan.badge}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
            plan.highlight ? 'bg-[#ff5460]/10' : 'bg-slate-100'
          }`}
        >
          {plan.id === 'free' && (
            <Sparkles
              className={`h-5 w-5 ${plan.highlight ? 'text-[#ff5460]' : 'text-slate-500'}`}
            />
          )}
          {plan.id === 'fiscal' && <Zap className="h-5 w-5 text-[#ff5460]" />}
          {plan.id === 'migraciones' && <ArrowRight className="h-5 w-5 text-slate-700" />}
        </div>
        <div>
          <div className="text-lg font-bold text-slate-900">{plan.name}</div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-600">{plan.tagline}</p>

      <div className="mt-5">
        {price === 0 ? (
          <div className="text-4xl font-extrabold text-slate-900">Gratis</div>
        ) : (
          <div className="flex items-end gap-1">
            <span className="text-4xl font-extrabold text-slate-900">{price}€</span>
            <span className="mb-1 text-sm text-slate-500">/{isYearly ? 'año' : 'mes'}</span>
          </div>
        )}
        {isYearly && price > 0 && (
          <div className="mt-1 text-xs font-semibold text-[#ff5460]">
            ≈ {Math.round(price / 12)}€/mes · 2 meses gratis
          </div>
        )}
        {plan.trial && !isYearly && (
          <div className="mt-1 text-xs font-semibold text-emerald-600">✓ {plan.trial}</div>
        )}
      </div>

      <a
        href={ctaHref}
        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all hover:scale-[1.02] ${
          plan.highlight
            ? 'bg-[#ff5460] text-white shadow-lg hover:bg-[#ef4654] hover:shadow-xl'
            : plan.id === 'free'
              ? 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
              : 'bg-slate-900 text-white hover:bg-slate-800'
        }`}
      >
        {plan.ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </a>

      <div className="mt-6 space-y-2.5">
        {plan.features.map((f) => (
          <div key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>{f}</span>
          </div>
        ))}
        {plan.notIncluded.map((f) => (
          <div key={f} className="flex items-start gap-2.5 text-sm text-slate-400 line-through">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            <span>{f}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function HoldedPlanesPage() {
  const [billing, setBilling] = useState<BillingCycle>('monthly');

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f6f9ff_40%,#ffffff_100%)] text-slate-900">
      {/* Hero */}
      <section className="px-4 py-16 text-center sm:py-20">
        <div className="mx-auto max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-[#ff5460]" />
            Elige cómo quieres trabajar con Isaak
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Planes simples.
            <br />
            Sin letra pequeña.
          </h1>

          <p className="mt-5 text-lg text-slate-600">
            Empieza gratis y sube cuando lo necesites. Sin permanencia, sin sorpresas.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all ${
                billing === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition-all ${
                billing === 'yearly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Anual
              <span className="rounded-full bg-[#ff5460] px-2 py-0.5 text-[10px] font-bold text-white">
                2 meses gratis
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} billing={billing} />
          ))}
        </div>

        {/* FAQ rápido */}
        <div className="mt-16 rounded-[2rem] border border-slate-200 bg-white p-8 lg:p-10">
          <h2 className="text-2xl font-bold text-slate-950">Preguntas sobre los planes</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <div className="font-semibold text-slate-900">¿Puedo cambiar de plan?</div>
              <p className="mt-1 text-sm text-slate-600">
                Sí, en cualquier momento. Sube o baja sin penalización.
              </p>
            </div>
            <div>
              <div className="font-semibold text-slate-900">
                ¿Qué pasa al terminar el periodo de prueba?
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Te avisamos antes. Si no haces nada, el plan queda en Free automáticamente.
              </p>
            </div>
            <div>
              <div className="font-semibold text-slate-900">¿El anual tiene permanencia?</div>
              <p className="mt-1 text-sm text-slate-600">
                No hay permanencia obligatoria. El plan anual es simplemente mensual × 10 (2 meses
                de regalo).
              </p>
            </div>
            <div>
              <div className="font-semibold text-slate-900">
                ¿Mi Holded tiene que seguir activo?
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Sí. Isaak necesita acceso a tu API key de Holded para leer tus datos en tiempo real.
              </p>
            </div>
          </div>
        </div>

        {/* CTA final */}
        <div className="mt-10 rounded-[2rem] border border-[#ff5460]/20 bg-[#ff5460]/5 p-8 text-center">
          <p className="text-lg font-semibold text-slate-900">¿Aún tienes dudas?</p>
          <p className="mt-2 text-sm text-slate-600">
            Empieza con el plan Free. Siempre puedes subir después sin perder nada.
          </p>
          <Link
            href={buildOnboardingUrl('holded_planes_footer')}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ff5460] px-7 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#ef4654] hover:shadow-xl"
          >
            Conectar mi Holded gratis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

    </main>
  );
}
