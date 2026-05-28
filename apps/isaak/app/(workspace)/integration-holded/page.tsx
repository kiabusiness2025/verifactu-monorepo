// V1 LAUNCH (2026-05-28) — página de conexión Holded directa por API key.
//
// Reemplaza el flow OAuth complejo (que pasa por holded.verifactu.business)
// con un formulario simple: el usuario pega su API key de Holded y la guarda.
// El backend cifra con AES-256-GCM y valida contra Holded antes de
// persistir.
//
// Esta página es accesible desde:
//   - Onboarding inicial (después del signup)
//   - Sidebar V1 popover → "Integración Holded"
//   - Email de bienvenida → CTA principal
//
// Ver docs/product/ISAAK_LAUNCH_V1_2026-05-28.md.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  Key,
  Loader2,
  Lock,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

type HoldedStatus = {
  status: 'connected' | 'disconnected' | 'invalid';
  tenantName: string | null;
  keyMasked: string | null;
  connectedAt: string | null;
  lastValidatedAt: string | null;
  supportedModules: string[];
};

export default function IntegrationHoldedPage() {
  const [status, setStatus] = useState<HoldedStatus | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/holded/status', { credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json()) as HoldedStatus;
        if (!cancelled) setStatus(data);
      } catch {
        // fail-silent — empty form is fine
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/holded/connect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setError(data.error || 'No hemos podido conectar con Holded.');
        return;
      }
      setSuccessMsg('Holded conectado correctamente.');
      setApiKey('');
      setStatus({
        status: 'connected',
        tenantName: data.connection?.tenantName ?? null,
        keyMasked: data.connection?.keyMasked ?? null,
        connectedAt: new Date().toISOString(),
        lastValidatedAt: new Date().toISOString(),
        supportedModules: data.connection?.supportedModules ?? [],
      });
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisconnect() {
    if (disconnecting) return;
    const confirmed = window.confirm(
      '¿Desconectar Holded? Isaak dejará de tener acceso a tus datos. Puedes volver a conectarlo cuando quieras.'
    );
    if (!confirmed) return;

    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/holded/connect', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        setError('No hemos podido desconectar. Inténtalo de nuevo.');
        return;
      }
      setStatus({
        status: 'disconnected',
        tenantName: null,
        keyMasked: null,
        connectedAt: null,
        lastValidatedAt: null,
        supportedModules: [],
      });
      setSuccessMsg('Holded desconectado.');
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setDisconnecting(false);
    }
  }

  const isConnected = status?.status === 'connected';

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <h1 className="text-[16px] font-semibold text-[#011c67]">Integración con Holded</h1>
        <p className="text-[12px] text-slate-500">
          Conecta tu Holded a Isaak en 30 segundos pegando tu API key.
        </p>
      </div>

      <div className="px-5 py-5">
        {/* Estado actual */}
        {isConnected && status && (
          <ConnectedCard
            status={status}
            onDisconnect={handleDisconnect}
            disconnecting={disconnecting}
          />
        )}

        {/* Formulario de conexión */}
        {!isConnected && (
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label
                htmlFor="apiKey"
                className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-slate-500"
              >
                <Key className="h-3.5 w-3.5" />
                Tu API key de Holded
              </label>
              <div className="mt-3 flex items-stretch gap-2">
                <div className="flex flex-1 items-center rounded-xl border border-slate-300 bg-white focus-within:border-[#2361d8] focus-within:ring-2 focus-within:ring-[#2361d8]/15">
                  <input
                    id="apiKey"
                    type={showKey ? 'text' : 'password'}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Ej. 1a2b3c4d5e6f…"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="px-2.5 text-slate-400 hover:text-slate-700"
                    aria-label={showKey ? 'Ocultar' : 'Mostrar'}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <p className="mt-3 text-[12px] leading-5 text-slate-500">
                La key se cifra con AES-256-GCM antes de guardarse. Solo viaja a Holded para
                hacer las consultas que pidas en el chat. Puedes revocarla cuando quieras.
              </p>
            </div>

            {error && (
              <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {successMsg && (
              <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={!apiKey.trim() || submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2361d8] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f55c0] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validando con Holded…
                </>
              ) : (
                <>
                  Conectar Holded
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Cómo obtener la API key */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-slate-500">
            <HelpCircle className="h-3.5 w-3.5" />
            Cómo conseguir tu API key de Holded
          </h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#2361d8] text-xs font-bold text-white">
                1
              </span>
              <div>
                Entra en{' '}
                <a
                  href="https://app.holded.com/settings/developers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-[#2361d8] hover:underline"
                >
                  Holded → Configuración → Desarrolladores
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#2361d8] text-xs font-bold text-white">
                2
              </span>
              <span>
                Pulsa <strong>&ldquo;Crear nueva API key&rdquo;</strong>. Holded te pedirá un
                nombre — escribe &ldquo;Isaak&rdquo; para identificarla luego.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#2361d8] text-xs font-bold text-white">
                3
              </span>
              <span>
                Copia la API key generada. <strong>Holded solo la muestra una vez</strong> —
                pégala arriba ahora mismo, no la cierres.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#2361d8] text-xs font-bold text-white">
                4
              </span>
              <span>
                Pulsa &ldquo;Conectar Holded&rdquo;. Validamos la key contra Holded antes de
                guardarla — si algo va mal, te lo decimos sin tocar tu base de datos.
              </span>
            </li>
          </ol>
        </section>

        {/* Seguridad */}
        <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Cómo cuidamos tu key
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-900">
            <li className="flex items-start gap-2">
              <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>Cifrado AES-256-GCM en reposo. Solo nosotros podemos descifrarla.</span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>
                No se imprime en logs, no se muestra en respuestas, no se incluye en backups
                exportables.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>
                Puedes revocarla desde Holded en cualquier momento —{' '}
                <a
                  href="https://app.holded.com/settings/developers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  borrarla en Holded
                </a>{' '}
                la desactiva instantáneamente aquí.
              </span>
            </li>
          </ul>
        </section>

        {/* Ayuda extra */}
        <p className="mt-6 text-[12px] text-slate-500">
          ¿Problemas para conectar?{' '}
          <Link href="/ayuda" className="font-medium text-[#2361d8] hover:underline">
            Mira la guía completa
          </Link>{' '}
          o escríbenos a{' '}
          <a
            href="mailto:soporte@verifactu.business"
            className="font-medium text-[#2361d8] hover:underline"
          >
            soporte@verifactu.business
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function ConnectedCard({
  status,
  onDisconnect,
  disconnecting,
}: {
  status: HoldedStatus;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-emerald-900">
            Conectado a {status.tenantName ?? 'Holded'}
          </h3>
          <p className="mt-1 text-xs text-emerald-800">
            {status.keyMasked && <>API key: {status.keyMasked} · </>}
            Última validación:{' '}
            {status.lastValidatedAt
              ? new Date(status.lastValidatedAt).toLocaleString('es-ES')
              : '—'}
          </p>

          {status.supportedModules.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {status.supportedModules.map((m) => (
                <span
                  key={m}
                  className="inline-block rounded-full bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200"
                >
                  {m}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Ir al chat
              <ArrowRight className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={onDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
            >
              {disconnecting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              Desconectar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
