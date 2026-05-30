'use client';

// V1.8.2 — Gestor de códigos promocionales Stripe (admin only).
//
// Lista de códigos activos + form rápido para crear uno nuevo con
// % descuento, duración y caducidad. Cada código genera un share URL
// que se puede enviar a clientes/prospects.

import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  Tag,
  Ticket,
} from 'lucide-react';

type PromoCode = {
  id: string;
  code: string;
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: string | null;
  createdAt: string;
  discountPct: number | null;
  duration: 'once' | 'repeating' | 'forever' | null;
  durationMonths: number | null;
  shareUrl: string;
};

type FormState = {
  code: string;
  percentOff: string;
  duration: 'once' | 'repeating' | 'forever';
  durationMonths: string;
  maxRedemptions: string;
  expiresInDays: string;
};

const EMPTY: FormState = {
  code: '',
  percentOff: '20',
  duration: 'once',
  durationMonths: '3',
  maxRedemptions: '',
  expiresInDays: '',
};

export default function AdminPromoPage() {
  const [codes, setCodes] = useState<PromoCode[] | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/isaak/admin/promo-codes', { credentials: 'include' });
      if (res.status === 403) {
        setError('Necesitas acceso de administrador para esta página.');
        return;
      }
      if (!res.ok) {
        setError(`Error ${res.status}`);
        return;
      }
      const data = (await res.json()) as { codes: PromoCode[]; stripeConfigured?: boolean };
      setStripeConfigured(data.stripeConfigured ?? true);
      setCodes(data.codes ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        code: form.code,
        percentOff: Number(form.percentOff),
        duration: form.duration,
      };
      if (form.duration === 'repeating') body.durationMonths = Number(form.durationMonths);
      if (form.maxRedemptions) body.maxRedemptions = Number(form.maxRedemptions);
      if (form.expiresInDays) body.expiresInDays = Number(form.expiresInDays);

      const res = await fetch('/api/isaak/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok || !data.ok) {
        setError(data.message ?? data.error ?? `Error ${res.status}`);
        return;
      }
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2361d8] text-white">
          <Tag className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Códigos promocionales</h1>
          <p className="text-sm text-slate-500">
            Genera códigos de descuento que aplican en el checkout de Pro (Stripe).
          </p>
        </div>
      </div>

      {!stripeConfigured && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Stripe no está configurado en este entorno. Define{' '}
          <code className="font-mono">STRIPE_SECRET_KEY</code> en Vercel para usar esta página.
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Form crear */}
      {stripeConfigured && (
        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
            <Plus className="h-4 w-4 text-[#2361d8]" />
            Crear nuevo código
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Código</label>
              <input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase().slice(0, 20) }))
                }
                required
                pattern="[A-Z0-9_-]{4,20}"
                placeholder="CYBER25"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm uppercase outline-none placeholder:text-slate-300 focus:border-[#2361d8]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">% descuento</label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.percentOff}
                onChange={(e) => setForm((f) => ({ ...f, percentOff: e.target.value }))}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#2361d8]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Duración</label>
              <select
                value={form.duration}
                onChange={(e) =>
                  setForm((f) => ({ ...f, duration: e.target.value as FormState['duration'] }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#2361d8]"
              >
                <option value="once">Solo primera factura</option>
                <option value="repeating">N meses</option>
                <option value="forever">Para siempre</option>
              </select>
            </div>
            {form.duration === 'repeating' && (
              <div>
                <label className="text-xs font-semibold text-slate-700">Meses</label>
                <input
                  type="number"
                  min={1}
                  max={36}
                  value={form.durationMonths}
                  onChange={(e) => setForm((f) => ({ ...f, durationMonths: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#2361d8]"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Máx usos (opcional)
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={form.maxRedemptions}
                onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
                placeholder="ilimitado"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-[#2361d8]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Caduca en (días, opcional)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={form.expiresInDays}
                onChange={(e) => setForm((f) => ({ ...f, expiresInDays: e.target.value }))}
                placeholder="no caduca"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-[#2361d8]"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f55c0] disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
            Crear código
          </button>
        </form>
      )}

      {/* Lista */}
      {codes && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-slate-900">
            Códigos activos {codes.length > 0 && `(${codes.length})`}
          </h2>
          {codes.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
              Aún no hay códigos activos. Crea el primero arriba.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {codes.map((c) => (
                <li
                  key={c.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-base font-bold text-[#2361d8]">{c.code}</p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {c.discountPct ? `${c.discountPct}% descuento` : 'Descuento personalizado'}
                        {c.duration === 'once'
                          ? ' · 1 vez'
                          : c.duration === 'repeating'
                            ? ` · ${c.durationMonths} meses`
                            : ' · indefinido'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Usados: {c.timesRedeemed}
                        {c.maxRedemptions ? `/${c.maxRedemptions}` : ' · sin tope'}
                        {c.expiresAt
                          ? ` · caduca ${new Date(c.expiresAt).toLocaleDateString('es-ES')}`
                          : ' · sin caducidad'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleCopy(c.shareUrl, c.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        {copiedId === c.id ? (
                          <>
                            <Check className="h-3 w-3" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copiar URL
                          </>
                        )}
                      </button>
                      <a
                        href={c.shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-slate-500 transition hover:bg-slate-50"
                        title="Abrir checkout"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <p className="mt-2 truncate font-mono text-[10px] text-slate-400">
                    {c.shareUrl}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
