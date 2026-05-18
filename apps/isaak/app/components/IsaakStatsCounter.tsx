'use client';

import { useEffect, useRef, useState } from 'react';

function useScrollCountUp(target: number, duration = 2200) {
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setActive(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - p) ** 4;
      setCount(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, target, duration]);

  return { count, ref };
}

export default function IsaakStatsCounter() {
  const time = useScrollCountUp(80);
  const errors = useScrollCountUp(99);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* 80% tiempo */}
      <div
        ref={time.ref}
        className="isaak-glow flex flex-col items-center rounded-3xl border border-white/10 bg-white/5 px-6 py-8 text-center backdrop-blur-sm"
      >
        <span className="text-7xl font-black leading-none tracking-tight text-white">
          {time.count}%
        </span>
        <div className="mt-1 h-px w-12 bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
        <p className="mt-3 text-base font-semibold text-blue-100">tiempo liberado</p>
        <p className="mt-1 max-w-[130px] text-xs text-blue-300/60">
          El empresario dirige, no gestiona
        </p>
      </div>

      {/* 99% errores */}
      <div
        ref={errors.ref}
        className="isaak-glow flex flex-col items-center rounded-3xl border border-white/10 bg-white/5 px-6 py-8 text-center backdrop-blur-sm"
        style={{ animationDelay: '1.4s' }}
      >
        <span className="text-7xl font-black leading-none tracking-tight text-white">
          {errors.count}%
        </span>
        <div className="mt-1 h-px w-12 bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
        <p className="mt-3 text-base font-semibold text-blue-100">menos errores</p>
        <p className="mt-1 max-w-[130px] text-xs text-blue-300/60">en contabilidad y gestión</p>
      </div>

      {/* 24/7 */}
      <div
        className="isaak-glow flex flex-col items-center rounded-3xl border border-white/10 bg-white/5 px-6 py-8 text-center backdrop-blur-sm"
        style={{ animationDelay: '2.8s' }}
      >
        <span className="text-7xl font-black leading-none tracking-tight text-white">24/7</span>
        <div className="mt-1 h-px w-12 bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
        <p className="mt-3 text-base font-semibold text-blue-100">siempre disponible</p>
        <p className="mt-1 max-w-[130px] text-xs text-blue-300/60">Tu empresa nunca duerme</p>
      </div>
    </div>
  );
}
