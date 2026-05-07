'use client';

/**
 * /auth/holded-direct — F2.1 de la arquitectura unificada de conectores Holded.
 *
 * Form self-contained sin Firebase: email + API key + T&C → POST a
 * /api/auth/holded-direct (que delega en el endpoint común F1.1 y mintea la
 * cookie de sesión .verifactu.business).
 *
 * Shell visual reutilizado del /auth/holded Firebase: radial gradient,
 * HoldedBadge, brand red (#ff5460), FooterLinks, hints contextuales si el
 * `source` indica un flujo ChatGPT.
 *
 * Diseñado para sobrevivir al iOS in-app browser:
 *  - Sin IndexedDB / sin localStorage / sin Firebase.
 *  - El submit es un fetch a un endpoint same-origin que setea cookie
 *    .verifactu.business; la redirección final la hace el cliente con
 *    `window.location.replace`.
 */

import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState, type FormEvent } from 'react';

const HOLDED_SITE_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'soporte@verifactu.business';

const HOLDED_API_KEY_HELP_URL = 'https://support.holded.com/hc/es/articles/360009694799';

const ERROR_MESSAGES: Record<string, string> = {
  MISSING_FIELDS: 'Por favor, completa el email y la API key.',
  TERMS_NOT_ACCEPTED: 'Debes aceptar los términos y la política de privacidad para continuar.',
  INVALID_EMAIL: 'El email no tiene un formato válido.',
  INVALID_API_KEY:
    'La API key no es válida o no tiene los permisos necesarios. Comprueba que sea correcta en Holded.',
  PROBE_ERROR: 'No se pudo conectar con Holded. Inténtalo de nuevo en unos segundos.',
  DB_ERROR: 'Error interno. Por favor, contacta con soporte.',
  SESSION_ERROR: 'Error al iniciar sesión. Por favor, inténtalo de nuevo.',
  NETWORK_ERROR: 'Error de conexión. Comprueba tu internet e inténtalo de nuevo.',
};

function detectChatgptFlow(source: string, next: string) {
  const lowerSource = source.toLowerCase();
  if (
    lowerSource.includes('chatgpt') ||
    lowerSource.includes('holded_chat') ||
    lowerSource.includes('openai')
  ) {
    return true;
  }
  try {
    const parsed = new URL(next);
    if (
      parsed.hostname.includes('chatgpt.com') ||
      parsed.hostname.includes('chat.openai.com') ||
      parsed.searchParams.get('client_id')?.toLowerCase().startsWith('openai-')
    ) {
      return true;
    }
  } catch {
    if (next.toLowerCase().includes('chatgpt') || next.toLowerCase().includes('openai-chatgpt-')) {
      return true;
    }
  }
  return false;
}

function HoldedDirectLoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || `${HOLDED_SITE_URL}/dashboard`;
  const source = searchParams.get('source') || 'holded_direct';
  const isChatgptFlow = useMemo(() => detectChatgptFlow(source, next), [source, next]);

  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 30);
    return () => window.clearTimeout(t);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !apiKey.trim()) {
      setError(ERROR_MESSAGES.MISSING_FIELDS);
      return;
    }
    if (!acceptedTerms || !acceptedPrivacy) {
      setError(ERROR_MESSAGES.TERMS_NOT_ACCEPTED);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/holded-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          apiKey: apiKey.trim(),
          acceptedTerms,
          acceptedPrivacy,
          next,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; redirectUrl?: string; error?: string };

      if (!res.ok || !data.ok) {
        const code = data.error ?? 'DB_ERROR';
        setError(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.DB_ERROR);
        setLoading(false);
        return;
      }

      window.location.replace(data.redirectUrl ?? next);
    } catch {
      setError(ERROR_MESSAGES.NETWORK_ERROR);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff5f2_0%,#f8fafc_44%,#f8fafc_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-7xl items-center justify-center py-6">
        <section className="flex w-full flex-col items-center justify-center px-4 py-6 sm:px-8 sm:py-8">
          {isChatgptFlow ? (
            <div
              className={`mb-5 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-500 transition-all duration-700 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Gratis para siempre
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Sin tarjeta de crédito
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Conexión en menos de un minuto
              </span>
            </div>
          ) : null}

          <div
            className={`w-full max-w-[26rem] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_90px_-56px_rgba(15,23,42,0.35)] transition-all duration-700 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <div className="px-6 pb-7 pt-7 sm:px-8">
              {/* Header con badge Holded */}
              <div className="text-center">
                <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff1f2] ring-1 ring-[#ff5460]/10">
                    <Image
                      src="/brand/holded/holded-diamond-logo.png"
                      alt="Holded"
                      width={20}
                      height={20}
                      className="h-5 w-5 object-contain"
                      priority
                    />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-950">holded</div>
                    <div className="text-xs text-slate-500">
                      {isChatgptFlow ? 'Conexión Holded para ChatGPT' : 'Conexión directa a Holded'}
                    </div>
                  </div>
                </div>
                <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
                  {isChatgptFlow ? 'Conecta Holded en un paso' : 'Conecta tu cuenta de Holded'}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Introduce tu email y la API key de Holded. Encriptamos la clave con AES-256 y la
                  vinculamos solo a tu empresa.
                </p>
              </div>

              {/* Error */}
              {error ? (
                <div
                  role="alert"
                  className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"
                >
                  {error}
                </div>
              ) : null}

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                    Tu email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@empresa.com"
                    className="block h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700">
                      API key de Holded
                    </label>
                    <a
                      href={HOLDED_API_KEY_HELP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-[#ff5460] underline-offset-2 hover:underline"
                    >
                      ¿Dónde la encuentro?
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="32 caracteres alfanuméricos"
                      className="block h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition hover:text-slate-700"
                      aria-label={showApiKey ? 'Ocultar API key' : 'Mostrar API key'}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* T&C */}
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#ff5460] focus:ring-[#ff5460]"
                    />
                    <span className="text-xs leading-5 text-slate-600">
                      Acepto los{' '}
                      <a
                        href={`${HOLDED_SITE_URL}/conectores/holded/terms`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-slate-800 underline"
                      >
                        términos de uso
                      </a>{' '}
                      del conector.
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedPrivacy}
                      onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#ff5460] focus:ring-[#ff5460]"
                    />
                    <span className="text-xs leading-5 text-slate-600">
                      Acepto la{' '}
                      <a
                        href={`${HOLDED_SITE_URL}/conectores/holded/privacy`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-slate-800 underline"
                      >
                        política de privacidad
                      </a>
                      .
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ff5460] px-4 text-sm font-semibold text-white transition hover:bg-[#ff3a48] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading
                    ? 'Conectando…'
                    : isChatgptFlow
                      ? 'Conectar Holded a ChatGPT'
                      : 'Conectar Holded'}
                </button>
              </form>

              {/* Trust hints */}
              <ul className="mt-5 space-y-2 text-xs text-slate-500">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-[#ff5460]" />
                  Sin contraseñas: tu API key viaja cifrada y se guarda solo en tu tenant.
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 text-[#ff5460]" />
                  Puedes revocar la conexión cuando quieras desde tu dashboard.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-[#ff5460]" />
                  Cumple RGPD y la DPA del conector. Sin venta de datos.
                </li>
              </ul>

              {/* Volver */}
              <div className="mt-6 text-center">
                <a
                  href={HOLDED_SITE_URL}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 underline-offset-4 hover:text-slate-600 hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Volver
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 text-center text-sm text-slate-600 sm:px-8">
              <div className="text-xs leading-5 text-slate-500">
                Si necesitas ayuda, escríbenos a{' '}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="font-semibold text-slate-700 underline"
                >
                  {SUPPORT_EMAIL}
                </a>
                .
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function HoldedDirectLoginPage() {
  return (
    <Suspense>
      <HoldedDirectLoginForm />
    </Suspense>
  );
}
