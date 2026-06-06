'use client';

import type { User } from 'firebase/auth';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { signInWithEmail, signInWithGoogle, signInWithMicrosoft } from '../../lib/auth';
import { auth } from '../../lib/firebase';
import { mintSessionCookie } from '../../lib/serverSession';
import { getAppUrl, getIsaakUrl } from '../../lib/urls';

type AuthTab = 'magic' | 'password';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
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

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#F25022" d="M2 2h9v9H2z" />
      <path fill="#7FBA00" d="M13 2h9v9h-9z" />
      <path fill="#00A4EF" d="M2 13h9v9H2z" />
      <path fill="#FFB900" d="M13 13h9v9h-9z" />
    </svg>
  );
}

export default function IsaakAuthPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AuthTab>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [verifyingLink, setVerifyingLink] = useState(false);
  const redirectedRef = useRef(false);

  const appUrl = getAppUrl();
  const source = searchParams?.get('source')?.trim() || 'isaak_auth';
  const nextParam = searchParams?.get('next')?.trim() || '';

  const redirectTarget = (() => {
    if (!nextParam) return `${appUrl}/dashboard/isaak`;
    try {
      const target = new URL(nextParam);
      const appOrigin = new URL(appUrl).origin;
      const isaakOrigin = new URL(getIsaakUrl()).origin;
      if (target.origin === appOrigin || target.origin === isaakOrigin) {
        return target.toString();
      }
      return `${appUrl}/dashboard/isaak`;
    } catch {
      return `${appUrl}/dashboard/isaak`;
    }
  })();

  const buildAuthHref = (pathname: string) => {
    const params = new URLSearchParams();
    params.set('source', source);
    if (nextParam) params.set('next', nextParam);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const handleSessionAndRedirect = React.useCallback(
    async (user: User, preToken?: string) => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      try {
        // Use pre-minted token if available to avoid a second /api/auth/session call
        const token = preToken ?? (await mintSessionCookie(user, { rememberDevice: true })).token;
        const targetUrl = new URL(redirectTarget);
        const isCrossDomain = targetUrl.origin !== window.location.origin;

        if (isCrossDomain && token) {
          const acceptUrl = new URL('/api/auth/accept', targetUrl.origin);
          acceptUrl.searchParams.set('_t', token);
          acceptUrl.searchParams.set(
            'next',
            targetUrl.pathname + targetUrl.search + targetUrl.hash
          );
          window.location.href = acceptUrl.toString();
          return;
        }

        const redirectUrl = `/api/dashboard-redirect?target=${encodeURIComponent(redirectTarget)}`;
        window.location.href = redirectUrl;
      } catch {
        redirectedRef.current = false;
        setError('Sesion iniciada, pero no pudimos activarla. Intentalo de nuevo.');
      }
    },
    [redirectTarget]
  );

  // Removed auto-redirect on cached Firebase session: it sets redirectedRef.current=true
  // before the user clicks Google, blocking handleGoogle's redirect via the same ref.

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!auth || !isSignInWithEmailLink(auth, window.location.href)) return;

    const savedEmail = window.localStorage.getItem('vf_isaak_magic_email') || '';
    if (!savedEmail) {
      setError('No encontramos tu correo guardado. Introduce tu email para verificar el enlace.');
      setTab('magic');
      return;
    }

    setVerifyingLink(true);
    signInWithEmailLink(auth, savedEmail, window.location.href)
      .then(async (result) => {
        window.localStorage.removeItem('vf_isaak_magic_email');
        await handleSessionAndRedirect(result.user as User);
      })
      .catch((err) => {
        setVerifyingLink(false);
        setError(
          err?.code === 'auth/invalid-action-code'
            ? 'El enlace ha caducado o ya fue usado. Solicita uno nuevo.'
            : 'No pudimos verificar el enlace. Solicita uno nuevo.'
        );
      });
  }, [handleSessionAndRedirect]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('source', source);
      if (nextParam) params.set('next', nextParam);
      const continueUrl = `${window.location.origin}/auth/isaak?${params.toString()}`;

      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, continueUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'No pudimos enviar el enlace. Intentalo de nuevo.');
        return;
      }

      window.localStorage.setItem('vf_isaak_magic_email', email);
      setMagicSent(true);
    } catch {
      setError('Error de red. Intentalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signInWithEmail(email, password, { rememberDevice: true });
      if (result.error) {
        setError(result.error.userMessage);
        return;
      }
      if (result.user) {
        await handleSessionAndRedirect(result.user);
      }
    } catch {
      setError('Error al iniciar sesion. Intentalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (isLoading) return;
    setError('');
    try {
      // No loading state here — popup opens immediately, user selects account first
      const result = await signInWithGoogle({ rememberDevice: true });
      if (result.error) {
        setError(result.error.userMessage);
        return;
      }
      if (result.user) {
        // Only show "connecting" state AFTER user selected their Google account
        setIsLoading(true);
        await handleSessionAndRedirect(result.user, result.token);
      }
    } catch {
      setError('Error al acceder con Google. Intentalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoft = async () => {
    if (isLoading) return;
    setError('');
    try {
      const result = await signInWithMicrosoft({ rememberDevice: true });
      if (result.error) {
        setError(result.error.userMessage);
        return;
      }
      if (result.user) {
        setIsLoading(true);
        await handleSessionAndRedirect(result.user, result.token);
      }
    } catch {
      setError('Error al acceder con Microsoft. Intentalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (verifyingLink) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eff6ff_0%,#f8fafc_48%,#ffffff_100%)] px-4 py-6 text-slate-900">
        <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-[26rem] items-center justify-center">
          <section className="w-full overflow-hidden rounded-[2rem] border border-[#2361d8]/15 bg-white px-8 py-9 text-center shadow-[0_30px_90px_-56px_rgba(15,23,42,0.45)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eef5ff]">
              <Sparkles className="h-5 w-5 animate-pulse text-[#2361d8]" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
              Verificando acceso
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Estamos activando tu sesion de Isaak.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eff6ff_0%,#f8fafc_48%,#ffffff_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-7xl items-center justify-center py-6">
        <section className="w-full max-w-[26rem]">
          <div className="overflow-hidden rounded-[2rem] border border-[#2361d8]/15 bg-white shadow-[0_30px_90px_-56px_rgba(15,23,42,0.45)]">
            <div className="px-6 pb-7 pt-7 sm:px-8">
              <div className="text-center">
                <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                  <div className="relative h-9 w-9 overflow-hidden rounded-full bg-[#eef5ff] ring-1 ring-slate-200">
                    <Image
                      src="/Isaak/isaak-avatar-verifactu.png"
                      alt="Isaak"
                      fill
                      sizes="36px"
                      className="object-cover"
                      priority
                    />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-950">Isaak</div>
                    <div className="text-xs text-slate-500">Asistente fiscal</div>
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    href={getIsaakUrl()}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2361d8] underline-offset-4 hover:text-[#1f55c0] hover:underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver al inicio
                  </Link>
                </div>

                <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
                  Acceder a Isaak
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">
                  Entra con correo, Google o Microsoft y continua con tu panel fiscal.
                </p>
              </div>

              {magicSent ? (
                <div className="mt-7 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                    <Mail className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-slate-950">Revisa tu correo</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Hemos enviado un enlace de acceso a{' '}
                    <span className="font-semibold text-slate-950">{email}</span>. Caduca en 10
                    minutos y solo puede usarse una vez.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMagicSent(false)}
                    className="mt-5 text-sm font-semibold text-[#2361d8] underline-offset-4 hover:underline"
                  >
                    Usar otro correo
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setTab('magic')}
                      className={`h-10 rounded-xl text-sm font-semibold transition ${
                        tab === 'magic'
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('password')}
                      className={`h-10 rounded-xl text-sm font-semibold transition ${
                        tab === 'password'
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Contrasena
                    </button>
                  </div>

                  {error ? (
                    <div
                      role="alert"
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"
                    >
                      {error}
                    </div>
                  ) : null}

                  {tab === 'magic' ? (
                    <form onSubmit={handleMagicLink} className="space-y-3">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="isaak-email"
                          className="block text-sm font-medium text-slate-700"
                        >
                          Tu email
                        </label>
                        <input
                          id="isaak-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tu@empresa.com"
                          required
                          autoComplete="email"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#2361d8] focus:outline-none focus:ring-2 focus:ring-[#2361d8]/25"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2361d8] px-4 text-sm font-semibold text-white transition hover:bg-[#1f55c0] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                        {isLoading ? 'Enviando enlace...' : 'Continuar con correo'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handlePassword} className="space-y-3">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="isaak-password-email"
                          className="block text-sm font-medium text-slate-700"
                        >
                          Correo electronico
                        </label>
                        <input
                          id="isaak-password-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tu@empresa.com"
                          required
                          autoComplete="email"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#2361d8] focus:outline-none focus:ring-2 focus:ring-[#2361d8]/25"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor="isaak-password"
                          className="block text-sm font-medium text-slate-700"
                        >
                          Contrasena
                        </label>
                        <input
                          id="isaak-password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimo 8 caracteres"
                          required
                          autoComplete="current-password"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#2361d8] focus:outline-none focus:ring-2 focus:ring-[#2361d8]/25"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2361d8] px-4 text-sm font-semibold text-white transition hover:bg-[#1f55c0] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {isLoading ? 'Accediendo...' : 'Acceder'}
                      </button>
                      <div className="flex items-center justify-between text-xs">
                        <Link
                          href={buildAuthHref('/auth/signup')}
                          className="font-semibold text-[#2361d8] hover:underline"
                        >
                          Crear cuenta
                        </Link>
                        <Link
                          href={buildAuthHref('/auth/forgot-password')}
                          className="font-semibold text-[#2361d8] hover:underline"
                        >
                          Olvidaste tu contrasena?
                        </Link>
                      </div>
                    </form>
                  )}

                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs font-medium text-slate-400">o</span>
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleGoogle}
                      disabled={isLoading}
                      className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <GoogleIcon className="h-5 w-5" />
                      Continuar con Google
                    </button>
                    <button
                      type="button"
                      onClick={handleMicrosoft}
                      disabled={isLoading}
                      className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <MicrosoftIcon className="h-5 w-5" />
                      Continuar con Microsoft 365
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2361d8]" />
                      <span>
                        Protegemos tu sesion con Firebase y cookies firmadas. Puedes salir o volver
                        al inicio cuando quieras.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-slate-500">
                <Link href={getIsaakUrl()} className="hover:text-slate-700 hover:underline">
                  Salir
                </Link>
                <span className="text-slate-300">|</span>
                <a
                  href="https://verifactu.business/legal/terminos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-700 hover:underline"
                >
                  Terminos
                </a>
                <span className="text-slate-300">|</span>
                <a
                  href="https://verifactu.business/legal/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-700 hover:underline"
                >
                  Privacidad
                </a>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-center text-xs leading-5 text-slate-500 sm:px-8">
              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />
              Acceso preparado para Isaak, verifactu.business y app.verifactu.business.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
