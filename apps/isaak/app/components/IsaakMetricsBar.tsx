'use client';

import { useEffect, useRef, useState } from 'react';

type Metric = {
  target: number;
  suffix: string;
  label: string;
  sublabel: string;
};

const METRICS: Metric[] = [
  { target: 6, suffix: '', label: 'Integraciones', sublabel: 'activas y creciendo' },
  { target: 127, suffix: '+', label: 'Empresas', sublabel: 'ya conectadas' },
  { target: 4800, suffix: '+', label: 'Facturas VeriFactu', sublabel: 'emitidas con AEAT' },
];

function useCountUp(target: number, active: boolean, duration = 1400): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, target, duration]);
  return value;
}

function CounterItem({ metric, active }: { metric: Metric; active: boolean }) {
  const value = useCountUp(metric.target, active);
  const formatted = value >= 1000 ? value.toLocaleString('es-ES') : String(value);
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="text-4xl font-black tracking-tight text-[#011c67] sm:text-5xl">
        {formatted}
        {metric.suffix}
      </div>
      <div className="text-sm font-bold text-slate-700">{metric.label}</div>
      <div className="text-xs text-slate-400">{metric.sublabel}</div>
    </div>
  );
}

export default function IsaakMetricsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="border-b border-slate-100 bg-white py-14">
      <div className="mx-auto max-w-4xl px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:divide-x sm:divide-slate-100">
          {METRICS.map((m) => (
            <CounterItem key={m.label} metric={m} active={active} />
          ))}
        </div>
      </div>
    </div>
  );
}
