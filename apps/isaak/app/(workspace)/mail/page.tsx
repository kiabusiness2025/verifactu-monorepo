'use client';

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  RefreshCcw,
  Sparkles,
  Unplug,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type GmailCandidate = {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  attachmentCount: number;
  hasLikelyInvoice: boolean;
};

type GoogleStatus = {
  connected: boolean;
  email: string | null;
  hasGmailScope: boolean;
  googleConfigured: boolean;
};

type ProcessResult = {
  ok: boolean;
  reply: string;
  conversation?: { id: string; title: string } | null;
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function senderName(from: string) {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : (from.split('@')[0] ?? from);
}

export default function MailPage() {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [candidates, setCandidates] = useState<GmailCandidate[] | null>(null);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [processResults, setProcessResults] = useState<Record<string, ProcessResult>>({});

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/isaak/google/status');
      if (res.ok) setStatus((await res.json()) as GoogleStatus);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') setScanError(null);
  }, [loadStatus]);

  async function runScan(force = false) {
    setScanning(true);
    setScanError(null);
    try {
      const url = force ? '/api/isaak/gmail/scan?refresh=1' : '/api/isaak/gmail/scan';
      const res = await fetch(url);
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setScanError(d?.error ?? 'Error al escanear Gmail.');
        return;
      }
      const data = (await res.json()) as { messages?: GmailCandidate[]; scannedAt?: string };
      setCandidates(data.messages ?? []);
      setScannedAt(data.scannedAt ?? null);
    } finally {
      setScanning(false);
    }
  }

  async function processAttachment(messageId: string) {
    setProcessing(messageId);
    try {
      const res = await fetch('/api/isaak/gmail/process-attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      const data = (await res.json().catch(() => null)) as ProcessResult | null;
      if (data) {
        setProcessResults((prev) => ({ ...prev, [messageId]: data }));
      }
    } finally {
      setProcessing(null);
    }
  }

  if (loadingStatus) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <h1 className="text-[16px] font-semibold text-[#011c67]">
          Gmail — Facturas de proveedores
        </h1>
        <p className="text-[12px] text-slate-500">
          Detecta emails con facturas adjuntas y procésalos directamente como gasto en tu ERP
        </p>
      </div>

      <div className="flex-1 space-y-4 p-5">
        {/* Connection card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
                <Mail size={18} className="text-red-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Gmail</div>
                {status?.connected && status.email ? (
                  <div className="text-xs text-slate-500">{status.email}</div>
                ) : (
                  <div className="text-xs text-slate-400">No conectado</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {status?.connected && status.hasGmailScope ? (
                <>
                  <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 size={11} />
                    Conectado
                  </span>
                  <button
                    onClick={() => void runScan(true)}
                    disabled={scanning}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#2361d8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1d55c2] disabled:opacity-60"
                  >
                    {scanning ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCcw size={12} />
                    )}
                    {candidates === null ? 'Escanear' : 'Actualizar'}
                  </button>
                </>
              ) : status?.connected && !status.hasGmailScope ? (
                <a
                  href="/api/isaak/google/auth"
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
                >
                  <ExternalLink size={12} />
                  Reconectar con acceso Gmail
                </a>
              ) : status?.googleConfigured ? (
                <a
                  href="/api/isaak/google/auth"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#2361d8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1d55c2]"
                >
                  <ExternalLink size={12} />
                  Conectar Google
                </a>
              ) : (
                <span className="text-xs text-slate-400">No disponible en este plan</span>
              )}
            </div>
          </div>

          {status?.connected && status.hasGmailScope && (
            <p className="mt-3 text-xs text-slate-500">
              Isaak busca en los últimos 30 días emails con adjuntos que contengan facturas, recibos
              o albaranes. Solo lectura — Isaak nunca envía ni modifica emails.
            </p>
          )}
        </div>

        {/* Error */}
        {scanError && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {scanError}
          </div>
        )}

        {/* Empty state before first scan */}
        {status?.connected && status.hasGmailScope && candidates === null && !scanning && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white py-12 text-center shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
              <Mail size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Escanea tu bandeja de entrada</p>
              <p className="mt-1 max-w-xs text-xs text-slate-500">
                Isaak detectará emails con facturas adjuntas en los últimos 30 días para que puedas
                procesarlos sin salir de la app.
              </p>
            </div>
            <button
              onClick={() => void runScan()}
              disabled={scanning}
              className="inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1d55c2] disabled:opacity-60"
            >
              {scanning ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Escanear Gmail ahora
            </button>
          </div>
        )}

        {/* Scanning indicator */}
        {scanning && (
          <div className="flex items-center justify-center gap-3 rounded-xl border border-blue-100 bg-blue-50 py-6 text-sm font-medium text-blue-700">
            <Loader2 size={16} className="animate-spin" />
            Buscando facturas en Gmail...
          </div>
        )}

        {/* Results */}
        {candidates !== null && !scanning && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-slate-500" />
                <span className="text-[12px] font-semibold text-slate-700">
                  {candidates.length === 0
                    ? 'No se encontraron facturas en los últimos 30 días'
                    : `${candidates.length} emails con posibles facturas`}
                </span>
              </div>
              {scannedAt && (
                <span className="text-[10px] text-slate-400">
                  Último escaneo: {fmtDate(scannedAt)}
                </span>
              )}
            </div>

            {candidates.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-400">
                No hay emails con facturas adjuntas en los últimos 30 días.
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {candidates.map((c) => {
                  const result = processResults[c.id];
                  return (
                    <li key={c.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-[13px] font-medium text-slate-800">
                              {senderName(c.from)}
                            </span>
                            {c.hasLikelyInvoice && (
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                Factura detectada
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-slate-600">{c.subject}</p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">{c.snippet}</p>
                          <p className="mt-1 text-[10px] text-slate-400">{fmtDate(c.date)}</p>
                        </div>

                        <div className="shrink-0">
                          {result ? (
                            result.ok ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 size={11} />
                                  Procesado
                                </span>
                                {result.conversation && (
                                  <Link
                                    href={`/chat/${result.conversation.id}`}
                                    className="text-[10px] text-[#2361d8] hover:underline"
                                  >
                                    Ver en chat →
                                  </Link>
                                )}
                              </div>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] text-rose-600">
                                <AlertCircle size={11} />
                                Error
                              </span>
                            )
                          ) : (
                            <button
                              onClick={() => void processAttachment(c.id)}
                              disabled={processing === c.id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#2361d8] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#1d55c2] disabled:opacity-60"
                            >
                              {processing === c.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <Sparkles size={11} />
                              )}
                              Procesar
                            </button>
                          )}
                        </div>
                      </div>

                      {/* OCR result preview */}
                      {result?.ok && result.reply && (
                        <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-[11px] text-slate-700">
                          <p className="font-semibold text-emerald-800">Datos extraídos:</p>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed">{result.reply}</p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Disconnect */}
        {status?.connected && (
          <div className="flex justify-end">
            <button
              onClick={async () => {
                if (!confirm('¿Desconectar Google (Calendar, Gmail y Drive)?')) return;
                await fetch('/api/isaak/google/disconnect', { method: 'DELETE' });
                await loadStatus();
                setCandidates(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
            >
              <Unplug size={12} />
              Desconectar Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
