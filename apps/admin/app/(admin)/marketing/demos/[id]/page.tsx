'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminGet, adminPatch } from '@/lib/adminApi';

type DemoRequest = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  email: string;
  phone: string | null;
  companyName: string;
  taxId: string | null;
  role: string | null;
  usesHolded: boolean;
  objective: string | null;
  source: string | null;
  consent: boolean;
  status: string;
  notes: string | null;
};

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CONTACTED', label: 'Contactado' },
  { value: 'SCHEDULED', label: 'Agendado' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'DISQUALIFIED', label: 'Descartado' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONTACTED: 'bg-sky-100 text-sky-800',
  SCHEDULED: 'bg-violet-100 text-violet-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  DISQUALIFIED: 'bg-slate-100 text-slate-600',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DemoRequestDetailPage() {
  const rawParams = useParams();
  const params = { id: (rawParams?.id as string) ?? '' };
  const router = useRouter();
  const [item, setItem] = useState<DemoRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await adminGet<{ item: DemoRequest }>(`/api/admin/demo-requests/${params.id}`);
        if (mounted && res.item) {
          setItem(res.item);
          setStatus(res.item.status);
          setNotes(res.item.notes ?? '');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [params.id]);

  async function handleSave() {
    if (!item) return;
    setSaving(true);
    setSaved(false);
    setErrorMsg('');
    try {
      const res = await adminPatch<{ item: DemoRequest }>(`/api/admin/demo-requests/${item.id}`, {
        status,
        notes,
      });
      setItem(res.item);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-500">Cargando...</div>;
  }

  if (!item) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Solicitud no encontrada.{' '}
        <button type="button" onClick={() => router.back()} className="underline">
          Volver
        </button>
      </div>
    );
  }

  const Field = ({ label, value }: { label: string; value: string | null | undefined }) =>
    value ? (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 text-sm text-slate-800">{value}</p>
      </div>
    ) : null;

  return (
    <main className="space-y-6">
      <header className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
        >
          ← Volver
        </button>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{item.name}</h1>
          <p className="text-sm text-slate-500">
            {item.companyName} · {formatDate(item.createdAt)}
          </p>
        </div>
        <span
          className={`ml-auto inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[item.status] ?? 'bg-slate-100 text-slate-700'}`}
        >
          {STATUS_OPTIONS.find((o) => o.value === item.status)?.label ?? item.status}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Datos de la solicitud */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold text-slate-900">Datos de la solicitud</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" value={item.name} />
            <Field label="Email" value={item.email} />
            <Field label="Empresa" value={item.companyName} />
            <Field label="Telefono" value={item.phone} />
            <Field label="CIF / NIF" value={item.taxId} />
            <Field label="Rol" value={item.role} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Usa Holded
              </p>
              <p className="mt-1 text-sm text-slate-800">{item.usesHolded ? 'Sí' : 'No'}</p>
            </div>
            <Field label="Origen" value={item.source} />
          </div>

          {item.objective && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Objetivo de la demo
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
                {item.objective}
              </p>
            </div>
          )}
        </div>

        {/* Estado y notas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold text-slate-900">Gestión</h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="demo-status"
                className="mb-1.5 block text-xs font-semibold text-slate-500"
              >
                Estado
              </label>
              <select
                id="demo-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Notas internas
              </label>
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contexto de la llamada, fecha confirmada, observaciones..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              />
            </div>

            {errorMsg && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errorMsg}</p>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Última actualización: {formatDate(item.updatedAt)}
          </p>
        </div>
      </div>
    </main>
  );
}
