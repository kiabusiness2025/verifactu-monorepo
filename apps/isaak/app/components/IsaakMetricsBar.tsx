'use client';

import { useEffect, useRef, useState } from 'react';

const BASE_METRICS = [
  {
    id: 'integrations',
    target: 6,
    suffix: '',
    label: 'Integraciones',
    sublabel: 'activas y creciendo',
    live: false,
  },
  {
    id: 'companies',
    target: 127,
    suffix: '+',
    label: 'Empresas',
    sublabel: 'ya conectadas',
    live: false,
  },
  {
    id: 'invoices',
    target: 4800,
    suffix: '+',
    label: 'Facturas VeriFactu',
    sublabel: 'emitidas con AEAT',
    live: true,
  },
] as const;

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

function MetricCard({
  metric,
  active,
  liveExtra,
}: {
  metric: (typeof BASE_METRICS)[number];
  active: boolean;
  liveExtra: number;
}) {
  const counted = useCountUp(metric.target, active);
  const displayValue = counted + (metric.live && active ? liveExtra : 0);
  const formatted =
    displayValue >= 1000 ? displayValue.toLocaleString('es-ES') : String(displayValue);

  return (
    <div className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2361d8]/20 hover:shadow-md">
      <div className="flex items-center gap-2">
        <span className="text-4xl font-black tracking-tight text-[#011c67] tabular-nums sm:text-5xl">
          {formatted}
          {metric.suffix}
        </span>
        {metric.live && active && (
          <span
            className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500"
            title="Actualización en tiempo real"
          />
        )}
      </div>
      <div className="text-sm font-bold text-slate-700">{metric.label}</div>
      <div className="text-xs text-slate-400">{metric.sublabel}</div>
    </div>
  );
}

export default function IsaakMetricsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [liveExtra, setLiveExtra] = useState(0);

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

  // Live tick: invoices counter increments every ~9 seconds after animation starts
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setLiveExtra((n) => n + Math.floor(Math.random() * 3) + 1);
    }, 9000);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div ref={ref} className="border-b border-slate-100 bg-[#f8fbff] py-12">
      <div className="mx-auto max-w-4xl px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {BASE_METRICS.map((m) => (
            <MetricCard key={m.id} metric={m} active={active} liveExtra={liveExtra} />
          ))}
        </div>
      </div>
    </div>
  );
}
