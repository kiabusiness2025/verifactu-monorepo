'use client';

import { getIsaakHoldedOnboardingCopy } from '@/lib/isaak/persona';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import HoldedMergeAnimation from './HoldedMergeAnimation';

const copy = getIsaakHoldedOnboardingCopy();
const chatgptLoadingMessages = [
  'Estamos preparando la conexion con Holded para tu espacio de ChatGPT.',
  'Comprobamos tu acceso para que el siguiente paso sea directo y seguro.',
  'En cuanto termine, volveras al flujo de ChatGPT automaticamente.',
];

export default function HoldedOnboardingLoading() {
  const searchParams = useSearchParams();
  const isChatgptEntry = searchParams?.get('channel')?.trim().toLowerCase() === 'chatgpt';
  const queuedMessages = isChatgptEntry ? chatgptLoadingMessages : copy.loadingMessages;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % queuedMessages.length);
    }, 1800);

    return () => window.clearInterval(timer);
  }, [queuedMessages.length]);

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-black sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
        <div className="w-full rounded-[30px] border border-neutral-200 bg-white p-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-10">
          <HoldedMergeAnimation />

          <div className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Conexion segura en progreso
          </div>

          <div className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            {isChatgptEntry ? 'Conecta Holded con ChatGPT' : copy.eyebrow}
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-black sm:text-4xl">
            {isChatgptEntry ? 'Preparando tu conexion con Holded' : copy.statusLoading}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-neutral-600 sm:text-base">
            {isChatgptEntry
              ? 'Estamos comprobando tu espacio para que puedas terminar la conexion y volver a ChatGPT sin pasos innecesarios.'
              : copy.intro}
          </p>

          <div className="mx-auto mt-8 h-2 w-28 overflow-hidden rounded-full bg-neutral-200">
            <div className="h-full w-1/2 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-neutral-700" />
          </div>

          <div className="mt-8 min-h-[104px] rounded-3xl border border-neutral-200 bg-neutral-50 px-6 py-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Mientras preparamos tu entorno
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
