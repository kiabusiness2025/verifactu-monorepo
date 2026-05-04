import { ArrowRight, Check, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  buildIsaakAuthUrl,
  HOLDed_ONBOARDING_URL,
  ISAAK_PUBLIC_URL,
} from '@/app/lib/isaak-navigation';

export const metadata: Metadata = {
  title: 'Empezar trial — Isaak',
  description:
    'Crea tu cuenta de Isaak y empieza tu trial de 14 dias. Sin tarjeta. Conecta Holded en el primer paso.',
};

type PlanCopy = {
  badge: string;
  title: string;
  subtitle: string;
  trialLine: string;
  features: string[];
};

const PLAN_COPY: Record<string, PlanCopy> = {
  pro: {
    badge: 'Trial Isaak Pro · 14 dias',
    title: 'Empieza tu trial de Isaak Pro',
    subtitle:
      'Memoria persistente, libros AEAT, multi-conector y modo ejecucion controlado. Sin tarjeta durante el trial.',
    trialLine: '14 dias gratis · sin tarjeta · cancelacion en un clic',
    features: [
      'Conector Holded incluido (24 tools)',
      'Memoria persistente entre sesiones',
      'Libros AEAT preconfigurados (130, 303, 390)',
      'Multi-conector: Holded + Excel + Email + Drive',
      'Modo ejecucion con confirmacion granular',
      'Soporte por email respondido en 24 h',
    ],
  },
  business: {
    badge: 'Isaak Business',
    title: 'Hablamos antes de activar Business',
    subtitle:
      'Multi-empresa, roles, auditoria y SLA requieren onboarding asistido. Te contactamos en menos de 24 horas.',
    trialLine: 'Onboarding asistido · 1-2 sesiones · setup en una semana',
    features: [
      'Todo lo de Pro',
      'Multi-tenant / multi-empresa',
      'Roles y permisos por usuario',
      'Auditoria completa de acciones',
      'SLA 99.9 % uptime',
    ],
  },
};

export default async function IsaakSignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const planParam = typeof resolved.plan === 'string' ? resolved.plan : 'pro';
  const plan = PLAN_COPY[planParam] ?? PLAN_COPY.pro;

  // Business plan goes through sales, not self-service
  if (planParam === 'business') {
    return <BusinessRedirect />;
  }

  const onboardingNext = `${ISAAK_PUBLIC_URL}/onboarding/holded?source=signup_${planParam}&plan=${planParam}`;
  const signupUrl = `${buildIsaakAuthUrl(
    `isaak_signup_${planParam}`,
    onboardingNext
  )}&signup=1&plan=${encodeURIComponent(planParam)}`;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#eef4ff_0%,#ffffff_72%)] py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                <Sparkles className="h-3.5 w-3.5" />
                {plan.badge}
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl sm:leading-[1.06]">
                {plan.title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{plan.subtitle}</p>

              <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-800">
                <Clock className="h-3.5 w-3.5" />
                {plan.trialLine}
              </div>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={signupUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-[#1f55c0]"
                >
                  Crear cuenta y empezar trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Ya tengo cuenta
                </Link>
              </div>

              <p className="mt-6 max-w-xl text-xs leading-6 text-slate-500">
                Al crear tu cuenta aceptas los{' '}
                <Link href="/terms" className="underline hover:text-slate-700">
                  Terminos
                </Link>{' '}
                y la{' '}
                <Link href="/privacy" className="underline hover:text-slate-700">
                  Politica de privacidad
                </Link>
                . Te enviaremos un email de verificacion para activar tu cuenta.
              </p>
            </div>

            <aside className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-base font-semibold text-[#011c67]">Que incluye tu trial</h2>
              <ul className="mt-5 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm leading-7 text-slate-700">
                    <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#2361d8]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
                <div className="flex items-center gap-2 text-slate-800">
                  <ShieldCheck className="h-4 w-4 text-[#2361d8]" />
                  <span className="font-semibold">Tus datos siempre son tuyos.</span>
                </div>
                <p className="mt-1">
                  Tenant-scoped: cada cuenta accede solo a su propia empresa. Las credenciales de
                  Holded se guardan cifradas server-side.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2361d8]">
              Como funciona
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Tres pasos para empezar.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Crea tu cuenta',
                text: 'Email + nombre de empresa. Verificas tu email y entras a Isaak.',
              },
              {
                step: '02',
                title: 'Conecta Holded',
                text: 'En el primer onboarding conectas Holded con OAuth. 1 click.',
              },
              {
                step: '03',
                title: 'Habla con tu empresa',
                text: 'Pregunta a Isaak en lenguaje natural. Memoria persistente desde el dia 1.',
              },
            ].map((s) => (
              <article
                key={s.step}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span className="text-[11px] font-bold tabular-nums tracking-widest text-slate-300">
                  {s.step}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-[#011c67]">{s.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function BusinessRedirect() {
  return (
    <main className="min-h-screen bg-white px-4 py-16 text-slate-900 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
          <Sparkles className="h-3.5 w-3.5" />
          Isaak Business
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
          Hablamos antes de activar Business.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Multi-empresa, roles, auditoria y SLA requieren un onboarding asistido. Cuentanos un poco
          de tu equipo y te contactamos en menos de 24 horas.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/support?topic=isaak_business"
            className="inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
          >
            Hablar con ventas
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Ver otros planes
          </Link>
        </div>
      </div>
    </main>
  );
}
