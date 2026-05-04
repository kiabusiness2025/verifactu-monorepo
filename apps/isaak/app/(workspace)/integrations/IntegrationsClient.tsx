'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Book,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCopy,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Key,
  Loader2,
  Mail,
  PlugZap,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unplug,
  Webhook,
  Zap,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type HoldedStatus = {
  status: string;
  tenantName: string | null;
  keyMasked: string | null;
  connectedAt: string | null;
  lastValidatedAt: string | null;
  validationSummary: string | null;
  supportedModules: string[];
};

type GoogleStatus = {
  connected: boolean;
  email: string | null;
  googleConfigured: boolean;
  hasGmailScope?: boolean;
};

type GmailInvoiceCandidate = {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  attachmentCount: number;
  hasLikelyInvoice: boolean;
};

type Tab = 'connectors' | 'catalog' | 'developer';

const SCOPE_OPTIONS = [
  { value: 'isaak.company.read', label: 'Empresa (lectura)', risk: 'low' },
  { value: 'isaak.invoices.read', label: 'Facturas (lectura)', risk: 'low' },
  { value: 'isaak.invoices.write', label: 'Facturas (escritura)', risk: 'medium' },
  { value: 'isaak.fiscal.read', label: 'Calendario fiscal (lectura)', risk: 'low' },
  { value: 'isaak.audit.read', label: 'Audit log (lectura)', risk: 'low' },
  { value: 'isaak.verifactu.submit', label: 'Envío AEAT (ejecución)', risk: 'high' },
  { value: 'isaak.actions.execute', label: 'Acciones (ejecución)', risk: 'high' },
];

const CATALOG_ITEMS = [
  {
    id: 'holded',
    name: 'Holded',
    desc: 'ERP · Facturación, CRM y contabilidad',
    logo: '🟠',
    status: 'active',
  },
  {
    id: 'google-cal',
    name: 'Google Calendar',
    desc: 'Sincroniza plazos fiscales',
    logo: '📅',
    status: 'active',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    desc: 'Detecta facturas de proveedores en tu bandeja de entrada',
    logo: '✉️',
    status: 'active',
  },
  {
    id: 'gdrive',
    name: 'Google Drive',
    desc: 'Accede a documentos y contratos',
    logo: '📁',
    status: 'soon',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    desc: 'Pagos, clientes y suscripciones',
    logo: '💳',
    status: 'soon',
  },
  {
    id: 'factusol',
    name: 'Factusol',
    desc: 'ERP alternativo a Holded',
    logo: '🧾',
    status: 'soon',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function moduleLabel(m: string) {
  const map: Record<string, string> = {
    invoicing: 'Ventas',
    accounting: 'Contabilidad',
    crm: 'CRM',
    projects: 'Proyectos',
    team: 'Equipo',
  };
  return map[m] ?? m;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof PlugZap;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2361d8]/10">
        <Icon size={16} className="text-[#2361d8]" />
      </div>
      <div>
        <div className="text-[14px] font-semibold text-[#011c67]">{title}</div>
        {subtitle && <div className="text-[12px] text-slate-500">{subtitle}</div>}
      </div>
    </div>
  );
}

function StatusDot({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-500'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {label}
    </span>
  );
}

// ── Holded Connector Card ──────────────────────────────────────────────────────

function HoldedCard({ status }: { status: HoldedStatus }) {
  const isConnected = status.status === 'active' || status.status === 'connected';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff5460]/10 text-lg">
            🟠
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-slate-900">Holded</span>
              <StatusDot active={isConnected} label={isConnected ? 'Activo' : 'Desconectado'} />
            </div>
            <div className="text-[12px] text-slate-500">ERP · Facturación, CRM y contabilidad</div>
          </div>
        </div>
        <Link
          href="/settings?section=connections"
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Gestionar
        </Link>
      </div>

      {isConnected && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px] sm:grid-cols-4">
            <div>
              <div className="text-slate-500">Empresa</div>
              <div className="font-medium text-slate-800">{status.tenantName ?? '—'}</div>
            </div>
            <div>
              <div className="text-slate-500">API key</div>
              <div className="font-mono font-medium text-slate-800">{status.keyMasked ?? '—'}</div>
            </div>
            <div>
              <div className="text-slate-500">Conectado</div>
              <div className="font-medium text-slate-800">{fmtDate(status.connectedAt)}</div>
            </div>
            <div>
              <div className="text-slate-500">Validado</div>
              <div className="font-medium text-slate-800">{fmtDate(status.lastValidatedAt)}</div>
            </div>
          </div>
          {status.supportedModules.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {status.supportedModules.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                >
                  <Check size={9} />
                  {moduleLabel(m)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Google Calendar Card ───────────────────────────────────────────────────────

function GoogleCalCard({
  status,
  syncing,
  onSync,
  onDisconnect,
}: {
  status: GoogleStatus;
  syncing: boolean;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-lg">
            📅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-slate-900">Google Calendar</span>
              <StatusDot
                active={status.connected}
                label={status.connected ? 'Activo' : 'Sin conectar'}
              />
            </div>
            <div className="text-[12px] text-slate-500">
              Sincroniza plazos fiscales automáticamente
            </div>
          </div>
        </div>

        {status.connected ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
              Sincronizar
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <Unplug size={12} />
              Desconectar
            </button>
          </div>
        ) : status.googleConfigured ? (
          <a
            href="/api/isaak/google/auth"
            className="shrink-0 rounded-lg bg-[#2361d8] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#1d55c2]"
          >
            Conectar
          </a>
        ) : (
          <span className="shrink-0 text-[12px] text-slate-400">No disponible en este plan</span>
        )}
      </div>
      {status.connected && status.email && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-2.5 text-[12px] text-slate-600">
          Cuenta: <span className="font-medium">{status.email}</span> ·{' '}
          <Link href="/calendario" className="text-[#2361d8] hover:underline">
            Ver calendario fiscal →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Gmail Facturas Card ────────────────────────────────────────────────────────

function GmailCard({
  googleConnected,
  hasGmailScope,
  googleConfigured,
}: {
  googleConnected: boolean;
  hasGmailScope: boolean;
  googleConfigured: boolean;
}) {
  const [scanning, setScanning] = useState(false);
  const [messages, setMessages] = useState<GmailInvoiceCandidate[] | null>(null);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function runScan() {
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch('/api/isaak/gmail/scan');
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        messages?: GmailInvoiceCandidate[];
        scannedAt?: string;
        error?: string;
      } | null;
      if (res.ok && data?.ok) {
        setMessages(data.messages ?? []);
        setScannedAt(data.scannedAt ?? null);
      } else {
        setScanError(data?.error ?? 'Error al escanear Gmail.');
      }
    } catch {
      setScanError('No se pudo conectar con el servidor.');
    } finally {
      setScanning(false);
    }
  }

  const displayed = messages ? (showAll ? messages : messages.slice(0, 5)) : [];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-lg">
            <Mail size={18} className="text-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-slate-900">
                Gmail — Facturas de proveedores
              </span>
              <StatusDot
                active={googleConnected && hasGmailScope}
                label={googleConnected && hasGmailScope ? 'Activo' : 'Sin acceso'}
              />
            </div>
            <div className="text-[12px] text-slate-500">
              Detecta emails con facturas de proveedores adjuntas
            </div>
          </div>
        </div>

        {!googleConfigured ? (
          <span className="shrink-0 text-[12px] text-slate-400">No disponible en este plan</span>
        ) : !googleConnected ? (
          <a
            href="/api/isaak/google/auth"
            className="shrink-0 rounded-lg bg-[#2361d8] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#1d55c2]"
          >
            Conectar Google
          </a>
        ) : !hasGmailScope ? (
          <a
            href="/api/isaak/google/auth"
            className="shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700 transition hover:bg-amber-100"
          >
            Reconectar para añadir Gmail
          </a>
        ) : (
          <button
            type="button"
            onClick={() => void runScan()}
            disabled={scanning}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {scanning ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
            Escanear facturas
          </button>
        )}
      </div>

      {/* Error */}
      {scanError && (
        <div className="border-t border-rose-100 bg-rose-50 px-5 py-3 text-[12px] text-rose-700">
          {scanError}
        </div>
      )}

      {/* Results */}
      {messages !== null && !scanError && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          {messages.length === 0 ? (
            <div className="py-2 text-center text-[12px] text-slate-400">
              No se encontraron emails con facturas en los últimos 30 días.
            </div>
          ) : (
            <div className="space-y-1">
              {displayed.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-[12px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-800">
                      {msg.subject || '(Sin asunto)'}
                    </div>
                    <div className="mt-0.5 truncate text-slate-500">{msg.from}</div>
                  </div>
                  <div className="shrink-0 text-[11px] text-slate-400">
                    {new Intl.DateTimeFormat('es-ES', { dateStyle: 'short' }).format(
                      new Date(msg.date)
                    )}
                  </div>
                </div>
              ))}

              {messages.length > 5 && !showAll && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="mt-1 w-full rounded-xl border border-slate-100 bg-white py-2 text-[12px] font-semibold text-[#2361d8] transition hover:bg-slate-50"
                >
                  Ver todas ({messages.length})
                </button>
              )}
            </div>
          )}

          {scannedAt && (
            <div className="mt-2 text-[11px] text-slate-400">
              Última exploración:{' '}
              {new Intl.DateTimeFormat('es-ES', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(scannedAt))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Catalog ────────────────────────────────────────────────────────────────────

function CatalogGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {CATALOG_ITEMS.map((item) => (
        <div
          key={item.id}
          className={`flex items-start gap-3 rounded-2xl border p-4 ${
            item.status === 'soon'
              ? 'border-dashed border-slate-200 bg-slate-50/50'
              : 'border-slate-200 bg-white shadow-sm'
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
            {item.logo}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-slate-900">{item.name}</span>
              {item.status === 'active' ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Activo
                </span>
              ) : (
                <span className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  Próximo
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">{item.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── API Keys Panel ─────────────────────────────────────────────────────────────

type NewKeyState = { name: string; scopes: string[] };

function ApiKeysPanel() {
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<NewKeyState>({ name: '', scopes: [] });
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  function toggleScope(scope: string) {
    setNewKey((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  }

  async function createKey() {
    if (!newKey.name.trim() || newKey.scopes.length === 0) {
      setCreateError('Pon un nombre y selecciona al menos un permiso.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/v1/platform/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKey.name, scopes: newKey.scopes }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        data?: { key?: string };
        error?: string;
      } | null;
      if (!res.ok || !data?.ok || !data.data?.key) {
        throw new Error(data?.error ?? 'No se pudo crear la API key.');
      }
      setCreatedKey(data.data.key);
      setShowCreate(false);
      setNewKey({ name: '', scopes: [] });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error al crear la key.');
    } finally {
      setCreating(false);
    }
  }

  async function copyKey() {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the text
    }
  }

  return (
    <div className="space-y-3">
      {/* Created key banner */}
      {createdKey && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-800">
            <CheckCircle2 size={15} />
            API Key creada — cópiala ahora, no volverás a verla
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 overflow-hidden rounded-xl border border-emerald-200 bg-white px-3 py-2">
              <code className="break-all text-[12px] font-mono text-slate-800">
                {showKey ? createdKey : createdKey.slice(0, 12) + '•'.repeat(20)}
              </code>
            </div>
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="rounded-lg border border-emerald-200 bg-white p-2 text-emerald-700 transition hover:bg-emerald-100"
            >
              {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            <button
              type="button"
              onClick={() => void copyKey()}
              className="rounded-lg border border-emerald-200 bg-white p-2 text-emerald-700 transition hover:bg-emerald-100"
            >
              {copied ? <Check size={13} /> : <ClipboardCopy size={13} />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCreatedKey(null)}
            className="mt-2 text-[11px] text-emerald-700 underline underline-offset-2"
          >
            Ya la guardé, cerrar
          </button>
        </div>
      )}

      {/* Empty state / coming soon */}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#2361d8]/10">
          <Key size={18} className="text-[#2361d8]" />
        </div>
        <p className="text-[13px] font-medium text-slate-700">Gestión de API keys</p>
        <p className="mt-1 text-[12px] text-slate-500">
          Crea claves con permisos granulares (scopes) para integrar Isaak con tus herramientas.
        </p>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#2361d8] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#1d55c2]"
        >
          <Plus size={13} />
          Crear API key
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[14px] font-semibold text-[#011c67]">Nueva API key</div>

          {createError && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              <AlertCircle size={13} />
              {createError}
            </div>
          )}

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-[12px] font-semibold text-slate-700">Nombre de uso</label>
              <input
                value={newKey.name}
                onChange={(e) => setNewKey((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="ej. n8n-ventas, claude-read"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none transition focus:border-[#2361d8]/40"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700">Permisos (scopes)</label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SCOPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[12px] transition ${
                      newKey.scopes.includes(opt.value)
                        ? 'border-[#2361d8]/30 bg-[#2361d8]/5 text-[#2361d8]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={newKey.scopes.includes(opt.value)}
                      onChange={() => toggleScope(opt.value)}
                      className="hidden"
                    />
                    <div
                      className={`h-3.5 w-3.5 shrink-0 rounded border ${
                        newKey.scopes.includes(opt.value)
                          ? 'border-[#2361d8] bg-[#2361d8]'
                          : 'border-slate-300'
                      } flex items-center justify-center`}
                    >
                      {newKey.scopes.includes(opt.value) && (
                        <Check size={9} className="text-white" />
                      )}
                    </div>
                    <span className="flex-1">{opt.label}</span>
                    {opt.risk === 'high' && (
                      <span className="rounded-full border border-rose-200 bg-rose-50 px-1.5 text-[10px] font-semibold text-rose-600">
                        Alto riesgo
                      </span>
                    )}
                    {opt.risk === 'medium' && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 text-[10px] font-semibold text-amber-600">
                        Escritura
                      </span>
                    )}
                  </label>
                ))}
              </div>
              {newKey.scopes.some(
                (s) => SCOPE_OPTIONS.find((o) => o.value === s)?.risk === 'high'
              ) && (
                <p className="mt-2 text-[11px] text-rose-600">
                  Los scopes de alto riesgo requieren confirmación por token en cada llamada.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewKey({ name: '', scopes: [] });
                  setCreateError(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void createKey()}
                disabled={creating}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2361d8] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#1d55c2] disabled:opacity-60"
              >
                {creating && <Loader2 size={12} className="animate-spin" />}
                Crear key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MCP Panel ──────────────────────────────────────────────────────────────────

function McpPanel() {
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const mcpEndpoint = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/mcp/isaak`;

  async function copyEndpoint() {
    try {
      await navigator.clipboard.writeText(mcpEndpoint);
      setCopiedEndpoint(true);
      setTimeout(() => setCopiedEndpoint(false), 2000);
    } catch {
      // clipboard not available — silently ignore
    }
  }

  return (
    <div className="space-y-3">
      {/* Endpoint info */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
          <Zap size={14} className="text-[#2361d8]" />
          MCP Server de Isaak
        </div>
        <p className="mt-1 text-[12px] text-slate-500">
          Conecta Claude, ChatGPT u otras IAs directamente a tus datos fiscales y de Holded.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Endpoint
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <code className="text-[12px] font-mono text-slate-700">/api/mcp/isaak</code>
              </div>
              <button
                type="button"
                onClick={() => void copyEndpoint()}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                title="Copiar endpoint"
              >
                {copiedEndpoint ? (
                  <Check size={13} className="text-emerald-500" />
                ) : (
                  <ClipboardCopy size={13} />
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <ShieldCheck size={12} className="text-emerald-500" />
                Autenticación
              </div>
              <div className="mt-1 text-slate-500">OAuth 2.0 + PKCE</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Code2 size={12} className="text-[#2361d8]" />
                Protocolo
              </div>
              <div className="mt-1 text-slate-500">MCP 2025-03-26</div>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Herramientas disponibles (12)
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[
                'Empresa',
                'Facturas',
                'VeriFactu',
                'Calendario fiscal',
                'Audit log',
                'Proponer acciones',
              ].map((tool) => (
                <span
                  key={tool}
                  className="rounded-full border border-[#2361d8]/20 bg-[#2361d8]/5 px-2 py-0.5 text-[11px] font-medium text-[#2361d8]"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick setup cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
            <Sparkles size={14} className="text-[#2361d8]" />
            Conectar con Claude
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Añade este servidor en Claude.ai → MCP Servers y autentica con tu cuenta de Isaak.
          </p>
          <a
            href="https://claude.verifactu.business/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#2361d8] transition hover:text-[#1d55c2]"
          >
            <Book size={12} />
            Instrucciones →
            <ExternalLink size={10} />
          </a>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
            <Globe size={14} className="text-slate-600" />
            Conectar con ChatGPT
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Plugin autorizado en el directorio Anthropic. Conéctate desde ChatGPT → Plugins.
          </p>
          <a
            href="https://holded.verifactu.business/docs/claude"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#2361d8] transition hover:text-[#1d55c2]"
          >
            <Book size={12} />
            Instrucciones →
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Webhooks Panel ─────────────────────────────────────────────────────────────

function WebhooksPanel() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
        <Webhook size={18} className="text-slate-400" />
      </div>
      <p className="text-[13px] font-medium text-slate-700">Webhooks</p>
      <p className="mt-1 text-[12px] text-slate-500">
        Recibe notificaciones en tu URL cuando ocurran eventos (facturas emitidas, validaciones
        AEAT, plazos fiscales).
      </p>
      <span className="mt-3 inline-block rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
        Disponible en plan Empresa
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function IntegrationsClient() {
  const [tab, setTab] = useState<Tab>('connectors');
  const [holdedStatus, setHoldedStatus] = useState<HoldedStatus | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [loadingHolded, setLoadingHolded] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadHolded = useCallback(async () => {
    setLoadingHolded(true);
    try {
      const res = await fetch('/api/settings/connections');
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        data?: HoldedStatus;
      } | null;
      if (res.ok && data?.ok && data.data) setHoldedStatus(data.data);
    } finally {
      setLoadingHolded(false);
    }
  }, []);

  const loadGoogle = useCallback(async () => {
    setLoadingGoogle(true);
    try {
      const res = await fetch('/api/isaak/google/status');
      const data = (await res.json().catch(() => null)) as GoogleStatus | null;
      if (res.ok && data) setGoogleStatus(data);
    } finally {
      setLoadingGoogle(false);
    }
  }, []);

  useEffect(() => {
    void loadHolded();
    void loadGoogle();
    // Handle Google OAuth callback notice
    const params = new URLSearchParams(window.location.search);
    const g = params.get('google');
    if (g === 'connected') setNotice('Google Calendar conectado correctamente.');
    if (g === 'error') setError('No se pudo conectar Google Calendar. Inténtalo de nuevo.');
  }, [loadHolded, loadGoogle]);

  async function syncGoogle() {
    setSyncing(true);
    setNotice(null);
    try {
      const res = await fetch('/api/isaak/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: new Date().getFullYear() }),
      });
      const data = (await res.json().catch(() => null)) as {
        created?: number;
        skipped?: number;
      } | null;
      if (res.ok) {
        setNotice(
          `Sincronizado: ${data?.created ?? 0} eventos creados, ${data?.skipped ?? 0} ya existían.`
        );
      } else {
        setError('Error al sincronizar. Comprueba la conexión con Google.');
      }
    } finally {
      setSyncing(false);
    }
  }

  async function disconnectGoogle() {
    if (!confirm('¿Desconectar Google Calendar?')) return;
    try {
      await fetch('/api/isaak/google/disconnect', { method: 'DELETE' });
      setGoogleStatus((prev) => (prev ? { ...prev, connected: false, email: null } : null));
      setNotice('Google Calendar desconectado.');
    } catch {
      setError('No se pudo desconectar Google Calendar.');
    }
  }

  const TABS: Array<{ key: Tab; label: string; icon: typeof PlugZap }> = [
    { key: 'connectors', label: 'Conectores activos', icon: PlugZap },
    { key: 'catalog', label: 'Catálogo', icon: Zap },
    { key: 'developer', label: 'API & MCP', icon: Code2 },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2361d8]/10">
            <PlugZap size={16} className="text-[#2361d8]" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-[#011c67]">Integraciones</h1>
            <p className="text-[12px] text-slate-500">
              Conectores, API keys, MCP server y webhooks
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                tab === key
                  ? 'bg-[#2361d8] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Notices */}
        {notice && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
            <CheckCircle2 size={14} />
            {notice}
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="ml-auto text-emerald-600 hover:text-emerald-800"
            >
              ×
            </button>
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
            <AlertCircle size={14} />
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-auto text-rose-600 hover:text-rose-800"
            >
              ×
            </button>
          </div>
        )}

        {/* ── TAB: Connectors ── */}
        {tab === 'connectors' && (
          <div className="space-y-5">
            <SectionTitle
              icon={PlugZap}
              title="Conectores activos"
              subtitle="Fuentes de datos conectadas a Isaak"
            />

            {loadingHolded || loadingGoogle ? (
              <div className="flex items-center gap-2 py-8 text-[13px] text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                Cargando conectores...
              </div>
            ) : (
              <div className="space-y-3">
                {holdedStatus && <HoldedCard status={holdedStatus} />}
                {googleStatus && (
                  <GoogleCalCard
                    status={googleStatus}
                    syncing={syncing}
                    onSync={() => void syncGoogle()}
                    onDisconnect={() => void disconnectGoogle()}
                  />
                )}
                {googleStatus && (
                  <GmailCard
                    googleConnected={googleStatus.connected}
                    hasGmailScope={googleStatus.hasGmailScope ?? false}
                    googleConfigured={googleStatus.googleConfigured}
                  />
                )}
              </div>
            )}

            {/* Next connectors teaser */}
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center gap-2 text-[12px] text-slate-500">
                <ChevronRight size={14} />
                Próximamente: Google Drive, Stripe, Factusol y más.{' '}
                <Link
                  href="/integrations?tab=catalog"
                  className="font-semibold text-[#2361d8] underline-offset-2 hover:underline"
                >
                  Ver catálogo →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Catalog ── */}
        {tab === 'catalog' && (
          <div className="space-y-5">
            <SectionTitle
              icon={Zap}
              title="Catálogo de conectores"
              subtitle="Añade nuevas fuentes de datos a Isaak"
            />
            <CatalogGrid />
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-[12px] text-slate-500">
              ¿Necesitas un conector específico? Escríbenos a{' '}
              <a
                href="mailto:soporte@verifactu.business"
                className="text-[#2361d8] underline underline-offset-2"
              >
                soporte@verifactu.business
              </a>
            </div>
          </div>
        )}

        {/* ── TAB: Developer / API & MCP ── */}
        {tab === 'developer' && (
          <div className="space-y-6">
            {/* API Keys */}
            <div className="space-y-3">
              <SectionTitle
                icon={Key}
                title="API Keys"
                subtitle="Acceso programático con permisos granulares"
              />
              <ApiKeysPanel />
            </div>

            <div className="border-t border-slate-100" />

            {/* MCP Server */}
            <div className="space-y-3">
              <SectionTitle
                icon={Zap}
                title="MCP Server"
                subtitle="Conecta IA externas directamente a tus datos"
              />
              <McpPanel />
            </div>

            <div className="border-t border-slate-100" />

            {/* Webhooks */}
            <div className="space-y-3">
              <SectionTitle
                icon={Webhook}
                title="Webhooks"
                subtitle="Notificaciones en tiempo real a tu sistema"
              />
              <WebhooksPanel />
            </div>

            {/* Audit logs link */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="text-[12px] text-slate-600">
                  <span className="font-medium">Audit log</span> — registro de todas las llamadas
                  API, scopes utilizados y acciones ejecutadas.
                </div>
                <Link
                  href="/settings?section=developer"
                  className="shrink-0 text-[12px] font-semibold text-[#2361d8] transition hover:text-[#1d55c2]"
                >
                  Ver log →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
