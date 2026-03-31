'use client';

import type { User } from 'firebase/auth';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Mail, ShieldCheck } from 'lucide-react';
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
  signInWithGoogle,
  startGoogleRedirectSignIn,
} from '@/app/lib/auth';
import { auth } from '@/app/lib/firebase';
import { buildDashboardUrl } from '@/app/lib/holded-navigation';
import { mintSessionCookie } from '@/app/lib/serverSession';

const HOLDED_SITE_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';
const ISAAK_SITE_URL = process.env.NEXT_PUBLIC_ISAAK_SITE_URL || 'https://isaak.verifactu.business';
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
  if (!nextParam) return buildFallbackTarget(source);

  try {
    const parsed = new URL(nextParam, HOLDED_SITE_URL);
    const allowedOrigins = new Set([
      new URL(HOLDED_SITE_URL).origin,
      new URL(ISAAK_SITE_URL).origin,
    ]);

    if (!allowedOrigins.has(parsed.origin)) {
      return buildFallbackTarget(source);
    }

    return parsed.toString();
  } catch {
    return buildFallbackTarget(source);
  }
}

async function activateSessionAndRedirect(user: User, rememberDevice: boolean, target: string) {
  await mintSessionCookie(user, { rememberDevice });
  window.location.replace(target);
}

function redirectToTarget(target: string) {
  window.location.replace(target);
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

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setNotice('');

    if (isRegisterMode) {
      if (!acceptLegal) {
        setIsLoading(false);
        setError('Necesitas aceptar los terminos y la politica de privacidad para continuar.');
        return;
      }

      if (password !== confirmPassword) {
        setIsLoading(false);
        setError('Las contrasenas no coinciden. Revisalas e intentalo de nuevo.');
        return;
      }

      const normalizedFullName = fullName.trim().replace(/\s+/g, ' ');
      if (normalizedFullName.length < 3) {
        setIsLoading(false);
        setError('Escribe tu nombre completo para continuar.');
        return;
      }

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
    setIsLoading(true);
    setError('');
    setNotice('');

    try {
      const result = await signInWithGoogle({ rememberDevice });
      if (result.error) {
        if (
          result.error.code === 'auth/popup-blocked' ||
          result.error.code === 'auth/operation-not-supported-in-this-environment' ||
          result.error.code === 'auth/web-storage-unsupported'
        ) {
          window.sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, '1');
          const redirectFallback = await startGoogleRedirectSignIn();
          if (!redirectFallback.redirecting && redirectFallback.error) {
            setError(redirectFallback.error.userMessage);
          }
          return;
        }

        setError(result.error.userMessage);
        return;
      }

      redirectToTarget(postLoginTarget);
    } catch (error) {
      console.error('[holded auth] google access failed', error);
      setError(
        getAccessErrorMessage(error, 'No hemos podido continuar con Google. Intenta de nuevo.')
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

  const currentTitle = isRegisterMode ? 'Crea tu acceso a Holded' : 'Inicia sesion en tu cuenta';
  const currentSubtitle = isRegisterMode
    ? 'Crea tu acceso y en el siguiente paso terminaras la conexion con Holded.'
    : 'Vuelve a entrar para continuar con la conexion de Holded.';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff5f2_0%,#f8fafc_44%,#f8fafc_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col rounded-[2rem] border border-slate-200/80 bg-white/90 shadow-[0_40px_120px_-72px_rgba(15,23,42,0.35)] backdrop-blur lg:grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex flex-col justify-between overflow-hidden px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-14">
          <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top_left,rgba(255,84,96,0.16),transparent_68%)]" />
          <div className="relative flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#ff5460] transition hover:text-[#ef4654]"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Holded
            </Link>
            <a
              href={HOLDED_SITE_URL}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 transition hover:text-slate-600"
            >
              holded.verifactu.business
            </a>
          </div>

          <div className="relative mt-12 max-w-xl lg:mt-20">
            <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff1f2] ring-1 ring-[#ff5460]/10">
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
                <div className="text-sm font-semibold text-slate-950">holded</div>
                <div className="text-xs text-slate-500">Acceso guiado a tu conexion</div>
              </div>
            </div>

            <h1 className="mt-10 max-w-lg text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              {isRegisterMode
                ? 'Crea tu acceso y conecta Holded sin friccion.'
                : 'Bienvenido de nuevo.'}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-9 text-slate-600">
              {isRegisterMode
                ? 'Preparamos tu acceso y luego terminas la conexion con Holded para empezar con tus datos reales sin pasos innecesarios.'
                : 'Accede a tu cuenta para continuar con Holded y terminar la conexion con tus datos conectados.'}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-[#ff5460]" />
                  Acceso seguro
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Activamos tu acceso al terminar este paso para evitar entradas repetidas.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CheckCircle2 className="h-4 w-4 text-[#ff5460]" />
                  Siguiente paso claro
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Entras, conectas Holded y sigues directamente al siguiente paso.
                </p>
              </div>
            </div>
          </div>

          <div className="relative mt-10 hidden items-center justify-between gap-4 text-sm text-slate-500 lg:flex">
            <span>Soporte: {SUPPORT_EMAIL}</span>
            <span>Espanol</span>
          </div>
        </section>

        <section className="flex items-center justify-center border-t border-slate-200/80 bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] px-4 py-8 sm:px-8 lg:border-l lg:border-t-0 lg:px-10">
          <div className="w-full max-w-[30rem] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_90px_-56px_rgba(15,23,42,0.35)]">
            <div className="px-6 pb-6 pt-7 sm:px-8">
              <div className="text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {isRegisterMode ? 'Nuevo acceso' : 'Acceso a Holded'}
                </div>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                  {currentTitle}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">{currentSubtitle}</p>
              </div>

              <div className="mt-7 space-y-4">
                <button
                  type="button"
                  onClick={allowGoogleLogin ? handleGoogle : undefined}
                  disabled={isLoading || existingUserChecking || !allowGoogleLogin}
                  className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <GoogleBadge />
                  {allowGoogleLogin ? 'Continuar con Google' : 'Continuar con Google'}
                </button>

                <div className="text-center text-xs text-slate-500">
                  {allowGoogleLogin
                    ? 'Tambien puedes entrar con tu correo habitual.'
                    : 'Google OAuth quedara disponible aqui en cuanto activemos el proveedor.'}
                </div>
              </div>

              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs font-medium text-slate-400">
                  <span className="bg-white px-3">
                    {isRegisterMode ? 'o crea tu acceso con email' : 'o con tu email'}
                  </span>
                </div>
              </div>

              {existingUserChecking ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#ff5460]" />
                  <p className="mt-3 text-sm font-semibold text-slate-900">Preparando tu acceso</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Estamos recuperando tu sesion para continuar sin pasos repetidos.
                  </p>
                </div>
              ) : null}

              {error ? (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                  {error}
                </div>
              ) : null}

              {notice ? (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                  {notice}
                </div>
              ) : null}

              <form onSubmit={handleEmailLogin} className="mt-5 space-y-4">
                {isRegisterMode ? (
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
                ) : null}

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
                      placeholder="Correo electronico"
                      autoComplete="email"
                      required
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                    />
                  </div>
                </div>

                {isRegisterMode ? (
                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="text-sm font-semibold text-slate-800">
                      Telefono
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
                ) : null}

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-semibold text-slate-800">
                    Contrasena
                  </label>
                  <div className="relative">
                    {isRegisterMode ? (
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Contrasena"
                        autoComplete="new-password"
                        required
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                      />
                    ) : (
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
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {isRegisterMode ? (
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
                        onClick={() => setShowConfirmPassword((value) => !value)}
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
                ) : null}

                {!isRegisterMode ? (
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
                ) : null}

                {isRegisterMode ? (
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
                ) : null}

                {isRegisterMode ? (
                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                    <input
                      type="checkbox"
                      checked={acceptMarketing}
                      onChange={(event) => setAcceptMarketing(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#ff5460] focus:ring-[#ff5460]"
                    />
                    <span>
                      Quiero recibir novedades y mejoras sobre la conexion y nuevas funciones.
                    </span>
                  </label>
                ) : null}

                {isRegisterMode ? (
                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={(event) => setRememberDevice(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#ff5460] focus:ring-[#ff5460]"
                    />
                    <span>Recordar sesion en este dispositivo despues de verificar el correo.</span>
                  </label>
                ) : null}

                <button
                  type="submit"
                  disabled={isLoading || existingUserChecking}
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#ff5460] px-5 text-sm font-semibold text-white shadow-[0_18px_38px_-22px_rgba(255,84,96,0.85)] transition hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading
                    ? isRegisterMode
                      ? 'Creando acceso...'
                      : 'Iniciando sesion...'
                    : isRegisterMode
                      ? 'Crear acceso y verificar correo'
                      : 'Iniciar sesion'}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                Usa el mismo correo que tienes registrado en Holded para que el alta y la conexion
                posterior queden alineadas.
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 text-center text-sm text-slate-600 sm:px-8">
              {isRegisterMode ? (
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
                  Nuevo en Holded? Registrate
                </Link>
              )}
              <div className="mt-3 text-xs leading-5 text-slate-500">
                Si necesitas ayuda, escribenos a{' '}
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
