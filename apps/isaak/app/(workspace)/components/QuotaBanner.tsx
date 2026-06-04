'use client';

// V1.5.3 — Banner discreto de cuota diaria.
//
// Solo aparece en planes con dailyQueryLimit > 0 (típicamente Free) y
// cuando el usuario ha consumido ≥70% del cupo del día. Color escala
// según consumo:
//   70-90% → amarillo (warning)
//   90-100% → rojo (urgent)
//
// Se refresca cada 90s para reflejar el avance del día.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Zap } from 'lucide-react';

type QuotaResponse =
  | { unlimited: true; planCode?: string; planStatus?: string }
  | {
      unlimited: false;
      used: number;
      limit: number;
      remaining: number;
      percentage: number;
      resetsAtUtc: string;
      planCode?: string;
      planStatus?: string;
    };

const SHOW_THRESHOLD = 70;
const URGENT_THRESHOLD = 90;
const REFRESH_MS = 90_000;

function hoursUntil(iso: string): number {
  try {
    const diff = new Date(iso).getTime() - Date.now();
    return Math.max(1, Math.ceil(diff / 3_600_000));
  } catch {
    return 24;
  }
}

export default function QuotaBanner() {
  const [data, setData] = useState<QuotaResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/isaak/quota/status', { credentials: 'include' });
        if (res.ok && !cancelled) setData((await res.json()) as QuotaResponse);
      } catch {
        /* ignora */
      }
    };
    void load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!data || data.unlimited) return null;
  if (data.percentage < SHOW_THRESHOLD) return null;

  const urgent = data.percentage >= URGENT_THRESHOLD;
  const hoursLeft = hoursUntil(data.resetsAtUtc);

  return (
    <div
      className={`flex items-center justify-between gap-3 border-b px-5 py-2 ${
        urgent
          ? 'border-rose-200 bg-rose-50 text-rose-900'
          : 'border-amber-200 bg-amber-50 text-amber-900'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2 text-[12px]">
        {urgent ? (
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
        ) : (
          <Zap className="h-3.5 w-3.5 flex-shrink-0" />
        )}
        <span className="truncate">
          Llevas{' '}
          <strong className="font-semibold tabular-nums">
            {data.used}/{data.limit}
          </strong>{' '}
          mensajes hoy.{' '}
          {urgent
            ? `Cuota casi agotada (queda${data.remaining === 1 ? '' : 'n'} ${data.remaining}).`
            : `Te queda${data.remaining === 1 ? '' : 'n'} ${data.remaining} para ${hoursLeft}h.`}
        </span>
      </div>
      <Link
        href="/settings?section=billing"
        className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold text-white transition ${
          urgent ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
        }`}
      >
        {urgent ? 'Activar Pro ahora' : 'Ver planes'}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
