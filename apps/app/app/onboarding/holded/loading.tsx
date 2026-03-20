'use client';

import { getIsaakHoldedOnboardingCopy } from '@/lib/isaak/persona';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const copy = getIsaakHoldedOnboardingCopy();
const queuedMessages = copy.loadingMessages;

export default function HoldedOnboardingLoading() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % queuedMessages.length);
    }, 1800);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-black sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
        <div className="w-full rounded-[28px] border border-neutral-200 bg-white p-8 text-center shadow-[0_16px_48px_rgba(0,0,0,0.06)] sm:p-10">
          <div className="flex justify-center">
            <Image
              src="/brand/holded/holded-diamond-logo.png"
              alt="Compatible con Holded"
              width={120}
              height={120}
              className="h-24 w-24 sm:h-28 sm:w-28"
              priority
            />
          </div>

          <div className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            {copy.eyebrow}
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-black sm:text-4xl">
            Estamos preparando a Isaak
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-neutral-600 sm:text-base">
            Estamos dejando listo el acceso a tus datos reales para que Isaak empiece con contexto, prioridades y siguientes pasos desde el primer minuto.
          </p>

          <div className="mx-auto mt-8 h-2 w-28 overflow-hidden rounded-full bg-neutral-200">
            <div className="h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-[#ff5460]" />
          </div>

          <div className="mt-8 min-h-[104px] rounded-3xl border border-neutral-200 bg-neutral-50 px-6 py-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Mientras preparamos tu espacio
            </div>
            <p className="mt-3 text-base leading-8 text-neutral-700 sm:text-lg">
              {queuedMessages[index]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
