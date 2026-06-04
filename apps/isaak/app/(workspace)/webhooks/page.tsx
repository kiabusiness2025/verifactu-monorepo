'use client';

// V1.8.3 — Gestor de webhook endpoints para el tenant.
//
// CRUD inline contra /api/isaak/webhooks/endpoints. Cuando el endpoint
// se crea, mostramos el secret UNA sola vez con copy-to-clipboard +
// aviso de que después solo se ve enmascarado.

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Plus,
  Power,
  PlayCircle,
  Trash2,
  Webhook,
} from 'lucide-react';

type Endpoint = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  secretMasked: string;
  stats: { delivered: number; failed: number; pending: number };
};

type CreatedEndpoint = Endpoint & { secret: string; secretShownOnce: string };

export default function WebhooksPage() {
  const [available, setAvailable] = useState<string[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form crear
  const [showForm, setShowForm] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  // Just-created (mostrar secret una vez)
  const [justCreated, setJustCreated] = useState<CreatedEndpoint | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Busy states por endpoint
  const [busy, setBusy] = useState<Record<string, 'toggle' | 'delete' | 'test' | null>>({});

  // Resultado del último test por endpoint
  const [testResult, setTestResult] = useState<
    Record<string, { ok: boolean; statusCode: number | null; durationMs: number; event: string; error: string | null }>
  >({});

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/isaak/webhooks/endpoints', { credentials: 'include' });
      if (res.ok) {
        const data = (await res.json()) as { availableEvents: string[]; endpoints: Endpoint[] };
        setAvailable(data.availableEvents);
        setEndpoints(data.endpoints);
        setError(null);
      } else if (res.status !== 401) {
        setError(`Error ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleEventSelected = (ev: string) => {
    setNewEvents((prev) => {
      const next = new Set(prev);
      if (next.has(ev)) next.delete(ev);
      else next.add(ev);
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/isaak/webhooks/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl, events: Array.from(newEvents) }),
      });
      const data = (await res.json()) as { endpoint?: CreatedEndpoint; error?: string; message?: string };
      if (!res.ok || !data.endpoint) {
        setError(data.message ?? data.error ?? `Error ${res.status}`);
        return;
      }
      setJustCreated(data.endpoint);
      setNewUrl('');
      setNewEvents(new Set());
      setShowForm(false);
      await load();
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    setBusy((b) => ({ ...b, [id]: 'toggle' }));
    try {
      await fetch(`/api/isaak/webhooks/endpoints/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !current }),
      });
      await load();
    } finally {
      setBusy((b) => ({ ...b, [id]: null }));
    }
  };

  const handleTest = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: 'test' }));
    setTestResult((r) => {
      const next = { ...r };
      delete next[id];
      return next;
    });
    try {
      const res = await fetch(`/api/isaak/webhooks/endpoints/${id}/test`, { method: 'POST' });
      const data = (await res.json()) as {
        ok: boolean;
        statusCode: number | null;
        durationMs: number;
        event: string;
        error: string | null;
      };
      setTestResult((r) => ({ ...r, [id]: data }));
    } catch (e) {
      setTestResult((r) => ({
        ...r,
        [id]: {
          ok: false,
          statusCode: null,
          durationMs: 0,
          event: '—',
          error: e instanceof Error ? e.message : 'Error de red',
        },
      }));
    } finally {
      setBusy((b) => ({ ...b, [id]: null }));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Borrar este endpoint? Los eventos pendientes no se entregarán.')) return;
    setBusy((b) => ({ ...b, [id]: 'delete' }));
    try {
      await fetch(`/api/isaak/webhooks/endpoints/${id}`, { method: 'DELETE' });
      await load();
    } finally {
      setBusy((b) => ({ ...b, [id]: null }));
    }
  };

  const copySecret = async () => {
    if (!justCreated) return;
    try {
      await navigator.clipboard.writeText(justCreated.secret);
      setCopiedSecret(true);
      window.setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2361d8] text-white">
          <Webhook className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Webhooks</h1>
          <p className="text-sm text-slate-500">
            Recibe eventos de Isaak (facturas, pagos, modelos AEAT, chat) en tu
            propio servidor para integrarlo con tu CRM, automatizaciones, etc.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Just-created banner con secret visible una sola vez */}
      {justCreated && (
        <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-emerald-900">
                Endpoint creado — guarda el secret AHORA
              </h3>
              <p className="mt-1 text-xs leading-5 text-emerald-800">{justCreated.secretShownOnce}</p>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 font-mono text-xs">
                <code className="min-w-0 flex-1 truncate">{justCreated.secret}</code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-800"
                >
                  {copiedSecret ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedSecret ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setJustCreated(null)}
                className="mt-3 text-xs font-medium text-emerald-800 underline"
              >
                Ya lo he guardado, ocultar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form crear */}
      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-bold text-slate-900">Crear endpoint</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">
                URL del endpoint (debe responder POST con 2xx)
              </label>
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                required
                placeholder="https://tu-servidor.com/isaak-webhooks"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-[#2361d8]"
              />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-700">Eventos a recibir</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {available.map((ev) => {
                  const selected = newEvents.has(ev);
                  return (
                    <button
                      key={ev}
                      type="button"
                      onClick={() => toggleEventSelected(ev)}
                      className={`rounded-full border px-3 py-1 font-mono text-[11px] font-medium transition ${
                        selected
                          ? 'border-[#2361d8] bg-[#2361d8] text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {ev}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={creating || newEvents.size === 0 || !newUrl}
              className="inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1f55c0] disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1f55c0]"
        >
          <Plus className="h-4 w-4" />
          Añadir endpoint
        </button>
      )}

      {/* Lista */}
      {endpoints && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-slate-900">
            Endpoints activos {endpoints.length > 0 && `(${endpoints.length})`}
          </h2>
          {endpoints.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              Aún no tienes webhooks configurados. Añade uno para recibir eventos en
              tu propio servidor.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {endpoints.map((e) => (
                <li key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <code className="truncate font-mono text-sm text-slate-800">{e.url}</code>
                        {e.active ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Activo
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            Pausado
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Secret: <code className="font-mono">{e.secretMasked}</code>
                      </p>
                      <p className="mt-1.5 flex flex-wrap gap-1">
                        {e.events.map((ev) => (
                          <span
                            key={ev}
                            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700"
                          >
                            {ev}
                          </span>
                        ))}
                      </p>
                      <p className="mt-1.5 text-[10px] text-slate-500">
                        ✓ {e.stats.delivered} entregadas · ⚠ {e.stats.failed} fallidas · ⌛{' '}
                        {e.stats.pending} pendientes
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleTest(e.id)}
                        disabled={busy[e.id] === 'test'}
                        title="Enviar evento de prueba"
                        className="rounded-lg border border-blue-200 bg-blue-50 p-1.5 text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                      >
                        {busy[e.id] === 'test' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <PlayCircle className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggle(e.id, e.active)}
                        disabled={busy[e.id] === 'toggle'}
                        title={e.active ? 'Pausar' : 'Activar'}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        {busy[e.id] === 'toggle' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Power className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(e.id)}
                        disabled={busy[e.id] === 'delete'}
                        title="Eliminar"
                        className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        {busy[e.id] === 'delete' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  {testResult[e.id] && (
                    <div
                      className={`mt-3 rounded-lg border px-3 py-2 text-[11px] ${
                        testResult[e.id].ok
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                          : 'border-rose-200 bg-rose-50 text-rose-900'
                      }`}
                    >
                      {testResult[e.id].ok ? '✓ ' : '✗ '}
                      Evento <code className="font-mono">{testResult[e.id].event}</code> ·{' '}
                      {testResult[e.id].statusCode != null
                        ? `HTTP ${testResult[e.id].statusCode}`
                        : 'sin respuesta'}{' '}
                      · {testResult[e.id].durationMs} ms
                      {testResult[e.id].error ? ` · ${testResult[e.id].error}` : ''}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Docs minimal */}
      <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-xs leading-6 text-slate-600">
        <h3 className="text-sm font-bold text-slate-900">Cómo funciona</h3>
        <ul className="mt-2 space-y-1">
          <li>· Cada evento se entrega como POST con JSON body al endpoint configurado.</li>
          <li>
            · Header <code className="rounded bg-white px-1 font-mono">X-Isaak-Signature</code>{' '}
            con HMAC-SHA256 del body usando tu secret. Verifícalo siempre antes de procesar.
          </li>
          <li>· Reintentos automáticos hasta 5 veces con backoff exponencial.</li>
          <li>· Tu endpoint debe responder 2xx en menos de 10 s para considerarse entregado.</li>
        </ul>
      </div>
    </div>
  );
}
