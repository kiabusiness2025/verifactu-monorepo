'use client';

/**
 * HoldedDirectForm — F2.1 (rediseño auth 2026-05-08)
 *
 * Paso 1 — Acceso (authPhase = 'choosing' | 'magic_sent' | 'consuming'):
 *   - Continuar con Google: Firebase redirect (startGoogleRedirectSignIn)
 *   - Continuar con correo: Firebase magic link (sendMagicLinkEmail)
 *   Al volver a la pagina, consumeGoogleRedirectResult / consumeMagicLink
 *   mintan la session cookie (.verifactu.business) con uid+email+tenantId.
 *
 * Paso 2 — API key (authPhase = 'authed'):
 *   Mismo form que antes. El backend /api/auth/holded-direct lee el email
 *   de la session cookie; ya no depende de holded_email_verified.
 *
 * Si el server component detecta una sesion valida, `sessionEmail` llega
 * como prop y el form arranca directamente en el paso de API key.
 */

import {
  consumeGoogleRedirectResult,
  consumeMagicLink,
  detectMagicLinkInUrl,
  getStoredMagicLinkEmail,
  sendMagicLinkEmail,
  startGoogleRedirectSignIn,
} from '@/app/lib/auth';
import { auth as firebaseAuth } from '@/app/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

const HOLDED_SITE_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'soporte@verifactu.business';

const HOLDED_API_KEY_HELP_URL = 'https://support.holded.com/hc/es/articles/360009694799';

const HOLDED_API_KEY_REGEX = /^[a-f0-9]{32}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Saludo contextual segun la hora local del usuario. Devuelve siempre el
 * tono "Buenos {tiempo}" para alinear con el patrón Claude (captura de
 * referencia: brand/Screenshot Claude.png).
 */
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Buenas noches';
  if (hour < 12) return 'Buenos días';
  if (hour < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * Extrae el primer nombre de un displayName de Firebase ("Ksenia Ilicheva" →
 * "Ksenia"). Si el displayName esta vacio o solo tiene un email, devuelve
 * null para que el saludo caiga al genérico sin nombre — preferimos no
 * mostrar nombre antes que mostrar el prefijo del email (que casi nunca
 * coincide con el nombre real).
 */
function firstNameFrom(displayName: string | null | undefined): string | null {
  if (!displayName) return null;
  const trimmed = displayName.trim();
  if (!trimmed || trimmed.includes('@')) return null;
  const first = trimmed.split(/\s+/)[0];
  if (!first || first.length < 2) return null;
  // Capitaliza solo si el usuario lo dejo en minúsculas todo
  return first.charAt(0).toUpperCase() + first.slice(1);
}

const ERROR_MESSAGES: Record<string, string> = {
  MISSING_FIELDS: 'Por favor, completa todos los campos.',
  TERMS_NOT_ACCEPTED: 'Debes aceptar los términos y la política de privacidad para continuar.',
  INVALID_EMAIL: 'El email no tiene un formato válido.',
  INVALID_API_KEY:
    'La API key no es válida o no tiene los permisos necesarios. Comprueba que sea correcta en Holded.',
  INVALID_API_KEY_FORMAT:
    'La API key debe tener 32 caracteres hexadecimales (0-9, a-f). Verifica que la has copiado completa desde Holded → Configuración → Integraciones → API.',
  PROBE_ERROR: 'No se pudo conectar con Holded. Inténtalo de nuevo en unos segundos.',
  DB_ERROR: 'Error interno. Por favor, contacta con soporte.',
  SESSION_ERROR: 'Error al iniciar sesión. Por favor, inténtalo de nuevo.',
  NETWORK_ERROR: 'Error de conexión. Comprueba tu internet e inténtalo de nuevo.',
  NOT_AUTHENTICATED: 'Tu sesión ha expirado. Por favor, vuelve a autenticarte.',
};

type AuthPhase = 'choosing' | 'magic_sent' | 'consuming' | 'authed';

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

// Inline Google G logo SVG
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function HoldedDirectForm({ sessionEmail }: { sessionEmail: string | null }) {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || `${HOLDED_SITE_URL}/dashboard`;
  const source = searchParams.get('source') || 'holded_direct';
  const isChatgptFlow = useMemo(() => detectChatgptFlow(source, next), [source, next]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 30);
    return () => window.clearTimeout(t);
  }, []);

  // Saludo calculado solo en cliente para evitar hydration mismatch (el
  // servidor no conoce la hora local del usuario).
  const [timeGreeting, setTimeGreeting] = useState('');
  useEffect(() => {
    setTimeGreeting(getTimeGreeting());
  }, []);

  // Auth phase state
  const [authPhase, setAuthPhase] = useState<AuthPhase>(sessionEmail ? 'authed' : 'choosing');
  const [authedEmail, setAuthedEmail] = useState<string | null>(sessionEmail);
  // displayName de Firebase (solo Google lo trae). Magic link no aporta nombre,
  // en ese caso queda null y el saludo cae al genérico sin nombre.
  const [authedName, setAuthedName] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const firstName = useMemo(() => firstNameFrom(authedName), [authedName]);

  // Magic link state
  const [magicEmail, setMagicEmail] = useState('');
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSentTo, setMagicSentTo] = useState<string | null>(null);

  // API key step state
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [step2Loading, setStep2Loading] = useState(false);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [apiKeyReadOnly, setApiKeyReadOnly] = useState(true);
  const [apiKeyTouched, setApiKeyTouched] = useState(false);

  const apiKeyTrimmed = apiKey.trim();
  const apiKeyFormatValid = apiKeyTrimmed === '' || HOLDED_API_KEY_REGEX.test(apiKeyTrimmed);
  const showApiKeyFormatError = apiKeyTouched && apiKeyTrimmed !== '' && !apiKeyFormatValid;

  // On mount: detect Firebase magic link or Google redirect result, y rescatar
  // el displayName de Firebase para personalizar el saludo del paso 2.
  useEffect(() => {
    if (sessionEmail) {
      // Sesion ya válida desde el server. Firebase restaura el usuario desde
      // IndexedDB de forma asincrona — si leemos `currentUser` en mount, casi
      // siempre es null. Nos suscribimos a onAuthStateChanged para capturar
      // el displayName en cuanto Firebase lo restaure.
      if (!firebaseAuth) return;
      // Si ya esta cargado, capturarlo de inmediato (puede pasar en navegacion
      // dentro del SPA).
      if (firebaseAuth.currentUser?.displayName) {
        setAuthedName(firebaseAuth.currentUser.displayName);
      }
      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        if (user?.displayName) {
          setAuthedName(user.displayName);
        }
      });
      return () => unsubscribe();
    }

    if (detectMagicLinkInUrl()) {
      setAuthPhase('consuming');
      const storedEmail = getStoredMagicLinkEmail();
      if (!storedEmail) {
        setAuthPhase('choosing');
        setAuthError('No pudimos encontrar tu email. Inténtalo de nuevo.');
        return;
      }
      consumeMagicLink(storedEmail, { source: 'holded_magic_link' }).then((result) => {
        if (result.user) {
          setAuthedEmail(result.user.email ?? storedEmail);
          setAuthedName(result.user.displayName ?? null);
          setAuthPhase('authed');
        } else {
          setAuthPhase('choosing');
          setAuthError(result.error.userMessage);
        }
      });
      return;
    }

    // Check for Google redirect result (safe to call even when there's none)
    consumeGoogleRedirectResult({ source: 'holded_google_oauth' }).then((result) => {
      if (result.user) {
        setAuthedEmail(result.user.email ?? null);
        setAuthedName(result.user.displayName ?? null);
        setAuthPhase('authed');
      } else if (result.error?.code && result.error.code !== 'auth/no-redirect-result') {
        // Only show error if there was an actual attempt (not just a clean page load)
        setAuthError(result.error.userMessage);
      }
    });
  }, [sessionEmail]);

  async function handleGoogleSignIn() {
    setAuthError(null);
    setGoogleLoading(true);
    const result = await startGoogleRedirectSignIn();
    if (!result.redirecting) {
      setAuthError(result.error.userMessage);
      setGoogleLoading(false);
    }
    // If redirecting=true the browser navigates away — no state update needed
  }

  async function handleMagicLinkSubmit(e: FormEvent) {
    e.preventDefault();
    setAuthError(null);

    const trimmedEmail = magicEmail.trim().toLowerCase();
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setAuthError('Por favor, introduce un email válido.');
      return;
    }

    setMagicLoading(true);
    // Return URL = current page (with all query params) so Firebase brings the user back here
    const returnUrl = window.location.href;
    const result = await sendMagicLinkEmail(trimmedEmail, returnUrl);
    if (result.ok) {
      setMagicSentTo(trimmedEmail);
      setAuthPhase('magic_sent');
    } else {
      setAuthError(result.error.userMessage);
    }
    setMagicLoading(false);
  }

  async function handleStep2Submit(e: FormEvent) {
    e.preventDefault();
    setStep2Error(null);
    setApiKeyTouched(true);

    if (!apiKeyTrimmed) {
      setStep2Error(ERROR_MESSAGES.MISSING_FIELDS);
      return;
    }
    if (!HOLDED_API_KEY_REGEX.test(apiKeyTrimmed)) {
      setStep2Error(ERROR_MESSAGES.INVALID_API_KEY_FORMAT);
      return;
    }
    if (!acceptedTerms || !acceptedPrivacy) {
      setStep2Error(ERROR_MESSAGES.TERMS_NOT_ACCEPTED);
      return;
    }

    setStep2Loading(true);
    try {
      const res = await fetch('/api/auth/holded-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKeyTrimmed,
          acceptedTerms,
          acceptedPrivacy,
          next,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; redirectUrl?: string; error?: string };

      if (!res.ok || !data.ok) {
        const code = data.error ?? 'DB_ERROR';
        if (code === 'NOT_AUTHENTICATED') {
          setAuthedEmail(null);
          setAuthPhase('choosing');
          setStep2Error(null);
          setAuthError(ERROR_MESSAGES.NOT_AUTHENTICATED);
          setStep2Loading(false);
          return;
        }
        setStep2Error(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.DB_ERROR);
        setStep2Loading(false);
        return;
      }

      window.location.replace(data.redirectUrl ?? next);
    } catch {
      setStep2Error(ERROR_MESSAGES.NETWORK_ERROR);
      setStep2Loading(false);
    }
  }

  const isApiKeyStep = authPhase === 'authed';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff5f2_0%,#f8fafc_44%,#f8fafc_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-7xl items-center justify-center py-6">
        <section className="flex w-full flex-col items-center justify-center px-4 py-6 sm:px-8 sm:py-8">
          {isChatgptFlow && !isApiKeyStep ? (
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
              {/* Header */}
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

                {/* Saludo unificado tipo Claude para TODOS los phases.
                    Sin step indicator — la UI debe sentirse calmada y
                    consistente entre paso de auth y paso de API key. */}
                {authPhase === 'consuming' ? (
                  <>
                    <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">
                      Verificando acceso…
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Estamos completando tu inicio de sesión, un momento.
                    </p>
                  </>
                ) : authPhase === 'magic_sent' ? (
                  <>
                    <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">
                      <span aria-hidden="true" className="mr-2 inline-block">
                        ✉
                      </span>
                      Revisa tu email
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Te hemos enviado un enlace a{' '}
                      <strong className="font-semibold text-slate-700">{magicSentTo}</strong>. Haz
                      click para continuar.
                    </p>
                  </>
                ) : !isApiKeyStep ? (
                  // Step 1 (auth choosing): saludo amistoso sin nombre
                  // (todavia no hay sesion). Mismo tono que step 2 — el
                  // usuario percibe el flujo como una sola pantalla con
                  // dos pasos, no como dos formularios distintos.
                  <>
                    <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">
                      <span aria-hidden="true" className="mr-2 inline-block">
                        ✦
                      </span>
                      {timeGreeting}
                      <span aria-hidden="true" className="ml-2 inline-block">
                        👋
                      </span>
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {isChatgptFlow
                        ? 'Identifícate para conectar Holded con ChatGPT.'
                        : 'Identifícate para conectar tu cuenta de Holded.'}
                    </p>
                  </>
                ) : (
                  // Step 2: saludo personalizado tipo Claude. El nombre solo
                  // aparece si Firebase devolvio displayName (Google si, magic
                  // link no). Fallback genérico sin nombre — nunca usamos el
                  // prefijo del email porque casi nunca coincide con el
                  // nombre real del usuario.
                  <>
                    <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">
                      <span aria-hidden="true" className="mr-2 inline-block">
                        ✦
                      </span>
                      {timeGreeting}
                      {firstName ? `, ${firstName}` : ''}
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Pega tu API key de Holded para terminar la conexión.
                    </p>
                  </>
                )}
              </div>

              {/* === Auth error banner === */}
              {authError ? (
                <div
                  role="alert"
                  className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"
                >
                  {authError}
                </div>
              ) : null}

              {/* === PASO 1: consuming (spinner) === */}
              {authPhase === 'consuming' ? (
                <div className="mt-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#ff5460]" />
                </div>
              ) : null}

              {/* === PASO 1: magic link enviado === */}
              {authPhase === 'magic_sent' ? (
                <>
                  <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white ring-1 ring-emerald-200">
                      <Mail className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-emerald-900">Email enviado</p>
                      <p className="text-xs leading-5 text-emerald-800">
                        Abre el correo en <strong className="font-semibold">{magicSentTo}</strong> y
                        haz click en el enlace para continuar. Si no lo encuentras, revisa spam.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 text-center text-xs text-slate-500">
                    ¿No llegó?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthPhase('choosing');
                        setMagicSentTo(null);
                        setAuthError(null);
                      }}
                      className="font-semibold text-[#ff5460] underline-offset-2 hover:underline"
                    >
                      Reenviar
                    </button>{' '}
                    o{' '}
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="font-semibold text-slate-700 underline-offset-2 hover:underline"
                    >
                      contactar soporte
                    </a>
                    .
                  </div>
                </>
              ) : null}

              {/* === PASO 1: elegir método de acceso === */}
              {authPhase === 'choosing' ? (
                <div className="mt-6 space-y-4">
                  {/* Google */}
                  <button
                    type="button"
                    disabled={googleLoading}
                    onClick={handleGoogleSignIn}
                    className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    ) : (
                      <GoogleIcon className="h-5 w-5 shrink-0" />
                    )}
                    {googleLoading ? 'Redirigiendo…' : 'Continuar con Google'}
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs font-medium text-slate-400">o</span>
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>

                  {/* Magic link */}
                  <form onSubmit={handleMagicLinkSubmit} className="space-y-3">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="magic-email"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Tu email
                      </label>
                      <input
                        id="magic-email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        required
                        value={magicEmail}
                        onChange={(e) => setMagicEmail(e.target.value)}
                        placeholder="tu@empresa.com"
                        className="block h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/30"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={magicLoading}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ff5460] px-4 text-sm font-semibold text-white transition hover:bg-[#ff3a48] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {magicLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      {magicLoading ? 'Enviando enlace…' : 'Continuar con correo'}
                    </button>
                  </form>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                      <p className="text-xs leading-5 text-slate-600">
                        Con correo te enviamos un enlace de un solo uso. Con Google usamos OAuth
                        seguro. En ambos casos, verificamos tu identidad antes de pedirte la API
                        key.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* === PASO 2: API key (rediseño calmado tipo Claude) === */}
              {isApiKeyStep ? (
                <>
                  {/* Email verificado — chip compacto, no ocupa espacio */}
                  <div className="mt-5 flex justify-center">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-[11px] font-medium text-emerald-800">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span className="truncate max-w-[14rem]">{authedEmail}</span>
                    </div>
                  </div>

                  {step2Error ? (
                    <div
                      role="alert"
                      className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"
                    >
                      {step2Error}
                    </div>
                  ) : null}

                  <form onSubmit={handleStep2Submit} className="mt-6 space-y-4">
                    {/* API key — input prominente estilo "prompt box" */}
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between px-1">
                        <label
                          htmlFor="holded-secret-token-input"
                          className="text-xs font-medium uppercase tracking-wider text-slate-500"
                        >
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
                      <div
                        className={`relative rounded-2xl border bg-white shadow-sm transition focus-within:shadow-md ${
                          showApiKeyFormatError
                            ? 'border-rose-300 focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-300/40'
                            : 'border-slate-200 focus-within:border-[#ff5460] focus-within:ring-2 focus-within:ring-[#ff5460]/30'
                        }`}
                      >
                        <input
                          id="holded-secret-token-input"
                          name="holded_secret_token"
                          type={showApiKey ? 'text' : 'password'}
                          autoComplete="new-password"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          data-1p-ignore="true"
                          data-lpignore="true"
                          data-form-type="other"
                          required
                          readOnly={apiKeyReadOnly}
                          onFocus={() => setApiKeyReadOnly(false)}
                          value={apiKey}
                          onChange={(e) => {
                            setApiKey(e.target.value);
                            if (
                              apiKeyTouched &&
                              step2Error === ERROR_MESSAGES.INVALID_API_KEY_FORMAT
                            ) {
                              setStep2Error(null);
                            }
                          }}
                          onBlur={() => setApiKeyTouched(true)}
                          placeholder="32 caracteres hexadecimales (0-9, a-f)"
                          aria-invalid={showApiKeyFormatError ? 'true' : undefined}
                          aria-describedby={
                            showApiKeyFormatError ? 'apikey-format-error' : undefined
                          }
                          className="block h-14 w-full rounded-2xl border-0 bg-transparent px-5 pr-12 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey((v) => !v)}
                          className="absolute inset-y-0 right-0 flex items-center pr-5 text-slate-400 transition hover:text-slate-700"
                          aria-label={showApiKey ? 'Ocultar API key' : 'Mostrar API key'}
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {showApiKeyFormatError ? (
                        <p
                          id="apikey-format-error"
                          role="alert"
                          className="mt-1 px-1 text-xs leading-5 text-rose-700"
                        >
                          Formato inválido. La API key de Holded son{' '}
                          <strong>32 caracteres hexadecimales</strong> (solo dígitos 0–9 y letras
                          a–f). Cópiala completa desde Holded → Configuración → Integraciones → API.
                        </p>
                      ) : null}
                    </div>

                    {/* T&C — un solo check combinado, microcopy compacto */}
                    <label className="flex cursor-pointer items-start gap-2.5 px-1">
                      <input
                        type="checkbox"
                        checked={acceptedTerms && acceptedPrivacy}
                        onChange={(e) => {
                          setAcceptedTerms(e.target.checked);
                          setAcceptedPrivacy(e.target.checked);
                        }}
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
                        y la{' '}
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

                    <button
                      type="submit"
                      disabled={step2Loading}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ff5460] px-4 text-sm font-semibold text-white transition hover:bg-[#ff3a48] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {step2Loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {step2Loading
                        ? 'Conectando…'
                        : isChatgptFlow
                          ? 'Conectar Holded a ChatGPT'
                          : 'Conectar Holded'}
                    </button>

                    {/* Mini banner safety — una linea, sin sombra grande */}
                    <div className="flex items-start gap-2 px-1 text-xs leading-5 text-slate-500">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>
                        Tu API key se cifra con AES-256 y se queda en tu tenant.{' '}
                        <strong className="font-semibold text-slate-600">Nunca</strong> viaja por
                        modelos de IA, ni se usa para entrenar.
                      </span>
                    </div>
                  </form>
                </>
              ) : null}

              {/* Trust hints — solo en step 1 (pre-auth). En step 2 ya
                  mostramos el mini banner de seguridad bajo el submit. */}
              {!isApiKeyStep ? (
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
              ) : (
                <div className="mt-5 flex items-center justify-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    RGPD
                  </span>
                  <span className="text-slate-300">·</span>
                  <a
                    href={`${HOLDED_SITE_URL}/conectores/holded/dpa`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-600 hover:underline"
                  >
                    DPA
                  </a>
                  <span className="text-slate-300">·</span>
                  <span>Sin venta de datos</span>
                </div>
              )}

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
