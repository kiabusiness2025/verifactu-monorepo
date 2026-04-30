'use client';

import Link from 'next/link';
import { X, Zap } from 'lucide-react';
import { useState } from 'react';

export default function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const isUrgent = daysLeft <= 3;
  const isWarning = daysLeft <= 7;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-5 py-2.5 text-[13px] font-medium ${
        isUrgent
          ? 'bg-rose-600 text-white'
          : isWarning
            ? 'bg-amber-500 text-white'
            : 'bg-[#2361d8] text-white'
      }`}
    >
      <div className="flex items-center gap-2">
        <Zap size={14} className="shrink-0" />
        <span>
          {daysLeft === 0
            ? 'Tu prueba gratuita termina hoy.'
            : daysLeft === 1
              ? 'Tu prueba gratuita termina mañana.'
              : `Tu prueba gratuita termina en ${daysLeft} días.`}{' '}
          <Link
            href="/settings?section=billing"
            className="underline underline-offset-2 hover:opacity-80"
          >
            Elige tu plan →
          </Link>
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-full p-0.5 opacity-70 hover:opacity-100"
        aria-label="Cerrar"
      >
        <X size={14} />
      </button>
    </div>
  );
}
