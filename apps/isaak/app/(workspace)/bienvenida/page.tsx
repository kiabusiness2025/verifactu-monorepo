// V1.5.1 — Página de bienvenida con checklist de configuración.
//
// Pasos clave para empezar bien con Isaak. Cada paso enlaza a la página
// detallada que ya existe (perfil/empresa, integration-holded,
// ajustes/notificaciones). El estado se obtiene en vivo de
// /api/isaak/onboarding/state para mostrar progreso real.
//
// El usuario puede saltar el wizard en cualquier momento — el banner
// "Termina el setup" del chat ya no le molesta más.

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Briefcase,
  Check,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Plug,
  Sparkles,
  UserCircle2,
} from 'lucide-react';
import { ISAAK_V1_LAUNCH } from '@/app/lib/feature-flags';

type OnboardingState = {
  completedAt: string | null;
  allDone: boolean;
  skipped: boolean;
  doneCount: number;
  totalSteps: number;
  steps: {
    profile: { done: boolean; preferredName: string | null; businessSector: string | null };
    holded: { done: boolean };
    push: { done: boolean; count: number };
    channels: { done: boolean; whatsapp: boolean; telegram: boolean };
  };
};

type StepDef = {
  key: 'profile' | 'holded' | 'push' | 'channels';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  important?: boolean;
};

const STEPS_FULL: StepDef[] = [
  {
    key: 'profile',
    icon: UserCircle2,
    title: 'Completa tu perfil',
    description:
      'Cuéntanos tu sector y tamaño de empresa. Sin esto Isaak responde con criterio genérico — con esto responde a tu medida.',
    ctaLabel: 'Completar perfil',
    href: '/settings?section=isaak',
    important: true,
  },
  {
    key: 'holded',
    icon: Plug,
    title: 'Conecta tu Holded',
    description:
      'En 30 segundos. Sin Holded el plan Pro no funciona y el chat no puede consultar tus datos reales.',
    ctaLabel: 'Conectar Holded',
    href: '/integration-holded',
    important: true,
  },
  {
    key: 'push',
    icon: Bell,
    title: 'Activa notificaciones',
    description:
      'Alertas AEAT antes de cada vencimiento + avisos proactivos. Se activan en este navegador con un solo click.',
    ctaLabel: 'Activar notificaciones',
    href: '/ajustes/notificaciones',
  },
  {
    key: 'channels',
    icon: MessageCircle,
    title: 'Vincula WhatsApp o Telegram',
    description: 'Para hablar con Isaak desde tu móvil sin abrir la web. Una sola vez, opcional.',
    ctaLabel: 'Vincular canal',
    href: '/ajustes/notificaciones',
  },
];

const STEPS_V1: StepDef[] = [
  {
    key: 'holded',
    icon: Plug,
    title: 'Conecta tu Holded',
    description:
      'Es el unico paso imprescindible de V1. Isaak necesita tu API key para consultar ventas, gastos, facturas y contabilidad real.',
    ctaLabel: 'Conectar Holded',
    href: '/integration-holded',
    important: true,
  },
];

const STEPS = ISAAK_V1_LAUNCH ? STEPS_V1 : STEPS_FULL;

export default function BienvenidaPage() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/isaak/onboarding/state', { credentials: 'include' });
        if (res.ok && !cancelled) {
          setState((await res.json()) as OnboardingState);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await fetch('/api/isaak/onboarding/skip', { method: 'POST' });
      router.push('/chat');
    } finally {
      setSkipping(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#2361d8]" />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-8">
        <p className="text-sm text-slate-500">No se pudo cargar el estado del onboarding.</p>
      </div>
    );
  }

  const visibleDoneCount = STEPS.filter((step) => state.steps[step.key].done).length;
  const visibleTotalSteps = STEPS.length;
  const visibleAllDone = visibleDoneCount === visibleTotalSteps;
  const pct = Math.round((visibleDoneCount / visibleTotalSteps) * 100);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2361d8] text-white shadow-lg">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
          {visibleAllDone
            ? '¡Todo listo!'
            : visibleDoneCount === 0
              ? 'Bienvenido a Isaak'
              : 'Falta poco'}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-slate-600">
          {visibleAllDone
            ? 'Has completado la configuración esencial. Isaak está listo para trabajar contigo.'
            : ISAAK_V1_LAUNCH
              ? 'Conecta Holded para empezar a usar Isaak con datos reales.'
              : 'Vamos a configurar lo esencial. Cada paso lleva 30 segundos.'}
        </p>

        {/* Progress bar */}
        <div className="mx-auto mt-6 flex max-w-md items-center gap-3">
          <div className="flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-[#2361d8] to-[#4f7fef] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums text-slate-600">
            {visibleDoneCount}/{visibleTotalSteps}
          </span>
        </div>
      </div>

      {/* Steps */}
      <div className="mt-10 space-y-3">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const done = state.steps[step.key].done;
          return (
            <div
              key={step.key}
              className={`rounded-2xl border p-5 transition ${
                done
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : step.important
                    ? 'border-[#2361d8]/30 bg-[#2361d8]/[0.03] hover:border-[#2361d8]/50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                    done
                      ? 'bg-emerald-100 text-emerald-700'
                      : step.important
                        ? 'bg-[#2361d8] text-white'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">{step.title}</h2>
                    {done ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Hecho
                      </span>
                    ) : step.important ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        Recomendado
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                  {!done && (
                    <Link
                      href={step.href}
                      className={`mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                        step.important
                          ? 'bg-[#2361d8] text-white hover:bg-[#1f55c0]'
                          : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {step.ctaLabel}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        {visibleAllDone ? (
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
          >
            Empezar a usar Isaak
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={handleSkip}
              disabled={skipping}
              className="text-xs font-medium text-slate-500 transition hover:text-slate-700 disabled:opacity-60"
            >
              {skipping ? 'Procesando…' : 'Saltar de momento — completaré luego'}
            </button>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Ir al chat
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        )}
      </div>

      {state.completedAt && (
        <p className="mt-6 text-center text-[11px] text-slate-400">
          <Briefcase className="mr-1 inline h-3 w-3" />
          Marcado como completado el {new Date(state.completedAt).toLocaleDateString('es-ES')}.
          Puedes seguir completando pasos cuando quieras.
        </p>
      )}
    </div>
  );
}
