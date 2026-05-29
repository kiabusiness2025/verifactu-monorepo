'use client';

// V1 LAUNCH (2026-05-28) — Bloque de pricing con toggle Mensual ↔ Anual.
//
// Diseño:
//   - Toggle pill con highlight "Ahorra 2 meses" en anual
//   - 2 cards: Free + Pro
//   - Pro destacado con badge flotante "Más popular"
//   - Iconos por categoría en cada feature
//   - Precio del anual con tachado del mensual cuando se selecciona anual
//   - Garantías clarísimas debajo (sin permanencia, cancela, IVA, soporte)
//
// Cliente porque usa useState para el toggle. Resto de la landing es SSR.

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  Brain,
  CheckCircle2,
  Clock,
  CreditCard,
  FileSpreadsheet,
  HeadphonesIcon,
  Mail,
  MessageCircle,
  MessageSquare,
  Plug,
  Scale,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react';

const SIGNUP_URL = '/signup';

type FeatureWithIcon = {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
};

type Feature = FeatureWithIcon & { soon?: boolean };

type Plan = {
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  priceAnnualMonthlyEquivalent: number;
  cta: { label: string; href: string };
  ctaSubtitle?: string;
  highlight: boolean;
  features: Feature[];
  notIncluded?: string[];
};

const PLANS: Plan[] = [
  {
    name: 'Free',
    description: 'Para empezar y aprender Isaak sin compromiso.',
    priceMonthly: 0,
    priceAnnual: 0,
    priceAnnualMonthlyEquivalent: 0,
    cta: { label: 'Empezar gratis', href: SIGNUP_URL },
    ctaSubtitle: 'Sin tarjeta',
    highlight: false,
    features: [
      { icon: MessageSquare, text: 'Chat ilimitado (10 mensajes/h)' },
      { icon: MessageCircle, text: 'Acceso desde WhatsApp + Telegram' },
      { icon: Brain, text: 'Corpus completo de Agencia Tributaria' },
      { icon: Scale, text: 'Asesor legal de contratos', soon: true },
      { icon: Sparkles, text: 'IA incluida — Claude Haiku' },
    ],
    notIncluded: ['Holded conectado', 'Alertas AEAT proactivas', 'Excel de libros y modelos'],
  },
  {
    name: 'Pro',
    description: 'Tu Holded conectado + alertas. Lo que la mayoría elige.',
    priceMonthly: 29,
    priceAnnual: 290,
    priceAnnualMonthlyEquivalent: 24,
    cta: { label: 'Probar 14 días gratis', href: SIGNUP_URL + '?plan=pro' },
    ctaSubtitle: 'Sin tarjeta · Cancela cuando quieras',
    highlight: true,
    features: [
      { icon: MessageSquare, text: 'Todo lo del plan Free' },
      { icon: Plug, text: 'Tu Holded conectado en 30 segundos' },
      { icon: Brain, text: '20 tools: lectura + crear borradores' },
      { icon: Bell, text: 'Alertas AEAT D-15/7/3/1 por email + push web' },
      { icon: FileSpreadsheet, text: 'Exporta a Excel (libros IVA, modelos AEAT, asientos)' },
      { icon: Smartphone, text: 'Notificaciones push en móvil y escritorio' },
      { icon: Sparkles, text: 'IA premium — Claude Sonnet + GPT-4o fallback' },
      { icon: HeadphonesIcon, text: 'Soporte por email en menos de 24 h' },
    ],
  },
];

const GUARANTEES = [
  { icon: ShieldCheck, text: 'Sin permanencia' },
  { icon: XCircle, text: 'Cancela en 1 click' },
  { icon: CreditCard, text: 'Sin tarjeta para empezar' },
  { icon: Mail, text: 'Soporte por email' },
];

export default function PricingSectionV1() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');

  return (
    <section id="pricing" className="bg-gradient-to-b from-white via-slate-50 to-white py-20">
      <div className="mx-auto max-w-5xl px-5">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
            <CreditCard className="h-3.5 w-3.5" />
            Precios
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
            Precios sin sorpresas
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Dos planes. Cambia o cancela cuando quieras desde tu panel.
          </p>
        </div>

        {/* Toggle Mensual / Anual */}
        <div className="mt-10 flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                billing === 'monthly'
                  ? 'bg-[#011c67] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setBilling('annual')}
              className={`relative rounded-full px-5 py-2 text-sm font-semibold transition ${
                billing === 'annual'
                  ? 'bg-[#011c67] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Anual
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                −17%
              </span>
            </button>
          </div>
          {billing === 'annual' && (
            <p className="text-xs font-medium text-emerald-700">
              🎁 Pagas 10 meses y tienes 12 — 2 meses gratis
            </p>
          )}
        </div>

        {/* Cards */}
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          {PLANS.map((plan) => {
            const isPro = plan.highlight;
            const isFree = plan.priceMonthly === 0;
            const displayPrice =
              billing === 'annual'
                ? plan.priceAnnualMonthlyEquivalent
                : plan.priceMonthly;

            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-[1.75rem] p-7 transition ${
                  isPro
                    ? 'border-2 border-[#2361d8] bg-gradient-to-br from-[#f0f5ff] via-white to-white shadow-[0_20px_60px_-30px_rgba(35,97,216,0.4)] md:scale-[1.02]'
                    : 'border border-slate-200 bg-white shadow-sm'
                }`}
              >
                {/* Badge flotante */}
                {isPro && (
                  <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#2361d8] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-md">
                    <Sparkles className="h-3 w-3" />
                    Más popular
                  </span>
                )}

                {/* Header del card */}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-[#011c67]">{plan.name}</h3>
                    {isPro && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
                        <Clock className="h-2.5 w-2.5" />
                        Trial 14 días
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">{plan.description}</p>
                </div>

                {/* Precio */}
                <div className="mt-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-[#011c67] tabular-nums">
                      {displayPrice}
                    </span>
                    <span className="text-xl font-bold text-[#011c67]">€</span>
                    {!isFree && (
                      <span className="ml-1 text-sm text-slate-500">/ mes</span>
                    )}
                  </div>
                  {!isFree && billing === 'annual' && (
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-xs text-slate-400 line-through tabular-nums">
                        {plan.priceMonthly} €/mes
                      </span>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        Ahorras {plan.priceMonthly * 12 - plan.priceAnnual} €/año
                      </span>
                    </div>
                  )}
                  {!isFree && billing === 'monthly' && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      o {plan.priceAnnualMonthlyEquivalent} €/mes facturando anual
                    </p>
                  )}
                  {isFree && (
                    <p className="mt-1.5 text-xs text-slate-500">Para siempre, sin condiciones</p>
                  )}
                </div>

                {/* CTA */}
                <div className="mt-6">
                  <Link
                    href={plan.cta.href + (isPro && billing === 'annual' ? '&cadence=annual' : '')}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-sm transition ${
                      isPro
                        ? 'bg-[#2361d8] text-white hover:bg-[#1f55c0] hover:shadow-md'
                        : 'border-2 border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {plan.cta.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  {plan.ctaSubtitle && (
                    <p className="mt-2 text-center text-[11px] text-slate-500">
                      {plan.ctaSubtitle}
                    </p>
                  )}
                </div>

                {/* Features incluidas */}
                <div className="mt-7 border-t border-slate-100 pt-6">
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Incluye
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((f) => {
                      const Icon = f.icon;
                      return (
                        <li key={f.text} className="flex items-start gap-2.5 text-sm text-slate-700">
                          <span
                            className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md ${
                              isPro ? 'bg-[#2361d8]/10 text-[#2361d8]' : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            <Icon className="h-3 w-3" />
                          </span>
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span>{f.text}</span>
                            {f.soon && (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                                En 2 semanas
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Features NO incluidas (solo Free) */}
                {plan.notIncluded && plan.notIncluded.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-dashed border-slate-200">
                    <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      No incluido
                    </div>
                    <ul className="space-y-2">
                      {plan.notIncluded.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2.5 text-sm text-slate-400"
                        >
                          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-slate-100">
                            <XCircle className="h-3 w-3" />
                          </span>
                          <span className="line-through decoration-slate-300">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Garantías */}
        <div className="mx-auto mt-10 max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {GUARANTEES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-2 text-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-medium text-slate-700">{text}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] text-slate-500">
            Pagos seguros con Stripe · Precios en euros sin IVA · Facturas automáticas en PDF
          </p>
        </div>
      </div>
    </section>
  );
}
