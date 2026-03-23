'use client';

import { getIsaakHoldedOnboardingCopy } from '@/lib/isaak/persona';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import styles from './loading.module.css';

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
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
        <div className="w-full rounded-[30px] border border-neutral-200 bg-white p-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-10">
          <div className="flex justify-center">
            <div className={styles.mergeStage} aria-hidden="true">
              <div className={styles.glow} />

              <div className={`${styles.iconOrbit} ${styles.leftOrbit}`}>
                <div className={styles.chatgptBadge}>ChatGPT</div>
              </div>

              <div className={`${styles.iconOrbit} ${styles.rightOrbit}`}>
                <Image
                  src="/brand/holded/holded-diamond-logo.png"
                  alt="Holded"
                  width={30}
                  height={30}
                  className="h-7 w-7 object-contain"
                  priority
                />
              </div>

              <div className={styles.centerPulse}>
                <Image
                  src="/brand/holded/holded-diamond-logo.png"
                  alt="Holded conectado con ChatGPT"
                  width={40}
                  height={40}
                  className="h-9 w-9 object-contain"
                  priority
                />
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Conexion segura en progreso
          </div>

          <div className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            {copy.eyebrow}
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-black sm:text-4xl">
            {copy.statusLoading}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-neutral-600 sm:text-base">
            {copy.intro}
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
