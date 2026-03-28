'use client';

import type { User } from 'firebase/auth';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearStaleFirebaseSession,
  resetHoldedAuthState,
  ensureCurrentFirebaseUserStillExists,
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
} from '@/app/lib/auth';
import { auth } from '@/app/lib/firebase';
import { buildDashboardUrl, buildOnboardingUrl } from '@/app/lib/holded-navigation';
import { mintSessionCookie } from '@/app/lib/serverSession';

const HOLDED_SITE_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';
const ISAAK_SITE_URL = process.env.NEXT_PUBLIC_ISAAK_SITE_URL || 'https://isaak.verifactu.business';
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'soporte@verifactu.business';

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
  const [rememberDevice, setRememberDevice] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const hydrateExistingUser = async () => {
      if (isRegisterMode) {
        await resetHoldedAuthState();
        if (!cancelled) setExistingUserChecking(false);
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
    };
  }, [isRegisterMode, postLoginTarget, rememberDevice]);

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

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
      router.push(
        `/gracias?step=check-email&email=${encodeURIComponent(email)}&source=${encodeURIComponent(source)}`
      );
      return;
    }

    try {
      const result = await signInWithEmail(email, password, { rememberDevice });
      if (result.error) {
        setError(result.error.userMessage);
        return;
      }

      await activateSessionAndRedirect(result.user, rememberDevice, postLoginTarget);
    } catch {
      setError('No hemos podido iniciar tu acceso. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await signInWithGoogle({ rememberDevice });
      if (result.error) {
        setError(result.error.userMessage);
        return;
      }

      await activateSessionAndRedirect(result.user, rememberDevice, postLoginTarget);
    } catch {
      setError('No hemos podido continuar con Google. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_48%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-4 flex items-center justify-between gap-3 text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-semibold text-[#ff5460] hover:text-[#ef4654]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Holded
          </Link>
          <a
            href={HOLDED_SITE_URL}
            className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 hover:text-slate-600"
          >
            holded.verifactu.business
          </a>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-[#ff5460]/15 bg-white shadow-[0_32px_90px_-48px_rgba(255,84,96,0.35)]">
          <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_100%)] px-6 pb-5 pt-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Isaak para Holded"
                width={52}
                height={52}
                className="h-[52px] w-[52px] object-contain"
                priority
              />
            </div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#ff5460]">
              Isaak para Holded
            </div>
            <h1 className="mt-4 text-[1.65rem] font-bold tracking-tight text-slate-950">
              Entra y termina tu alta
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Accedes ahora y en el siguiente paso conectas tu API key de Holded.
            </p>
          </div>

          <div className="space-y-5 px-6 py-6">
            {existingUserChecking ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#ff5460]" />
                <p className="mt-3 text-sm font-semibold text-slate-900">Preparando tu acceso</p>
                <p className="mt-1 text-sm text-slate-600">
                  Estamos recuperando tu sesion para continuar.
                </p>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </div>
            ) : null}

            {allowGoogleLogin ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={isLoading || existingUserChecking}
                  className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
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
                  {isLoading ? 'Abriendo Google...' : 'Continuar con Google'}
                </button>
              </div>
            ) : null}

            <div className={`relative ${allowGoogleLogin ? 'pt-1' : ''}`}>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                <span className="bg-white px-3">
                  {allowGoogleLogin ? 'o entra con email' : 'acceso por email'}
                </span>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
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
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                  />
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-slate-800">
                  Correo electronico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  required
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                />
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                Usa el mismo correo que tienes registrado en Holded.
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
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    Lo dejamos preparado para soporte por WhatsApp y avisos de Isaak mas adelante.
                  </p>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-semibold text-slate-800">
                  Contrasena
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Tu contrasena"
                  autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                  required
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                />
              </div>

              {isRegisterMode ? (
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-800">
                    Repite la contrasena
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repite tu contrasena"
                    autoComplete="new-password"
                    required
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                  />
                </div>
              ) : null}

              {isRegisterMode ? (
                <label className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
                  <input
                    type="checkbox"
                    checked={acceptLegal}
                    onChange={(event) => setAcceptLegal(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#ff5460] focus:ring-[#ff5460]"
                  />
                  <span>
                    Acepto los{' '}
                    <Link
                      href="/terms"
                      className="font-semibold text-[#ff5460] hover:text-[#ef4654]"
                    >
                      terminos y condiciones
                    </Link>{' '}
                    y la{' '}
                    <Link
                      href="/privacy"
                      className="font-semibold text-[#ff5460] hover:text-[#ef4654]"
                    >
                      politica de privacidad
                    </Link>
                    .
                  </span>
                </label>
              ) : null}

              {isRegisterMode ? (
                <label className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700">
                  <input
                    type="checkbox"
                    checked={acceptMarketing}
                    onChange={(event) => setAcceptMarketing(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#ff5460] focus:ring-[#ff5460]"
                  />
                  <span>
                    Acepto recibir comunicaciones sobre novedades, mejoras y funcionalidades de la
                    integracion.
                  </span>
                </label>
              ) : null}

              <label className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(event) => setRememberDevice(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#ff5460] focus:ring-[#ff5460]"
                />
                <span>Recordar sesion en este dispositivo</span>
              </label>

              <button
                type="submit"
                disabled={isLoading || existingUserChecking}
                className="inline-flex w-full items-center justify-center rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading
                  ? isRegisterMode
                    ? 'Creando acceso...'
                    : 'Entrando...'
                  : isRegisterMode
                    ? 'Crear acceso y verificar correo'
                    : 'Entrar y continuar'}
              </button>

              <div className="text-center text-sm text-slate-600">
                {isRegisterMode ? (
                  <Link
                    href={`/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(nextParam)}`}
                    className="font-semibold text-[#ff5460] hover:text-[#ef4654]"
                  >
                    Ya tienes cuenta? Inicia sesion aqui
                  </Link>
                ) : (
                  <Link
                    href={`/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(nextParam)}&mode=register`}
                    className="font-semibold text-[#ff5460] hover:text-[#ef4654]"
                  >
                    No tienes cuenta? Registrate con correo y contrasena
                  </Link>
                )}
              </div>
            </form>

            <p className="text-center text-xs leading-5 text-slate-500">
              Si desmarcas la opcion, la sesion durara menos y tendras que volver a entrar antes.
            </p>

            {isRegisterMode ? (
              <p className="text-center text-xs leading-5 text-slate-500">
                El nombre de empresa no hace falta ponerlo ahora: lo sincronizaremos automaticamente
                desde Holded cuando conectes la API key.
              </p>
            ) : null}

            <p className="text-center text-xs leading-5 text-slate-500">
              Si ya tienes acceso, aqui solo retomamos tu flujo para entrar al onboarding. Si
              necesitas ayuda, escribenos a{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-semibold text-[#ff5460] hover:text-[#ef4654]"
              >
                {SUPPORT_EMAIL}
              </a>
              . Powered by verifactu.business.
              <span className="block pt-2">
                <Link href="/legal" className="font-semibold text-slate-700 hover:text-slate-900">
                  Aviso legal
                </Link>{' '}
                ·{' '}
                <Link href="/cookies" className="font-semibold text-slate-700 hover:text-slate-900">
                  Cookies
                </Link>
              </span>
            </p>
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
        <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_48%,#ffffff_100%)]">
          <Loader2 className="h-6 w-6 animate-spin text-[#ff5460]" />
        </main>
      }
    >
      <HoldedAuthContent />
    </Suspense>
  );
}
