'use client';

import {
  clearStaleFirebaseSession,
  clearStoredMagicLinkEmail,
  consumeGoogleRedirectResult,
  consumeMagicLink,
  detectMagicLinkInUrl,
  ensureCurrentFirebaseUserStillExists,
  getStoredMagicLinkEmail,
  requestPasswordReset,
  resetHoldedAuthState,
  sendMagicLinkEmail,
  signInWithEmail,
  signInWithGoogle,
  startGoogleRedirectSignIn,
} from '@/app/lib/auth';
import { auth } from '@/app/lib/firebase';
import { buildDashboardUrl, sanitizeHoldedReturnTarget } from '@/app/lib/holded-navigation';
import { mintSessionCookie } from '@/app/lib/serverSession';
import type { User } from 'firebase/auth';
import { ArrowLeft, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

const HOLDED_SITE_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';
const CHATGPT_HOME_URL = 'https://chatgpt.com';
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'soporte@verifactu.business';
const GOOGLE_REDIRECT_PENDING_KEY = 'holded_google_redirect_pending';
const REMEMBER_DEVICE_KEY = 'holded_remember_device';

function buildFallbackTarget(source: string) {
  return buildDashboardUrl(source);
}

function buildLocalHandoffTarget(source: string, target: string) {
  const url = new URL('/dashboard', HOLDED_SITE_URL);
  url.searchParams.set('source', source);
  url.searchParams.set('next', target);
  return url.toString();
}

function buildPostLoginTarget(source: string, target: string, chatgptFlow: boolean) {
  void source;
  void chatgptFlow;
  return target;
}

function resolveRedirectTarget(nextParam: string, source: string) {
  return sanitizeHoldedReturnTarget(nextParam, buildFallbackTarget(source));
}

async function activateSessionAndRedirect(
  user: User,
  rememberDevice: boolean,
  target: string,
  source?: string
) {
  await mintSessionCookie(user, { rememberDevice, source });
  window.location.replace(target);
}

function redirectToTarget(target: string) {
  window.location.replace(target);
}

function isChatgptAuthFlow(source: string, target: string) {
  const normalizedSource = source.trim().toLowerCase();
  if (
    normalizedSource.includes('chatgpt') ||
    normalizedSource.includes('holded_chat') ||
    normalizedSource.includes('openai')
  ) {
    return true;
  }

  try {
    const parsed = new URL(target);
    if (
      parsed.hostname.includes('chatgpt.com') ||
      parsed.hostname.includes('chat.openai.com') ||
      (parsed.pathname.includes('/oauth/authorize') &&
        parsed.searchParams.get('client_id')?.startsWith('openai-chatgpt-'))
    ) {
      return true;
    }
  } catch {
    if (
      target.includes('chatgpt.com') ||
      target.includes('chat.openai.com') ||
      target.includes('openai-chatgpt-')
    ) {
      return true;
    }
  }

  return false;
}

function hasGoogleProvider(user: User | null | undefined) {
  if (!user) return false;
  return user.providerData.some((provider) => provider.providerId === 'google.com');
}

function exitHoldedAuth(target: string) {
  if (typeof window === 'undefined') return;

  if (window.opener) {
    window.close();
    return;
  }

  window.location.assign(target);
}

function getAccessErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  const message = error.message || '';
  if (!message) return fallback;

  if (message.includes('Session mint failed')) {
    const jsonStart = message.indexOf('{');
    if (jsonStart >= 0) {
      try {
        const payload = JSON.parse(message.slice(jsonStart)) as { error?: string };
        if (payload?.error) {
          return payload.error;
        }
      } catch {
        // ignore parse errors and fall back below
      }
    }

    return 'Hemos validado tu acceso, pero no hemos podido activar la sesion compartida. Intentalo de nuevo.';
  }

  return message;
}

function GoogleBadge() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// authStep includes 'password' as fallback for existing users who have a password account
type AuthStep = 'choose' | 'magic-email' | 'magic-sent' | 'password';

function HoldedAuthContent() {
  const searchParams = useSearchParams();
  const source = searchParams?.get('source')?.trim() || 'holded_login';
  const nextParam = searchParams?.get('next')?.trim() || '';
  const redirectTarget = useMemo(
    () => resolveRedirectTarget(nextParam, source),
    [nextParam, source]
  );
  const isChatgptFlow = useMemo(
    () => isChatgptAuthFlow(source, redirectTarget),
    [redirectTarget, source]
  );
  const exitTarget = isChatgptFlow ? CHATGPT_HOME_URL : HOLDED_SITE_URL;
  const postLoginTarget = useMemo(
    () => buildPostLoginTarget(source, redirectTarget, isChatgptFlow),
    [isChatgptFlow, redirectTarget, source]
  );
  const requiresFreshAuth =
    source === 'holded_chat_requires_session' || source === 'chat_requires_session';

  const redirectedRef = useRef(false);
  const magicLinkCheckedRef = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>('choose');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [googleRedirecting, setGoogleRedirecting] = useState(false);
  const [existingUserChecking, setExistingUserChecking] = useState(true);
  const [mounted, setMounted] = useState(false);
  const allowGoogleLogin = process.env.NEXT_PUBLIC_HOLDED_ENABLE_GOOGLE_LOGIN === 'true';

  // Build the magic link return URL: returns to this same page so we can consume it
  const magicLinkReturnUrl = useMemo(() => {
    const url = new URL('/auth/holded', HOLDED_SITE_URL);
    url.searchParams.set('source', source);
    if (nextParam) url.searchParams.set('next', nextParam);
    return url.toString();
  }, [source, nextParam]);

  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(REMEMBER_DEVICE_KEY);
      if (stored === '1') {
        setRememberDevice(true);
      } else if (stored === '0') {
        setRememberDevice(false);
      }
    } catch {
      // ignore local storage access issues
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(REMEMBER_DEVICE_KEY, rememberDevice ? '1' : '0');
    } catch {
      // ignore local storage access issues
    }
  }, [rememberDevice]);

  useEffect(() => {
    let cancelled = false;
    const stopCheckingTimer = window.setTimeout(() => {
      if (!cancelled) {
        setExistingUserChecking(false);
      }
    }, 2500);

    const hydrateExistingUser = async () => {
      // ── Consume magic link if present in URL ─────────────────────────────
      if (!magicLinkCheckedRef.current && detectMagicLinkInUrl()) {
        magicLinkCheckedRef.current = true;
        window.clearTimeout(stopCheckingTimer);

        const storedEmail = getStoredMagicLinkEmail();
        if (!storedEmail) {
          // Ask for email to confirm identity before consuming the link
          setEmail('');
          setAuthStep('magic-email');
          setError('Escribe tu correo para confirmar tu identidad y completar el acceso.');
          if (!cancelled) setExistingUserChecking(false);
          return;
        }

        const result = await consumeMagicLink(storedEmail, { rememberDevice, source });
        if (result.error) {
          clearStoredMagicLinkEmail();
          if (!cancelled) {
            setExistingUserChecking(false);
            setError(result.error.userMessage);
          }
          return;
        }

        if (result.user) {
          redirectedRef.current = true;
          await activateSessionAndRedirect(result.user, rememberDevice, postLoginTarget, source);
        }
        return;
      }

      // ── Check for pending Google redirect ────────────────────────────────
      const pendingGoogleRedirect = window.sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY);
      if (pendingGoogleRedirect === '1') {
        window.sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
        const redirectResult = await consumeGoogleRedirectResult({ rememberDevice, source });

        if (redirectResult.error) {
          if (!cancelled) {
            setExistingUserChecking(false);
            setError(redirectResult.error.userMessage);
          }
          return;
        }

        if (redirectResult.user) {
          redirectedRef.current = true;
          await activateSessionAndRedirect(
            redirectResult.user,
            rememberDevice,
            postLoginTarget,
            source
          );
          return;
        }
      }

      // ── Check for existing Firebase session ──────────────────────────────
      if (requiresFreshAuth) {
        await resetHoldedAuthState();
        redirectedRef.current = false;
        if (!cancelled) {
          setExistingUserChecking(false);
        }
        return;
      }

      if (!auth?.currentUser || redirectedRef.current) {
        if (!cancelled) setExistingUserChecking(false);
        return;
      }

      try {
        const existingState = await ensureCurrentFirebaseUserStillExists();
        if (!existingState.ok) {
          redirectedRef.current = false;
          if (!cancelled) {
            setExistingUserChecking(false);
            if (existingState.reason === 'network') {
              setError(
                'No hemos podido comprobar tu acceso por un problema de red. Intentalo de nuevo.'
              );
            }
          }
          return;
        }

        redirectedRef.current = true;
        await activateSessionAndRedirect(
          existingState.user as User,
          rememberDevice,
          postLoginTarget,
          source
        );
      } catch {
        await clearStaleFirebaseSession();
        redirectedRef.current = false;
        if (!cancelled) {
          setExistingUserChecking(false);
          setError(
            'Hemos detectado tu acceso, pero no hemos podido activarlo. Intentalo de nuevo.'
          );
        }
      }
    };

    void hydrateExistingUser();

    return () => {
      cancelled = true;
      window.clearTimeout(stopCheckingTimer);
    };
  }, [rememberDevice, postLoginTarget, source, requiresFreshAuth]);

  // ── Magic link submit ─────────────────────────────────────────────────────

  const handleMagicEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Escribe tu correo para continuar.');
      return;
    }

    setIsLoading(true);
    setError('');
    setNotice('');

    const result = await sendMagicLinkEmail(trimmedEmail, magicLinkReturnUrl);
    setIsLoading(false);

    if (!result.ok) {
      setError(result.error.userMessage);
      return;
    }

    setAuthStep('magic-sent');
  };

  const handleResendMagicLink = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;

    setIsLoading(true);
    setError('');
    setNotice('');

    const result = await sendMagicLinkEmail(trimmedEmail, magicLinkReturnUrl);
    setIsLoading(false);

    if (!result.ok) {
      setError(result.error.userMessage);
    } else {
      setNotice('Hemos reenviado el enlace. Revisa tu bandeja de entrada.');
    }
  };

  // ── Password login (fallback for existing accounts) ───────────────────────

  const handlePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setNotice('');

    try {
      const result = await signInWithEmail(email, password, { rememberDevice, source });
      if (result.error) {
        setError(result.error.userMessage);
        return;
      }
      redirectToTarget(postLoginTarget);
    } catch (error) {
      setError(
        getAccessErrorMessage(error, 'No hemos podido iniciar tu acceso. Intenta de nuevo.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setError('Escribe primero tu correo y luego pulsa "Has olvidado tu contrasena?".');
      setNotice('');
      return;
    }

    setIsLoading(true);
    setError('');
    setNotice('');

    const result = await requestPasswordReset(email.trim());
    if (!result.ok) {
      setIsLoading(false);
      setError(result.error?.userMessage || 'No hemos podido enviarte el correo de recuperacion.');
      return;
    }

    setIsLoading(false);
    setNotice('Te hemos enviado un correo para restablecer la contrasena.');
  };

  // ── Google ────────────────────────────────────────────────────────────────

  const handleGoogle = async () => {
    setGoogleRedirecting(true);
    setIsLoading(true);
    setError('');
    setNotice('');
    const popupResult = await signInWithGoogle({ rememberDevice });
    if (!popupResult.error && popupResult.user) {
      redirectToTarget(postLoginTarget);
      return;
    }

    window.sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, '1');
    const result = await startGoogleRedirectSignIn();
    if (!result.redirecting && result.error) {
      window.sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
      setGoogleRedirecting(false);
      setIsLoading(false);
      setError(result.error.userMessage);
    }
  };

  // ── UI helpers ─────────────────────────────────────────────────────────────

  const HoldedBadge = () => (
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
          {isChatgptFlow ? 'Conector ChatGPT · Holded' : 'Acceso a tu conexion'}
        </div>
      </div>
    </div>
  );

  const ErrorBox = () =>
    error ? (
      <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
        {error}
      </div>
    ) : null;

  const NoticeBox = () =>
    notice ? (
      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
        {notice}
      </div>
    ) : null;

  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
    >
      <ArrowLeft className="h-4 w-4" />
      Volver
    </button>
  );

  const HoldedHeaderBadge = ({ subtitle }: { subtitle: string }) => (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff1f2] ring-1 ring-[#ff5460]/10">
        <Image
          src="/brand/holded/holded-diamond-logo.png"
          alt="Holded"
          width={22}
          height={22}
          className="h-[22px] w-[22px] object-contain"
          priority
        />
      </div>
      <div>
        <div className="text-base font-bold text-slate-950">holded</div>
        <div className="text-xs text-slate-500">{subtitle}</div>
      </div>
    </div>
  );

  const FooterLinks = () => (
    <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 text-center text-sm text-slate-600 sm:px-8">
      <div className="text-xs leading-5 text-slate-500">
        Si necesitas ayuda, escribenos a{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-slate-700 underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff5f2_0%,#f8fafc_44%,#f8fafc_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-7xl items-center justify-center py-6">
        <section className="flex w-full flex-col items-center justify-center px-4 py-6 sm:px-8 sm:py-8">
          {isChatgptFlow ? (
            <div
              className={`mb-5 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-500 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
            >
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Gratis para siempre
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Sin tarjeta de credito
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Conexion en menos de un minuto
              </span>
            </div>
          ) : null}
          <div
            className={`w-full max-w-[26rem] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_90px_-56px_rgba(15,23,42,0.35)] transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            {existingUserChecking ? (
              /* ── Comprobando sesión existente ──────────────────────── */
              <div className="flex flex-col items-center gap-3 px-6 py-14 sm:px-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1f2]">
                  <Image
                    src="/brand/holded/holded-diamond-logo.png"
                    alt="Holded"
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                    priority
                  />
                </div>
                <Loader2 className="mt-2 h-5 w-5 animate-spin text-[#ff5460]" />
                <p className="text-sm text-slate-500">Comprobando acceso...</p>
              </div>
            ) : authStep === 'choose' ? (
              /* ── Elegir método de identidad ───────────────────────── */
              <>
                <div className="px-6 pb-8 pt-7 sm:px-8">
                  <div className="text-center">
                    <HoldedBadge />
                    <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
                      {isChatgptFlow
                        ? 'Identifícate para activar tu conector'
                        : 'Accede para continuar'}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {isChatgptFlow
                        ? 'En menos de un minuto conectas Holded a ChatGPT.'
                        : 'Elige como quieres identificarte.'}
                    </p>
                  </div>

                  <ErrorBox />

                  <div className="mt-7 space-y-3">
                    {allowGoogleLogin ? (
                      <button
                        type="button"
                        onClick={handleGoogle}
                        disabled={isLoading || googleRedirecting}
                        className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {googleRedirecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <GoogleBadge />
                        )}
                        {googleRedirecting ? 'Redirigiendo...' : 'Continuar con Google'}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setNotice('');
                        setAuthStep('magic-email');
                      }}
                      className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      <Mail className="h-4 w-4 text-slate-500" />
                      Continuar con correo
                    </button>
                  </div>

                  <div className="mt-5 text-center">
                    <button
                      type="button"
                      onClick={() => exitHoldedAuth(exitTarget)}
                      className="text-xs text-slate-400 underline underline-offset-4 transition hover:text-slate-600"
                    >
                      Volver
                    </button>
                  </div>
                </div>
                <FooterLinks />
              </>
            ) : authStep === 'magic-email' ? (
              /* ── Correo para magic link ───────────────────────────── */
              <>
                <div className="px-6 pb-6 pt-6 sm:px-8">
                  <BackButton
                    onClick={() => {
                      setAuthStep('choose');
                      setError('');
                      setNotice('');
                    }}
                  />

                  <div className="mt-5">
                    <HoldedHeaderBadge subtitle="Identidad" />
                  </div>

                  <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
                    Escribe tu correo
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Te enviamos un enlace de acceso seguro. Sin contrasena.
                  </p>

                  <ErrorBox />
                  <NoticeBox />

                  <form onSubmit={handleMagicEmailSubmit} className="mt-5 space-y-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="magic-email-input"
                        className="text-sm font-semibold text-slate-800"
                      >
                        Correo electronico
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="magic-email-input"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="nombre@empresa.com"
                          autoComplete="email"
                          required
                          autoFocus
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        id="rememberDevice"
                        checked={rememberDevice}
                        onChange={(event) => setRememberDevice(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#ff5460] focus:ring-[#ff5460]"
                      />
                      <label htmlFor="rememberDevice">Mantener sesion en este dispositivo</label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#ff5460] px-5 text-sm font-semibold text-white shadow-[0_18px_38px_-22px_rgba(255,84,96,0.85)] transition hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Enviar enlace de acceso'
                      )}
                    </button>
                  </form>

                  <div className="mt-5 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setNotice('');
                        setAuthStep('password');
                      }}
                      className="text-xs text-slate-400 underline underline-offset-4 transition hover:text-slate-600"
                    >
                      Ya tengo contrasena
                    </button>
                  </div>
                </div>
                <FooterLinks />
              </>
            ) : authStep === 'magic-sent' ? (
              /* ── Magic link enviado ───────────────────────────────── */
              <>
                <div className="px-6 pb-8 pt-7 sm:px-8">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
                      <Mail className="h-7 w-7 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-950">
                        Revisa tu correo
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Hemos enviado un enlace de acceso a{' '}
                        <span className="font-semibold text-slate-800">{email}</span>. Abrelo para
                        continuar.
                      </p>
                    </div>
                  </div>

                  <ErrorBox />
                  <NoticeBox />

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    El enlace caduca en 45 minutos. Si no lo ves, revisa la carpeta de spam.
                  </div>

                  <div className="mt-5 flex flex-col gap-3 text-center text-sm">
                    <button
                      type="button"
                      onClick={handleResendMagicLink}
                      disabled={isLoading}
                      className="font-semibold text-[#ff5460] transition hover:text-[#ef4654] disabled:opacity-60"
                    >
                      {isLoading ? 'Reenviando...' : 'Reenviar enlace'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthStep('magic-email');
                        setError('');
                        setNotice('');
                      }}
                      className="text-xs text-slate-400 underline underline-offset-4 transition hover:text-slate-600"
                    >
                      Cambiar correo
                    </button>
                  </div>
                </div>
                <FooterLinks />
              </>
            ) : (
              /* ── Login con contraseña (fallback) ──────────────────── */
              <>
                <div className="px-6 pb-6 pt-6 sm:px-8">
                  <BackButton
                    onClick={() => {
                      setAuthStep('magic-email');
                      setError('');
                      setNotice('');
                    }}
                  />

                  <div className="mt-5">
                    <HoldedHeaderBadge subtitle="Acceso con contrasena" />
                  </div>

                  <ErrorBox />
                  <NoticeBox />

                  <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-sm font-semibold text-slate-800">
                        Correo electronico
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="nombre@empresa.com"
                          autoComplete="email"
                          required
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="password" className="text-sm font-semibold text-slate-800">
                        Contrasena
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Contrasena"
                          autoComplete="current-password"
                          required
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-1 text-sm">
                      <label className="inline-flex items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={rememberDevice}
                          onChange={(event) => setRememberDevice(event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-[#ff5460] focus:ring-[#ff5460]"
                        />
                        Mantener sesion
                      </label>
                      <button
                        type="button"
                        onClick={handlePasswordReset}
                        className="font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-950"
                      >
                        Has olvidado tu contrasena?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#ff5460] px-5 text-sm font-semibold text-white shadow-[0_18px_38px_-22px_rgba(255,84,96,0.85)] transition hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? 'Iniciando sesion...' : 'Iniciar sesion'}
                    </button>
                  </form>

                  <div className="mt-5 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthStep('magic-email');
                        setError('');
                        setNotice('');
                      }}
                      className="text-xs text-slate-400 underline underline-offset-4 transition hover:text-slate-600"
                    >
                      Acceder con enlace de correo
                    </button>
                  </div>
                </div>
                <FooterLinks />
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function HoldedAuthPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#fff5f2_0%,#f8fafc_44%,#f8fafc_100%)]">
          <Loader2 className="h-6 w-6 animate-spin text-[#ff5460]" />
        </main>
      }
    >
      <HoldedAuthContent />
    </Suspense>
  );
}
