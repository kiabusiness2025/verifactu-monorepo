'use client';

// V1.5.1 — Banner discreto que aparece arriba del chat cuando el usuario
// aún no ha completado los pasos clave del onboarding (y no los ha saltado).
//
// Se oculta solo si:
//   - Todos los pasos están hechos (allDone), o
//   - El usuario marcó "saltar" (completedAt presente + !allDone), o
//   - El usuario lo cierra esta sesión (estado local).

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';

type State = {
  doneCount: number;
  totalSteps: number;
  allDone: boolean;
  skipped: boolean;
  completedAt: string | null;
};

export default function OnboardingBanner() {
  const [state, setState] = useState<State | null>(null);
  const [dismissedLocal, setDismissedLocal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/isaak/onboarding/state', { credentials: 'include' });
        if (res.ok && !cancelled) {
          const data = (await res.json()) as State;
          setState(data);
        }
      } catch {
        /* ignora */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;
  if (state.allDone) return null;
  if (state.completedAt) return null; // saltado
  if (dismissedLocal) return null;

  const remaining = state.totalSteps - state.doneCount;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#2361d8]/15 bg-gradient-to-r from-[#f0f5ff] to-white px-5 py-2.5">
      <div className="flex min-w-0 items-center gap-2 text-[12px] text-[#011c67]">
        <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-[#2361d8]" />
        <span className="truncate">
          Te quedan <strong className="font-semibold">{remaining}</strong>{' '}
          paso{remaining === 1 ? '' : 's'} para terminar de configurar Isaak.
        </span>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <Link
          href="/bienvenida"
          className="inline-flex items-center gap-1 rounded-full bg-[#2361d8] px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-[#1f55c0]"
        >
          Terminar setup
          <ArrowRight className="h-3 w-3" />
        </Link>
        <button
          type="button"
          onClick={() => setDismissedLocal(true)}
          title="Cerrar"
          className="rounded-md p-1 text-[#2361d8]/60 transition hover:bg-white hover:text-[#011c67]"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
