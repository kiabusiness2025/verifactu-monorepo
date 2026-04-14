'use client';

import type { User } from 'firebase/auth';
import { ArrowLeft, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearStaleFirebaseSession,
  consumeGoogleRedirectResult,
  ensureCurrentFirebaseUserStillExists,
  registerWithEmail,
  requestPasswordReset,
  resetHoldedAuthState,
  signInWithEmail,
  startGoogleRedirectSignIn,
} from '@/app/lib/auth';
import { auth } from '@/app/lib/firebase';
import { buildDashboardUrl, sanitizeHoldedReturnTarget } from '@/app/lib/holded-navigation';
import { mintSessionCookie } from '@/app/lib/serverSession';

const HOLDED_SITE_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';
const CHATGPT_HOME_URL = 'https://chatgpt.com';
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'soporte@verifactu.business';
const GOOGLE_REDIRECT_PENDING_KEY = 'holded_google_redirect_pending';

function buildFallbackTarget(source: string) {
  return buildDashboardUrl(source);
}

function buildLocalHandoffTarget(source: string, target: string) {
  const url = new URL('/dashboard', HOLDED_SITE_URL);
  url.searchParams.set('source', source);
  url.searchParams.set('next', target);
  return url.toString();
}

function resolveRedirectTarget(nextParam: string, source: string) {
  return sanitizeHoldedReturnTarget(nextParam, buildFallbackTarget(source));
}

async function activateSessionAndRedirect(user: User, rememberDevice: boolean, target: string) {
  await mintSessionCookie(user, { rememberDevice });
  window.location.replace(target);
}

function redirectToTarget(target: string) {
  window.location.replace(target);
}

function isChatgptAuthFlow(source: string, target: string) {
  const normalizedSource = source.trim().toLowerCase();
  if (
    normalizedSource.includes('chatgpt') ||
    normalizedSource.includes('isaak_chat') ||
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

function HoldedAuthContent() {
  const router = useRouter();
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
    () => buildLocalHandoffTarget(source, redirectTarget),
    [redirectTarget, source]
  );
  const isRegisterMode = (searchParams?.get('mode') || '').toLowerCase() === 'register';
  const allowGoogleLogin = process.env.NEXT_PUBLIC_HOLDED_ENABLE_GOOGLE_LOGIN === 'true';

  const redirectedRef = useRef(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptLegal, setAcceptLegal] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [existingUserChecking, setExistingUserChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [googleRedirecting, setGoogleRedirecting] = useState(false);
  // Company data for registration step 2
  const [companyName, setCompanyName] = useState('');
  const [companyTaxId, setCompanyTaxId] = useState('');
  const [companyLegalName, setCompanyLegalName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  // Paso activo: login = 'choose' | 'email'; registro = 'register-account' | 'register-company'
  const [authStep, setAuthStep] = useState<
    'choose' | 'email' | 'register-account' | 'register-company'
  >(isRegisterMode ? 'register-account' : 'choose');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const stopCheckingTimer = window.setTimeout(() => {
      if (!cancelled) {
        setExistingUserChecking(false);
      }
    }, 2500);

    const hydrateExistingUser = async () => {
      const pendingGoogleRedirect = window.sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY);
      if (pendingGoogleRedirect === '1') {
        window.sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
        const redirectResult = await consumeGoogleRedirectResult({ rememberDevice });

        if (redirectResult.error) {
          if (!cancelled) {
            setExistingUserChecking(false);
            setError(redirectResult.error.userMessage);
          }
          return;
        }

        if (redirectResult.user) {
          redirectedRef.current = true;
          redirectToTarget(postLoginTarget);
          return;
        }
      }

      if (isRegisterMode) {
        await resetHoldedAuthState();
        if (!cancelled) setExistingUserChecking(false);
        return;
      }

      if (source === 'isaak_chat_requires_session') {
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
          postLoginTarget
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
  }, [isRegisterMode, postLoginTarget, rememberDevice, source]);

  const saveCompanyPrefill = (
    forEmail: string,
    data: {
      companyName: string;
      companyTaxId: string;
      companyLegalName: string;
      companyEmail: string;
      companyPhone: string;
      contactFullName: string;
      contactPhone: string;
    }
  ) => {
    try {
      const key = `verifactu_company_${forEmail.toLowerCase()}`;
      window.localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // localStorage not available — onboarding will start with empty fields
    }
  };

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setNotice('');

    // ── Paso 1 del registro: datos de cuenta ──────────────────────────────────
    if (authStep === 'register-account') {
      const normalizedFullName = fullName.trim().replace(/\s+/g, ' ');
      if (normalizedFullName.length < 3) {
        setIsLoading(false);
        setError('Escribe tu nombre completo para continuar.');
        return;
      }
      if (!email.trim()) {
        setIsLoading(false);
        setError('Escribe tu correo electronico para continuar.');
        return;
      }
      if (password.length < 8) {
        setIsLoading(false);
        setError('La contrasena debe tener al menos 8 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setIsLoading(false);
        setError('Las contrasenas no coinciden. Revisalas e intentalo de nuevo.');
        return;
      }
      setIsLoading(false);
      setCompanyEmail(email);
      setAuthStep('register-company');
      return;
    }

    // ── Paso 2 del registro: datos de empresa ─────────────────────────────────
    if (authStep === 'register-company') {
      if (!acceptLegal) {
        setIsLoading(false);
        setError('Necesitas aceptar los terminos y la politica de privacidad para continuar.');
        return;
      }
      if (!companyName.trim()) {
        setIsLoading(false);
        setError('Escribe el nombre de tu empresa para continuar.');
        return;
      }
      if (!companyTaxId.trim()) {
        setIsLoading(false);
        setError('Escribe el NIF/CIF de tu empresa para continuar.');
        return;
      }

      const normalizedFullName = fullName.trim().replace(/\s+/g, ' ');

      const registerResult = await registerWithEmail(
        email,
        password,
        {
          fullName: normalizedFullName,
          phone,
        },
        source
      );
      if (registerResult.error) {
        setIsLoading(false);
        setError(registerResult.error.userMessage);
        return;
      }

      // Persist company data to localStorage so the onboarding wizard can pre-fill it
      saveCompanyPrefill(email, {
        companyName: companyName.trim(),
        companyTaxId: companyTaxId.trim().toUpperCase(),
        companyLegalName: companyLegalName.trim(),
        companyEmail: companyEmail.trim() || email,
        companyPhone: companyPhone.trim(),
        contactFullName: normalizedFullName,
        contactPhone: phone.trim(),
      });

      setIsLoading(false);
      const thanksUrl = new URL('/gracias', window.location.origin);
      thanksUrl.searchParams.set('step', 'check-email');
      thanksUrl.searchParams.set('email', email);
      thanksUrl.searchParams.set('source', source);
      if (registerResult.warning) {
        thanksUrl.searchParams.set('notice', 'verification-email-may-be-delayed');
      }
      router.push(`${thanksUrl.pathname}${thanksUrl.search}`);
      return;
    }

    // ── Login ─────────────────────────────────────────────────────────────────
    try {
      const result = await signInWithEmail(email, password, { rememberDevice });
      if (result.error) {
        setError(result.error.userMessage);
        return;
      }

      redirectToTarget(postLoginTarget);
    } catch (error) {
      console.error('[holded auth] email access failed', error);
      setError(
        getAccessErrorMessage(error, 'No hemos podido iniciar tu acceso. Intenta de nuevo.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleRedirecting(true);
    setIsLoading(true);
    setError('');
    setNotice('');
    // Usamos redirect siempre — evitamos popup para no romper webviews y contextos embebidos (ChatGPT OAuth)
    window.sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, '1');
    const result = await startGoogleRedirectSignIn();
    if (!result.redirecting && result.error) {
      window.sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
      setGoogleRedirecting(false);
      setIsLoading(false);
      setError(result.error.userMessage);
    }
    // Si redirige: el navegador navega fuera, no hace falta limpiar estado
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

  // ── helpers de UI reutilizables ────────────────────────────────────────────

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
        <div className="text-xs text-slate-500">Acceso a tu conexion</div>
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

  const FooterLinks = () => (
    <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 text-center text-sm text-slate-600 sm:px-8">
      {authStep === 'register-account' || authStep === 'register-company' ? (
        <Link
          href={`/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(nextParam)}`}
          className="font-semibold text-slate-900 underline underline-offset-4"
        >
          Ya tienes cuenta? Inicia sesion
        </Link>
      ) : (
        <Link
          href={`/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(nextParam)}&mode=register`}
          className="font-semibold text-slate-900 underline underline-offset-4"
        >
          No tienes cuenta? Registrate
        </Link>
      )}
      <div className="mt-3 text-xs leading-5 text-slate-500">
        Si necesitas ayuda, escribenos a{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-slate-700 underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff5f2_0%,#f8fafc_44%,#f8fafc_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-7xl items-center justify-center py-6">
        <section className="flex w-full items-center justify-center px-4 py-6 sm:px-8 sm:py-8">
          <div className="w-full max-w-[26rem] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_90px_-56px_rgba(15,23,42,0.35)]">
            {/* ── Comprobando sesión existente ─────────────────── */}
            {existingUserChecking ? (
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
            ) : authStep === 'register-account' ? (
              /* ── Registro paso 1: cuenta ───────────────────────── */
              <>
                <div className="px-6 pb-6 pt-7 sm:px-8">
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
                      <div className="text-base font-bold text-slate-950">Crea tu acceso</div>
                      <div className="text-xs text-slate-500">Paso 1 de 2 · Datos de tu cuenta</div>
                    </div>
                  </div>

                  <ErrorBox />
                  <NoticeBox />

                  <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="fullName" className="text-sm font-semibold text-slate-800">
                        Nombre completo
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Nombre y apellidos"
                        autoComplete="name"
                        required
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                      />
                    </div>

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
                      <label htmlFor="phone" className="text-sm font-semibold text-slate-800">
                        Telefono <span className="font-normal text-slate-400">(opcional)</span>
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="+34 600 000 000"
                        autoComplete="tel"
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                      />
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
                          placeholder="Minimo 8 caracteres"
                          autoComplete="new-password"
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

                    <div className="space-y-1.5">
                      <label
                        htmlFor="confirmPassword"
                        className="text-sm font-semibold text-slate-800"
                      >
                        Repite la contrasena
                      </label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          placeholder="Repite tu contrasena"
                          autoComplete="new-password"
                          required
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          aria-label={
                            showConfirmPassword ? 'Ocultar confirmacion' : 'Mostrar confirmacion'
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#ff5460] px-5 text-sm font-semibold text-white shadow-[0_18px_38px_-22px_rgba(255,84,96,0.85)] transition hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Continuar
                    </button>
                  </form>
                </div>
                <FooterLinks />
              </>
            ) : authStep === 'register-company' ? (
              /* ── Registro paso 2: empresa ──────────────────────── */
              <>
                <div className="px-6 pb-6 pt-6 sm:px-8">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthStep('register-account');
                      setError('');
                      setNotice('');
                    }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver
                  </button>

                  <div className="mt-5 flex items-center gap-3">
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
                      <div className="text-base font-bold text-slate-950">Tu empresa</div>
                      <div className="text-xs text-slate-500">Paso 2 de 2 · Datos de empresa</div>
                    </div>
                  </div>

                  <ErrorBox />
                  <NoticeBox />

                  <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="companyName" className="text-sm font-semibold text-slate-800">
                        Nombre comercial
                      </label>
                      <input
                        id="companyName"
                        type="text"
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        placeholder="Nombre de tu empresa"
                        autoComplete="organization"
                        required
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="companyTaxId"
                        className="text-sm font-semibold text-slate-800"
                      >
                        NIF / CIF
                      </label>
                      <input
                        id="companyTaxId"
                        type="text"
                        value={companyTaxId}
                        onChange={(event) => setCompanyTaxId(event.target.value)}
                        placeholder="B12345678"
                        autoComplete="off"
                        required
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="companyLegalName"
                        className="text-sm font-semibold text-slate-800"
                      >
                        Razon social <span className="font-normal text-slate-400">(opcional)</span>
                      </label>
                      <input
                        id="companyLegalName"
                        type="text"
                        value={companyLegalName}
                        onChange={(event) => setCompanyLegalName(event.target.value)}
                        placeholder="Razon social completa"
                        autoComplete="organization"
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="companyEmail"
                        className="text-sm font-semibold text-slate-800"
                      >
                        Correo de notificaciones
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="companyEmail"
                          type="email"
                          value={companyEmail}
                          onChange={(event) => setCompanyEmail(event.target.value)}
                          placeholder="nombre@empresa.com"
                          autoComplete="email"
                          required
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="companyPhone"
                        className="text-sm font-semibold text-slate-800"
                      >
                        Telefono de empresa{' '}
                        <span className="font-normal text-slate-400">(opcional)</span>
                      </label>
                      <input
                        id="companyPhone"
                        type="tel"
                        value={companyPhone}
                        onChange={(event) => setCompanyPhone(event.target.value)}
                        placeholder="+34 900 000 000"
                        autoComplete="tel"
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                      />
                    </div>

                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                      <input
                        type="checkbox"
                        checked={acceptLegal}
                        onChange={(event) => setAcceptLegal(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-[#ff5460] focus:ring-[#ff5460]"
                      />
                      <span>
                        Acepto los{' '}
                        <Link href="/terms" className="font-semibold text-slate-900 underline">
                          terminos
                        </Link>{' '}
                        y la{' '}
                        <Link href="/privacy" className="font-semibold text-slate-900 underline">
                          politica de privacidad
                        </Link>
                        .
                      </span>
                    </label>

                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                      <input
                        type="checkbox"
                        checked={rememberDevice}
                        onChange={(event) => setRememberDevice(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-[#ff5460] focus:ring-[#ff5460]"
                      />
                      <span>
                        Recordar sesion en este dispositivo despues de verificar el correo.
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#ff5460] px-5 text-sm font-semibold text-white shadow-[0_18px_38px_-22px_rgba(255,84,96,0.85)] transition hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? 'Creando acceso...' : 'Crear acceso y verificar correo'}
                    </button>
                  </form>
                </div>
                <FooterLinks />
              </>
            ) : authStep === 'choose' ? (
              /* ── Elegir método de identidad ────────────────────── */
              <>
                <div className="px-6 pb-8 pt-7 sm:px-8">
                  <div className="text-center">
                    <HoldedBadge />
                    <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
                      Accede para continuar
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Elige como quieres identificarte.
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
                      onClick={() => setAuthStep('email')}
                      className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      <Mail className="h-4 w-4 text-slate-500" />
                      Continuar con correo
                    </button>
                  </div>
                </div>
                <FooterLinks />
              </>
            ) : (
              /* ── Formulario email / login ───────────────────────── */
              <>
                <div className="px-6 pb-6 pt-6 sm:px-8">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthStep('choose');
                      setError('');
                      setNotice('');
                    }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver
                  </button>

                  <div className="mt-5 flex items-center gap-3">
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
                      <div className="text-base font-bold text-slate-950">Accede con tu correo</div>
                      <div className="text-xs text-slate-500">Conector Holded</div>
                    </div>
                  </div>

                  <ErrorBox />
                  <NoticeBox />

                  <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
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

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    Usa el mismo correo que tienes en Holded para que el alta y la conexion queden
                    alineadas.
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
