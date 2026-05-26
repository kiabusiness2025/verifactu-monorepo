'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Book,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Code2,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Key,
  Landmark,
  LayoutGrid,
  Loader2,
  Mail,
  MessageCircle,
  Monitor,
  Plug,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unplug,
  Wallet,
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
  hasDriveScope?: boolean;
};

type MicrosoftStatus = {
  connected: boolean;
  email: string | null;
  displayName: string | null;
  connectedAt: string | null;
  hasCalendarScope: boolean;
  hasMailScope: boolean;
  hasSendScope: boolean;
  hasOneDriveScope: boolean;
  microsoftConfigured: boolean;
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

type Tab = 'connectors' | 'developer';

// ── Categories & catalog ───────────────────────────────────────────────────────

type CategoryKey =
  | 'all'
  | 'sectorial'
  | 'google'
  | 'microsoft'
  | 'banca'
  | 'comunicacion'
  | 'pagos';

const CATEGORIES: { key: CategoryKey; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'Todos', icon: LayoutGrid },
  { key: 'sectorial', label: 'Sectorial', icon: Plug },
  { key: 'google', label: 'Google', icon: Globe },
  { key: 'microsoft', label: 'Microsoft', icon: Monitor },
  { key: 'banca', label: 'Banca', icon: Landmark },
  { key: 'comunicacion', label: 'Comunicación', icon: MessageCircle },
  { key: 'pagos', label: 'Pagos', icon: Wallet },
];

type IntegrationMeta = {
  id: string;
  name: string;
  desc: string;
  logo: string;
  category: Exclude<CategoryKey, 'all'>;
  available: boolean;
};

const INTEGRATIONS: IntegrationMeta[] = [
  {
    id: 'holded',
    name: 'Holded',
    category: 'sectorial',
    desc: 'Facturación, CRM y contabilidad en la nube',
    logo: '🟠',
    available: true,
  },
  {
    id: 'hotelgest',
    name: 'HotelGest',
    category: 'sectorial',
    desc: 'PMS hotelero — reservas, ocupación, RevPAR y facturación',
    logo: '🏨',
    available: true,
  },
  {
    id: 'inmovilla',
    name: 'Inmovilla',
    category: 'sectorial',
    desc: 'Gestión inmobiliaria — propiedades, operaciones y clientes',
    logo: '🏠',
    available: false,
  },
  {
    id: 'revo',
    name: 'Revo XEF',
    category: 'sectorial',
    desc: 'TPV para restaurantes, bares y hostelería',
    logo: '🍽️',
    available: false,
  },
  {
    id: 'nubimed',
    name: 'Nubimed',
    category: 'sectorial',
    desc: 'Gestión de clínicas dentales y médicas',
    logo: '🏥',
    available: false,
  },
  {
    id: 'gesden',
    name: 'Gesden',
    category: 'sectorial',
    desc: 'Software dental líder en España — clínicas y odontólogos',
    logo: '🦷',
    available: false,
  },
  {
    id: 'mindbody',
    name: 'Mindbody',
    category: 'sectorial',
    desc: 'Gestión de gimnasios, spas y centros de wellness',
    logo: '🏋️',
    available: false,
  },
  {
    id: 'prestashop',
    name: 'PrestaShop',
    category: 'sectorial',
    desc: 'E-commerce — tiendas online con API pública',
    logo: '🛒',
    available: false,
  },
  {
    id: 'teamup',
    name: 'TeamUp',
    category: 'sectorial',
    desc: 'Gestión de gimnasios y centros deportivos',
    logo: '💪',
    available: false,
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'google',
    desc: 'Sincroniza plazos fiscales automáticamente',
    logo: '📅',
    available: true,
  },
  {
    id: 'gmail',
    name: 'Gmail Facturas',
    category: 'google',
    desc: 'Detecta y procesa facturas en tu bandeja de entrada',
    logo: '✉️',
    available: true,
  },
  {
    id: 'gdrive',
    name: 'Google Drive',
    category: 'google',
    desc: 'Archiva facturas PDF automáticamente en la nube',
    logo: '📁',
    available: true,
  },
  {
    id: 'microsoft',
    name: 'Microsoft 365',
    category: 'microsoft',
    desc: 'Outlook Calendar, Mail y OneDrive integrados',
    logo: '🪟',
    available: true,
  },
  {
    id: 'banking',
    name: 'Open Banking',
    category: 'banca',
    desc: 'Movimientos bancarios y conciliación automática PSD2',
    logo: '🏦',
    available: true,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'comunicacion',
    desc: 'Consulta a Isaak directamente desde tu WhatsApp',
    logo: '💬',
    available: true,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'pagos',
    desc: 'Pagos, clientes y suscripciones',
    logo: '💳',
    available: false,
  },
];

const CATEGORY_SECTION_LABELS: Record<Exclude<CategoryKey, 'all'>, string> = {
  sectorial: 'Software Sectorial',
  google: 'Google Workspace',
  microsoft: 'Microsoft 365',
  banca: 'Banca',
  comunicacion: 'Comunicación',
  pagos: 'Pagos',
};

const SCOPE_OPTIONS = [
  { value: 'isaak.company.read', label: 'Empresa (lectura)', risk: 'low' },
  { value: 'isaak.invoices.read', label: 'Facturas (lectura)', risk: 'low' },
  { value: 'isaak.invoices.write', label: 'Facturas (escritura)', risk: 'medium' },
  { value: 'isaak.fiscal.read', label: 'Calendario fiscal (lectura)', risk: 'low' },
  { value: 'isaak.audit.read', label: 'Audit log (lectura)', risk: 'low' },
  { value: 'isaak.verifactu.submit', label: 'Envío AEAT (ejecución)', risk: 'high' },
  { value: 'isaak.actions.execute', label: 'Acciones (ejecución)', risk: 'high' },
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

// ── Shared UI ──────────────────────────────────────────────────────────────────

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

function SoonCard({ name, desc, logo }: { name: string; desc: string; logo: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg opacity-60">
        {logo}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-500">{name}</span>
          <span className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
            Próximamente
          </span>
        </div>
        <div className="mt-0.5 text-[11px] text-slate-400">{desc}</div>
      </div>
    </div>
  );
}

// ── Connector Cards ────────────────────────────────────────────────────────────

function HoldedCard({ status }: { status: HoldedStatus }) {
  const isConnected = status.status === 'active' || status.status === 'connected';
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-lg">
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
      } else setScanError(data?.error ?? 'Error al escanear Gmail.');
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
              <span className="text-[14px] font-semibold text-slate-900">Gmail Facturas</span>
              <StatusDot
                active={googleConnected && hasGmailScope}
                label={googleConnected && hasGmailScope ? 'Activo' : 'Sin acceso'}
              />
            </div>
            <div className="text-[12px] text-slate-500">Detecta emails con facturas adjuntas</div>
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
            Reconectar para Gmail
          </a>
        ) : (
          <button
            type="button"
            onClick={() => void runScan()}
            disabled={scanning}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {scanning ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
            Escanear
          </button>
        )}
      </div>
      {scanError && (
        <div className="border-t border-rose-100 bg-rose-50 px-5 py-3 text-[12px] text-rose-700">
          {scanError}
        </div>
      )}
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
              {new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(
                new Date(scannedAt)
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DriveCard({
  googleConnected,
  hasDriveScope,
  googleConfigured,
}: {
  googleConnected: boolean;
  hasDriveScope: boolean;
  googleConfigured: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">
            📁
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-slate-900">Google Drive</span>
              <StatusDot
                active={googleConnected && hasDriveScope}
                label={googleConnected && hasDriveScope ? 'Activo' : 'Sin acceso'}
              />
            </div>
            <div className="text-[12px] text-slate-500">
              Archiva facturas PDF en «Isaak — Facturas»
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
        ) : !hasDriveScope ? (
          <a
            href="/api/isaak/google/auth"
            className="shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700 transition hover:bg-amber-100"
          >
            Reconectar para Drive
          </a>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
            <CheckCircle2 size={14} className="text-emerald-500" />
            Carpeta activa
          </span>
        )}
      </div>
    </div>
  );
}

function MicrosoftCard({ status }: { status: MicrosoftStatus }) {
  const scopeLabels: string[] = [];
  if (status.hasCalendarScope) scopeLabels.push('Calendario');
  if (status.hasMailScope) scopeLabels.push('Correo');
  if (status.hasOneDriveScope) scopeLabels.push('OneDrive');
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">
            🪟
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-slate-900">Microsoft 365</span>
              <StatusDot
                active={status.connected}
                label={status.connected ? 'Activo' : 'Sin conectar'}
              />
            </div>
            <div className="text-[12px] text-slate-500">Outlook Calendar, Mail y OneDrive</div>
          </div>
        </div>
        <Link
          href="/microsoft"
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Gestionar
        </Link>
      </div>
      {status.connected && status.email && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-2.5 text-[12px] text-slate-600">
          Cuenta: <span className="font-medium">{status.email}</span>
          {scopeLabels.length > 0 && <> · {scopeLabels.join(', ')}</>}
        </div>
      )}
    </div>
  );
}

function BankingCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <Landmark size={18} className="text-emerald-600" />
          </div>
          <div>
            <span className="text-[14px] font-semibold text-slate-900">Open Banking</span>
            <div className="text-[12px] text-slate-500">
              Movimientos bancarios y conciliación automática · PSD2
            </div>
          </div>
        </div>
        <Link
          href="/banking"
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Gestionar
        </Link>
      </div>
    </div>
  );
}

function WhatsAppCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg">
            💬
          </div>
          <div>
            <span className="text-[14px] font-semibold text-slate-900">WhatsApp Business</span>
            <div className="text-[12px] text-slate-500">
              Consulta a Isaak directamente desde tu WhatsApp
            </div>
          </div>
        </div>
        <Link
          href="/whatsapp"
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Ver estado
        </Link>
      </div>
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
      if (!res.ok || !data?.ok || !data.data?.key)
        throw new Error(data?.error ?? 'No se pudo crear la API key.');
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
      /* ignore */
    }
  }

  return (
    <div className="space-y-3">
      {createdKey && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-800">
            <CheckCircle2 size={15} />
            API Key creada — cópiala ahora, no volverás a verla
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 overflow-hidden rounded-xl border border-emerald-200 bg-white px-3 py-2">
              <code className="break-all font-mono text-[12px] text-slate-800">
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
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[12px] transition ${newKey.scopes.includes(opt.value) ? 'border-[#2361d8]/30 bg-[#2361d8]/5 text-[#2361d8]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={newKey.scopes.includes(opt.value)}
                      onChange={() => toggleScope(opt.value)}
                      className="hidden"
                    />
                    <div
                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${newKey.scopes.includes(opt.value) ? 'border-[#2361d8] bg-[#2361d8]' : 'border-slate-300'}`}
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
                {creating && <Loader2 size={12} className="animate-spin" />}Crear key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function McpPanel() {
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const mcpEndpoint = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/mcp/isaak`;

  async function copyEndpoint() {
    try {
      await navigator.clipboard.writeText(mcpEndpoint);
      setCopiedEndpoint(true);
      setTimeout(() => setCopiedEndpoint(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-3">
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
                <code className="font-mono text-[12px] text-slate-700">/api/mcp/isaak</code>
              </div>
              <button
                type="button"
                onClick={() => void copyEndpoint()}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
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
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
            <Sparkles size={14} className="text-[#2361d8]" />
            Conectar con Claude
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Añade este servidor en Claude.ai → MCP Servers.
          </p>
          <a
            href="https://claude.verifactu.business/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#2361d8] transition hover:text-[#1d55c2]"
          >
            <Book size={12} />
            Instrucciones →<ExternalLink size={10} />
          </a>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
            <Globe size={14} className="text-slate-600" />
            Conectar con ChatGPT
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Plugin autorizado. Conéctate desde ChatGPT → Plugins.
          </p>
          <a
            href="https://holded.verifactu.business/docs/claude"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#2361d8] transition hover:text-[#1d55c2]"
          >
            <Book size={12} />
            Instrucciones →<ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function IntegrationsClient() {
  const [tab, setTab] = useState<Tab>('connectors');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');

  const [holdedStatus, setHoldedStatus] = useState<HoldedStatus | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [microsoftStatus, setMicrosoftStatus] = useState<MicrosoftStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [holdedRes, googleRes, msRes] = await Promise.allSettled([
        fetch('/api/settings/connections'),
        fetch('/api/isaak/google/status'),
        fetch('/api/isaak/microsoft/status'),
      ]);
      if (holdedRes.status === 'fulfilled' && holdedRes.value.ok) {
        const d = (await holdedRes.value.json().catch(() => null)) as {
          ok?: boolean;
          data?: { holded?: HoldedStatus };
        } | null;
        if (d?.ok && d.data?.holded) setHoldedStatus(d.data.holded);
      }
      if (googleRes.status === 'fulfilled' && googleRes.value.ok) {
        const d = (await googleRes.value.json().catch(() => null)) as GoogleStatus | null;
        if (d) setGoogleStatus(d);
      }
      if (msRes.status === 'fulfilled' && msRes.value.ok) {
        const d = (await msRes.value.json().catch(() => null)) as MicrosoftStatus | null;
        if (d) setMicrosoftStatus(d);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
    const params = new URLSearchParams(window.location.search);
    const g = params.get('google');
    if (g === 'connected') setNotice('Google conectado correctamente.');
    if (g === 'error') setError('No se pudo conectar Google. Inténtalo de nuevo.');
  }, [loadAll]);

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
      if (res.ok)
        setNotice(
          `Sincronizado: ${data?.created ?? 0} eventos creados, ${data?.skipped ?? 0} ya existían.`
        );
      else setError('Error al sincronizar. Comprueba la conexión con Google.');
    } finally {
      setSyncing(false);
    }
  }

  async function disconnectGoogle() {
    if (!confirm('¿Desconectar Google?')) return;
    try {
      await fetch('/api/isaak/google/disconnect', { method: 'DELETE' });
      setGoogleStatus((prev) => (prev ? { ...prev, connected: false, email: null } : null));
      setNotice('Google desconectado.');
    } catch {
      setError('No se pudo desconectar Google.');
    }
  }

  // ── Filtered integrations ──────────────────────────────────────────────────

  const q = search.toLowerCase();

  const visibleCategories = useMemo<Exclude<CategoryKey, 'all'>[]>(() => {
    const cats: Exclude<CategoryKey, 'all'>[] = [
      'sectorial',
      'google',
      'microsoft',
      'banca',
      'comunicacion',
      'pagos',
    ];
    return cats.filter((cat) => {
      if (activeCategory !== 'all' && activeCategory !== cat) return false;
      if (!q) return true;
      return INTEGRATIONS.some(
        (i) =>
          i.category === cat &&
          (i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q))
      );
    });
  }, [activeCategory, q]);

  function itemVisible(item: IntegrationMeta) {
    if (!q) return true;
    return item.name.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
  }

  // ── Render connector card per integration ID ───────────────────────────────

  function renderCard(item: IntegrationMeta) {
    if (!item.available)
      return <SoonCard key={item.id} name={item.name} desc={item.desc} logo={item.logo} />;
    switch (item.id) {
      case 'holded':
        return holdedStatus ? <HoldedCard key={item.id} status={holdedStatus} /> : null;
      case 'hotelgest':
        return (
          <SoonCard
            key={item.id}
            name={item.name}
            desc="Conecta tu cuenta HotelGest — disponible próximamente en este panel."
            logo={item.logo}
          />
        );
      case 'google-calendar':
        return googleStatus ? (
          <GoogleCalCard
            key={item.id}
            status={googleStatus}
            syncing={syncing}
            onSync={() => void syncGoogle()}
            onDisconnect={() => void disconnectGoogle()}
          />
        ) : null;
      case 'gmail':
        return googleStatus ? (
          <GmailCard
            key={item.id}
            googleConnected={googleStatus.connected}
            hasGmailScope={googleStatus.hasGmailScope ?? false}
            googleConfigured={googleStatus.googleConfigured}
          />
        ) : null;
      case 'gdrive':
        return googleStatus ? (
          <DriveCard
            key={item.id}
            googleConnected={googleStatus.connected}
            hasDriveScope={googleStatus.hasDriveScope ?? false}
            googleConfigured={googleStatus.googleConfigured}
          />
        ) : null;
      case 'microsoft':
        return microsoftStatus ? <MicrosoftCard key={item.id} status={microsoftStatus} /> : null;
      case 'banking':
        return <BankingCard key={item.id} />;
      case 'whatsapp':
        return <WhatsAppCard key={item.id} />;
      default:
        return null;
    }
  }

  const TABS: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
    { key: 'connectors', label: 'Conectores', icon: Plug },
    { key: 'developer', label: 'API & MCP', icon: Code2 },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2361d8]/10">
            <Plug size={16} className="text-[#2361d8]" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-[#011c67]">Integraciones</h1>
            <p className="text-[12px] text-slate-500">
              Conectores activos y herramientas de desarrollador
            </p>
          </div>
        </div>
        <div className="mt-3 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${tab === key ? 'bg-[#2361d8] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
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

        {/* ── TAB: Conectores ── */}
        {tab === 'connectors' && (
          <div className="space-y-4">
            {/* Search + category filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar integración…"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-[13px] text-slate-800 placeholder-slate-400 shadow-sm outline-none transition focus:border-[#2361d8]/40 focus:ring-2 focus:ring-[#2361d8]/10"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveCategory(key)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
                      activeCategory === key
                        ? 'border-[#2361d8] bg-[#2361d8] text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={11} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center gap-2 py-8 text-[13px] text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                Cargando conectores…
              </div>
            )}

            {/* Category sections */}
            {!loading && (
              <div className="space-y-6">
                {visibleCategories.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                    <p className="text-[13px] text-slate-400">
                      No hay integraciones que coincidan con &ldquo;{search}&rdquo;
                    </p>
                  </div>
                )}
                {visibleCategories.map((cat) => {
                  const items = INTEGRATIONS.filter((i) => i.category === cat && itemVisible(i));
                  if (items.length === 0) return null;
                  return (
                    <section key={cat}>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                          {CATEGORY_SECTION_LABELS[cat]}
                        </span>
                        <div className="h-px flex-1 bg-slate-100" />
                      </div>
                      <div className="space-y-3">{items.map((item) => renderCard(item))}</div>
                    </section>
                  );
                })}
              </div>
            )}

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-[12px] text-slate-500">
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
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2361d8]/10">
                  <Key size={16} className="text-[#2361d8]" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[#011c67]">API Keys</div>
                  <div className="text-[12px] text-slate-500">
                    Acceso programático con permisos granulares
                  </div>
                </div>
              </div>
              <ApiKeysPanel />
            </div>
            <div className="border-t border-slate-100" />
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2361d8]/10">
                  <Zap size={16} className="text-[#2361d8]" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[#011c67]">MCP Server</div>
                  <div className="text-[12px] text-slate-500">
                    Conecta IAs externas directamente a tus datos
                  </div>
                </div>
              </div>
              <McpPanel />
            </div>
            <div className="border-t border-slate-100" />
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2361d8]/10">
                  <Webhook size={16} className="text-[#2361d8]" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[#011c67]">Webhooks</div>
                  <div className="text-[12px] text-slate-500">
                    Notificaciones en tiempo real a tu sistema
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                <p className="text-[13px] font-medium text-slate-700">Webhooks</p>
                <p className="mt-1 text-[12px] text-slate-500">
                  Recibe notificaciones cuando ocurran eventos (facturas emitidas, validaciones
                  AEAT, plazos fiscales).
                </p>
                <span className="mt-3 inline-block rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
                  Disponible en plan Empresa
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="text-[12px] text-slate-600">
                  <span className="font-medium">Audit log</span> — registro de todas las llamadas
                  API y acciones ejecutadas.
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
