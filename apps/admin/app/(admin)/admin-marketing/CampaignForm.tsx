'use client';

import { adminPost } from '@/lib/adminApi';
import { useState } from 'react';

type Segment = 'all_users' | 'holded_connected' | 'holded_error';

type SegmentOption = { value: Segment; label: string; count: number };

type Props = {
  segments: SegmentOption[];
};

type DryRunResult = {
  dryRun: true;
  segment: Segment;
  recipientCount: number;
  recipients: string[];
  truncated: boolean;
};

type SendResult = {
  ok: true;
  sent: number;
  failed: number;
  total: number;
};

export function CampaignForm({ segments }: Props) {
  const [segment, setSegment] = useState<Segment>('holded_connected');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<DryRunResult | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedSegment = segments.find((s) => s.value === segment);

  async function handlePreview() {
    if (!subject.trim() || !body.trim()) {
      setError('Rellena el asunto y el cuerpo antes de previsualizar.');
      return;
    }
    setBusy(true);
    setError(null);
    setPreview(null);
    setResult(null);
    try {
      const data = await adminPost<DryRunResult>('/api/admin/marketing/send', {
        segment,
        subject,
        html: body,
        dryRun: true,
      });
      setPreview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    if (!preview) return;
    if (
      !confirm(
        `¿Enviar "${subject}" a ${preview.recipientCount} destinatarios? Esta acción no se puede deshacer.`
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const data = await adminPost<SendResult>('/api/admin/marketing/send', {
        segment,
        subject,
        html: body,
        dryRun: false,
      });
      setResult(data);
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-lg font-semibold text-emerald-800">Campaña enviada</p>
        <p className="mt-1 text-sm text-emerald-700">
          {result.sent} enviados · {result.failed} fallidos · {result.total} total
        </p>
        <button
          onClick={() => {
            setResult(null);
            setSubject('');
            setBody('');
            setPreview(null);
          }}
          className="mt-4 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          Nueva campaña
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Segment */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Segmento</label>
        <div className="flex flex-wrap gap-2">
          {segments.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => {
                setSegment(s.value);
                setPreview(null);
              }}
              className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
                segment === s.value
                  ? 'border-[#2361d8] bg-[#2361d8] text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {s.label}
              <span
                className={`ml-1.5 text-xs ${segment === s.value ? 'text-blue-200' : 'text-slate-400'}`}
              >
                ({s.count.toLocaleString('es-ES')})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Asunto</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setPreview(null);
          }}
          placeholder="Asunto del email…"
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-[#2361d8] focus:outline-none"
        />
      </div>

      {/* Body */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
          Cuerpo (HTML o texto plano)
        </label>
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setPreview(null);
          }}
          rows={10}
          placeholder={'<p>Hola {{nombre}},</p>\n<p>Tu mensaje aquí…</p>'}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-xs placeholder:text-slate-400 focus:border-[#2361d8] focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {/* Preview result */}
      {preview && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">
            Vista previa — {preview.recipientCount.toLocaleString('es-ES')} destinatarios
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {preview.recipients.map((email) => (
              <span
                key={email}
                className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600"
              >
                {email}
              </span>
            ))}
            {preview.truncated && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-400">
                +{preview.recipientCount - preview.recipients.length} más…
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePreview}
          disabled={busy}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {busy && !preview ? 'Consultando…' : 'Ver destinatarios'}
        </button>
        {preview && (
          <button
            type="button"
            onClick={handleSend}
            disabled={busy}
            className="rounded-xl bg-[#2361d8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e56c4] disabled:opacity-50"
          >
            {busy
              ? 'Enviando…'
              : `Enviar a ${preview.recipientCount.toLocaleString('es-ES')} usuarios`}
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Segmento seleccionado: <strong>{selectedSegment?.label}</strong> ·{' '}
        {selectedSegment?.count.toLocaleString('es-ES')} usuarios estimados
      </p>
    </div>
  );
}
