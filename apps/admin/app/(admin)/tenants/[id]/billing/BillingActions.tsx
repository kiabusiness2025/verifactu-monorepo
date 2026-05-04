'use client';

import { useState } from 'react';

type Plan = { id: number; code: string; name: string };

interface BillingActionsProps {
  tenantId: string;
  currentStatus: string;
  hasActiveSubscription: boolean;
  plans: Plan[];
}

export function BillingActions({
  tenantId,
  currentStatus,
  hasActiveSubscription,
  plans,
}: BillingActionsProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [extendDays, setExtendDays] = useState(7);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(plans[0]?.id ?? null);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/billing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; message?: string; error?: string };
      setMessage({ ok: data.ok, text: data.message ?? data.error ?? 'Hecho' });
      if (data.ok) {
        // Soft refresh to reflect new state
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch {
      setMessage({ ok: false, text: 'Error de red. Inténtalo de nuevo.' });
    } finally {
      setBusy(false);
    }
  };

  if (!hasActiveSubscription) {
    return <p className="text-sm text-slate-500">No hay suscripción activa sobre la que actuar.</p>;
  }

  return (
    <div className="space-y-5">
      {/* Feedback */}
      {message ? (
        <div
          className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
            message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {/* Extend trial */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700 shrink-0">Extender trial</label>
        <select
          aria-label="Días de extensión"
          value={extendDays}
          onChange={(e) => setExtendDays(Number(e.target.value))}
          disabled={busy}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {[3, 7, 14, 30].map((d) => (
            <option key={d} value={d}>
              +{d} días
            </option>
          ))}
        </select>
        <button
          disabled={busy}
          onClick={() => post({ action: 'extend_trial', days: extendDays })}
          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          Aplicar extensión
        </button>
      </div>

      {/* Change plan */}
      {plans.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700 shrink-0">Cambiar plan</label>
          <select
            aria-label="Plan de destino"
            value={selectedPlanId ?? ''}
            onChange={(e) => setSelectedPlanId(Number(e.target.value))}
            disabled={busy}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
          <button
            disabled={busy || !selectedPlanId}
            onClick={() => post({ action: 'change_plan', planId: selectedPlanId })}
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
          >
            Cambiar plan
          </button>
        </div>
      ) : null}

      {/* Cancel */}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <span className="text-sm font-medium text-slate-700 shrink-0">Zona peligrosa</span>
        {currentStatus !== 'cancelled' ? (
          <button
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  '¿Seguro que quieres marcar esta suscripción como cancelada? Esta acción afecta el acceso del tenant.'
                )
              ) {
                void post({ action: 'cancel' });
              }
            }}
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
          >
            Cancelar suscripción
          </button>
        ) : (
          <span className="rounded-lg border border-dashed border-slate-200 px-4 py-1.5 text-sm text-slate-400">
            Ya cancelada
          </span>
        )}
      </div>
    </div>
  );
}
