'use client';

import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Loader2,
  PlugZap,
  Unplug,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type ChiftStatus = {
  connected: boolean;
  status: string;
  connectionId: string | null;
  companyName: string | null;
  companyVat: string | null;
  currency: string | null;
  connectedAt: string | null;
  lastError: string | null;
  chiftConfigured: boolean;
};

const SUPPORTED_ERPS = [
  'Sage',
  'Cegid',
  'Xero',
  'QuickBooks',
  'Odoo',
  'NetSuite',
  'Exact',
  'Twinfield',
  'Yuki',
  '+40 más',
];

export default function ChiftPage() {
  const [status, setStatus] = useState<ChiftStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/isaak/chift/status');
      if (res.ok) setStatus((await res.json()) as ChiftStatus);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    // Show feedback from Chift redirect
    const params = new URLSearchParams(window.location.search);
    const chiftParam = params.get('chift');
    if (chiftParam === 'connected') {
      void loadStatus();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (chiftParam === 'error') {
      setError('Ha ocurrido un error durante la conexión. Inténtalo de nuevo.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadStatus]);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/isaak/chift/connect', { method: 'POST' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Error al conectar.');
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('¿Desconectar el ERP de Chift? Isaak no podrá acceder a tus datos contables.'))
      return;
    setDisconnecting(true);
    try {
      await fetch('/api/isaak/chift/disconnect', { method: 'DELETE' });
      await loadStatus();
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </main>
    );
  }

  const isConnected = status?.connected;
  const isPending = status?.status === 'pending';
  const isConfigured = status?.chiftConfigured ?? false;

  return (
    <main className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">ERP via Chift</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Conecta tu software de contabilidad (Sage, Xero, QuickBooks, Cegid…) con un solo clic.
        </p>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!isConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          La integración con Chift no está configurada en este entorno. Añade{' '}
          <code className="rounded bg-amber-100 px-1 font-mono text-xs">CHIFT_CLIENT_ID</code>,{' '}
          <code className="rounded bg-amber-100 px-1 font-mono text-xs">CHIFT_CLIENT_SECRET</code> y{' '}
          <code className="rounded bg-amber-100 px-1 font-mono text-xs">CHIFT_ACCOUNT_ID</code> en
          las variables de entorno.
        </div>
      )}

      {/* Connection card */}
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-soft">
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="font-semibold text-slate-800">
                  {status?.companyName ?? 'ERP conectado'}
                </p>
                <p className="text-xs text-slate-500">
                  {status?.companyVat ? `NIF/VAT: ${status.companyVat} · ` : ''}
                  {status?.currency ? `Moneda: ${status.currency} · ` : ''}
                  {status?.connectedAt
                    ? `Conectado el ${new Date(status.connectedAt).toLocaleDateString('es-ES')}`
                    : ''}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Isaak puede acceder a tus facturas, asientos contables y contactos del ERP en tiempo
              real.
            </p>
            <button
              onClick={() => void handleDisconnect()}
              disabled={disconnecting}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {disconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unplug className="h-4 w-4" />
              )}
              Desconectar
            </button>
          </div>
        ) : isPending ? (
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            Conexión pendiente — completa el proceso en la ventana de Chift.
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Conecta tu software de contabilidad en segundos. Chift redirige a tu ERP y vuelve aquí
              automáticamente.
            </p>
            <button
              onClick={() => void handleConnect()}
              disabled={connecting || !isConfigured}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlugZap className="h-4 w-4" />
              )}
              Conectar ERP
            </button>
          </div>
        )}
      </div>

      {/* Supported ERPs */}
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-soft">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <BookOpen className="h-4 w-4 text-slate-400" />
          ERPs compatibles
        </h2>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_ERPS.map((name) => (
            <span
              key={name}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
            >
              {name}
            </span>
          ))}
        </div>
        <a
          href="https://docs.chift.eu/unified-apis/accounting/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
        >
          Ver todos en docs.chift.eu <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* What Isaak can do */}
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-soft">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          ¿Qué puede hacer Isaak con tu ERP?
        </h2>
        <ul className="space-y-1.5 text-sm text-slate-600">
          {[
            'Consultar facturas de venta y compra con filtros por fecha',
            'Listar clientes y proveedores del libro contable',
            'Revisar asientos contables y movimientos del período',
            'Detectar facturas pendientes de pago o vencidas',
            'Analizar la situación contable y preparar resúmenes para Modelos AEAT',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
