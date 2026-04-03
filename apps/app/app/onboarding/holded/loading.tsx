'use client';

import { getIsaakHoldedOnboardingCopy } from '@/lib/isaak/persona';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { inferHoldedEntryChannel } from './entryChannel';

const copy = getIsaakHoldedOnboardingCopy();
const chatgptLoadingMessages = [
  'Estamos preparando la conexion con Holded para tu espacio de ChatGPT.',
  'Comprobamos tu acceso para que el siguiente paso sea directo y seguro.',
  'En cuanto termine, volveras al flujo de ChatGPT automaticamente.',
];

export default function HoldedOnboardingLoading() {
  const searchParams = useSearchParams();
  const isChatgptEntry =
    inferHoldedEntryChannel({
      channel: searchParams?.get('channel'),
      source: searchParams?.get('source'),
      next: searchParams?.get('next'),
    }) === 'chatgpt';
  const queuedMessages = isChatgptEntry ? chatgptLoadingMessages : copy.loadingMessages;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % queuedMessages.length);
    }, 1800);

    return () => window.clearInterval(timer);
  }, [queuedMessages.length]);

  return (
    <div className="min-h-[100svh] bg-white px-3 py-4 text-black sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto flex min-h-[72svh] max-w-3xl items-center justify-center">
        <div className="w-full rounded-[30px] border border-neutral-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
            <div className="mx-auto w-full max-w-[220px] rounded-[28px] border border-[#d9e6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-5 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#fff1f2] ring-1 ring-[#ff5460]/12">
                <Image
                  src="/brand/holded/holded-diamond-logo.png"
                  alt="Holded"
                  width={28}
                  height={28}
                  className="h-7 w-7"
                  priority
                />
              </div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Conexion segura
              </div>
              <div className="mt-2 text-sm font-semibold text-black">Preparando tu acceso</div>
            </div>

            <div className="text-center lg:text-left">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                {isChatgptEntry ? 'Conecta Holded con ChatGPT' : copy.eyebrow}
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-black sm:text-4xl">
                {isChatgptEntry ? 'Preparando tu conexion con Holded' : copy.statusLoading}
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-neutral-600 sm:text-base lg:mx-0">
                {isChatgptEntry
                  ? 'Estamos comprobando tu espacio para que puedas terminar la conexion y volver a ChatGPT sin pasos innecesarios.'
                  : copy.intro}
              </p>

              <div className="mx-auto mt-6 h-2 w-28 overflow-hidden rounded-full bg-neutral-200 lg:mx-0">
                <div className="h-full w-1/2 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-neutral-700" />
              </div>

              <div className="mt-6 min-h-[96px] rounded-3xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-left">
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
      </div>
    </div>
  );
}
