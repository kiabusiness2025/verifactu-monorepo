'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, ShieldCheck } from 'lucide-react';

type ValidationResponse = {
  ok: boolean;
  error?: string | null;
  probe?: {
    invoiceApi: { ok: boolean; status: number | null };
    accountingApi: { ok: boolean; status: number | null };
    crmApi: { ok: boolean; status: number | null };
    projectsApi: { ok: boolean; status: number | null };
    teamApi: { ok: boolean; status: number | null };
  };
};

export default function OnboardingHoldedClient() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectedSummary, setConnectedSummary] = useState<{
    tenantName?: string | null;
    taxId?: string | null;
    supportedModules?: string[];
  } | null>(null);

  const canValidate = apiKey.trim().length >= 12;
  const canConnect = validation?.ok === true && !isConnecting;

  const statusLine = useMemo(() => {
    if (!validation?.probe) return null;
    const checks = [
      validation.probe.invoiceApi.ok ? 'Facturas' : null,
      validation.probe.accountingApi.ok ? 'Contabilidad' : null,
      validation.probe.crmApi.ok ? 'CRM' : null,
      validation.probe.projectsApi.ok ? 'Proyectos' : null,
      validation.probe.teamApi.ok ? 'Equipo' : null,
    ].filter(Boolean);

    if (checks.length === 0) {
      return 'No hemos podido validar ningún módulo principal de Holded.';
    }

    return `Validación correcta en: ${checks.join(', ')}.`;
  }, [validation]);

  const runValidation = async (value = apiKey) => {
    if (value.trim().length < 12) return;

    setIsValidating(true);
    setError(null);

    try {
      const res = await fetch('/api/holded/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: value.trim() }),
      });
      const data = (await res.json().catch(() => null)) as ValidationResponse | null;
      if (!res.ok) {
        throw new Error(data?.error || 'No hemos podido validar la API key.');
      }
      setValidation(data);
      if (!data?.ok) {
        setError(data?.error || 'No hemos podido validar la API key.');
      }
    } catch (validationError) {
      setValidation(null);
      setError(
        validationError instanceof Error
          ? validationError.message
          : 'No hemos podido validar la API key.'
      );
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    if (!canValidate) {
      setValidation(null);
      return;
    }

    const handle = window.setTimeout(() => {
      void runValidation(apiKey);
    }, 900);

    return () => window.clearTimeout(handle);
  }, [apiKey, canValidate]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const res = await fetch('/api/holded/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'No hemos podido conectar Holded.');
      }

      setConnectedSummary({
        tenantName: data?.connection?.tenantName || null,
        taxId: data?.connection?.taxId || null,
        supportedModules: Array.isArray(data?.connection?.supportedModules)
          ? data.connection.supportedModules
          : [],
      });

      router.push('/onboarding/success');
    } catch (connectError) {
      setError(
        connectError instanceof Error ? connectError.message : 'No hemos podido conectar Holded.'
      );
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_42%,#f8fafc_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
              Paso 2
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
              Pega tu API key de Holded
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              Solo necesitas una API key activa. La validamos al momento y, si funciona, te llevamos
              directamente al dashboard.
            </p>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <KeyRound className="h-4 w-4 text-[#ff5460]" />
                Cómo encontrarla
              </div>
              <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <li>1. Entra en Holded.</li>
                <li>2. Abre Configuración y busca el área de API.</li>
                <li>3. Copia una API key activa de tu empresa.</li>
                <li>4. Pégala aquí. Nosotros la comprobamos al instante.</li>
              </ol>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#ff5460]/15 bg-white p-6 shadow-[0_32px_90px_-48px_rgba(255,84,96,0.35)]">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">
                API key de Holded
              </span>
              <textarea
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Pega aquí tu API key"
                rows={5}
                className="w-full resize-none rounded-3xl border border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void runValidation()}
                disabled={!canValidate || isValidating || isConnecting}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Validar ahora
              </button>
              <button
                type="button"
                onClick={handleConnect}
                disabled={!canConnect}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Conectar y continuar
              </button>
            </div>

            {validation?.ok ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-semibold">API key válida</div>
                    <div className="mt-1">{statusLine}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {connectedSummary ? (
              <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                <div className="font-semibold">Conexion lista para guardar</div>
                <div className="mt-1">
                  {connectedSummary.tenantName
                    ? `Empresa detectada: ${connectedSummary.tenantName}. `
                    : ''}
                  {connectedSummary.taxId
                    ? `NIF o codigo detectado: ${connectedSummary.taxId}. `
                    : ''}
                  {connectedSummary.supportedModules?.length
                    ? `Modulos validados: ${connectedSummary.supportedModules.join(', ')}.`
                    : ''}
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-semibold">No hemos podido validarla</div>
                    <div className="mt-1">{error}</div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Lo que ocurre después
              </div>
              <p className="mt-2">
                Si la clave funciona, guardamos la conexión y te llevamos al dashboard. No necesitas
                pasar por más pantallas técnicas.
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
              Al conectar tu cuenta, autorizas a la plataforma a utilizar la API key facilitada para
              acceder a los datos de tu cuenta de Holded y ofrecerte la funcionalidad solicitada, de
              acuerdo con nuestros{' '}
              <Link href="/terms" className="font-semibold text-[#ff5460] hover:text-[#ef4654]">
                Terminos
              </Link>{' '}
              y{' '}
              <Link href="/privacy" className="font-semibold text-[#ff5460] hover:text-[#ef4654]">
                Politica de Privacidad
              </Link>
              . La clave se guarda protegida y no se muestra de nuevo en pantalla.
            </div>

            <div className="mt-5">
              <div className="flex flex-wrap gap-4 text-sm">
                <Link href="/support" className="font-semibold text-[#ff5460] hover:text-[#ef4654]">
                  No encuentro mi API key
                </Link>
                <Link href="/legal" className="font-semibold text-slate-700 hover:text-slate-900">
                  Aviso legal
                </Link>
                <Link href="/cookies" className="font-semibold text-slate-700 hover:text-slate-900">
                  Cookies
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
