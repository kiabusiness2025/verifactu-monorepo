'use client';

import type { User } from 'firebase/auth';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import Image from 'next/image';
import { ArrowLeft, Mail, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '../../components/Toast';
import { signInWithEmail, signInWithGoogle, signInWithMicrosoft } from '../../lib/auth';
import { auth } from '../../lib/firebase';
import { mintSessionCookie } from '../../lib/serverSession';
import { getAppUrl, getIsaakUrl } from '../../lib/urls';

type AuthTab = 'magic' | 'password';

export default function IsaakAuthPage() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const router = useRouter();

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

  const handleSessionAndRedirect = React.useCallback(
    async (user: User) => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      try {
        const { token } = await mintSessionCookie(user, { rememberDevice: true });

        // Cross-domain handoff: if the target is on a different origin (e.g. isaak.app),
        // the __session cookie set here won't be sent there. Pass the JWT via URL so
        // the target app can set its own cookie.
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
        setError('Sesión iniciada pero no pudimos activarla. Inténtalo de nuevo.');
      }
    },
    [redirectTarget]
  );

  // Auto-redirect if already logged in
  useEffect(() => {
    if (auth?.currentUser && !redirectedRef.current) {
      void handleSessionAndRedirect(auth.currentUser as User);
    }
  }, [handleSessionAndRedirect]);

  // Verify magic link on page load (when arriving from email)
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
      if (nextParam) params.set('next', nextParam);
      params.set('source', source);
      const continueUrl = `${window.location.origin}/auth/isaak?${params.toString()}`;

      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, continueUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'No pudimos enviar el enlace. Inténtalo de nuevo.');
        return;
      }

      window.localStorage.setItem('vf_isaak_magic_email', email);
      setMagicSent(true);
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
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
      if (auth?.currentUser) {
        await handleSessionAndRedirect(auth.currentUser as User);
      }
    } catch {
      setError('Error al iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await signInWithGoogle({ rememberDevice: true });
      if (result.error) {
        setError(result.error.userMessage);
        return;
      }
      if (auth?.currentUser) {
        await handleSessionAndRedirect(auth.currentUser as User);
      }
    } catch {
      setError('Error al acceder con Google. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoft = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await signInWithMicrosoft({ rememberDevice: true });
      if (result.error) {
        setError(result.error.userMessage);
        return;
      }
      if (auth?.currentUser) {
        await handleSessionAndRedirect(auth.currentUser as User);
      }
    } catch {
      setError('Error al acceder con Microsoft. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (verifyingLink) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1a40] px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#2361d8]/20">
            <Sparkles className="h-6 w-6 animate-pulse text-[#2361d8]" />
          </div>
          <p className="text-sm text-slate-300">Verificando tu enlace de acceso…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b1a40] px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Back link — vuelve a la home de Isaak (isaak.app o el dominio configurado),
            NO a verifactu.business. El usuario aterrizó aquí desde Isaak. */}
        <Link
          href={getIsaakUrl()}
          className="mb-6 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        {/* Logo + title */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative h-16 w-16 overflow-hidden rounded-full shadow-xl ring-2 ring-white/20">
            <Image
              src="/Isaak/isaak-avatar-verifactu.png"
              alt="Isaak"
              fill
              sizes="64px"
              className="object-cover"
              priority
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">Acceder a Isaak</h1>
            <p className="mt-1 text-sm text-slate-400">Tu asistente fiscal inteligente</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          {magicSent ? (
            /* Magic link sent */
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                <Mail className="h-6 w-6 text-emerald-400" />
              </div>
              <h2 className="text-base font-semibold text-white">Revisa tu correo</h2>
              <p className="mt-2 text-sm text-slate-400">
                Hemos enviado un enlace de acceso a{' '}
                <span className="font-medium text-white">{email}</span>.
                <br />
                El enlace caduca en 10 minutos.
              </p>
              <button
                type="button"
                onClick={() => setMagicSent(false)}
                className="mt-5 text-sm text-slate-500 hover:text-slate-400 underline"
              >
                Usar otro correo
              </button>
            </div>
          ) : (
            <>
              {/* Tab selector */}
              <div className="mb-5 flex rounded-xl bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setTab('magic')}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    tab === 'magic'
                      ? 'bg-[#2361d8] text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Entrar con email
                </button>
                <button
                  type="button"
                  onClick={() => setTab('password')}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    tab === 'password'
                      ? 'bg-[#2361d8] text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Contraseña
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {tab === 'magic' ? (
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      Tu correo electrónico
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@empresa.com"
                      required
                      autoComplete="email"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-[#2361d8]/50 focus:outline-none focus:ring-1 focus:ring-[#2361d8]/50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2361d8] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1d55c2] disabled:opacity-50"
                  >
                    <Mail className="h-4 w-4" />
                    {isLoading ? 'Enviando…' : 'Enviar enlace de acceso'}
                  </button>
                  <p className="text-center text-xs text-slate-600">
                    Sin contraseña. Recibirás un enlace directo en tu correo.
                  </p>
                </form>
              ) : (
                <form onSubmit={handlePassword} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@empresa.com"
                      required
                      autoComplete="email"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-[#2361d8]/50 focus:outline-none focus:ring-1 focus:ring-[#2361d8]/50"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-[#2361d8]/50 focus:outline-none focus:ring-1 focus:ring-[#2361d8]/50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2361d8] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1d55c2] disabled:opacity-50"
                  >
                    {isLoading ? 'Accediendo…' : 'Acceder'}
                  </button>
                  <div className="flex items-center justify-between text-xs">
                    <Link
                      href={(() => {
                        const sp = new URLSearchParams();
                        sp.set('source', source);
                        if (nextParam) sp.set('next', nextParam);
                        return `/auth/signup?${sp.toString()}`;
                      })()}
                      className="text-slate-500 hover:text-slate-400 underline"
                    >
                      Crear cuenta
                    </Link>
                    <Link
                      href="/auth/forgot-password"
                      className="text-slate-500 hover:text-slate-400 underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                </form>
              )}

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-slate-600">o</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
              >
                <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
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
                Continuar con Google
              </button>

              {/* Microsoft */}
              <button
                type="button"
                onClick={handleMicrosoft}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
              >
                <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 23 23" aria-hidden="true">
                  <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                  <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
                  <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
                  <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
                </svg>
                Continuar con Microsoft
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-700">
          Al acceder aceptas los{' '}
          <a
            href="https://verifactu.business/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-500 underline"
          >
            términos de uso
          </a>{' '}
          y la{' '}
          <a
            href="https://verifactu.business/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-500 underline"
          >
            política de privacidad
          </a>
          .
        </p>
      </div>
    </div>
  );
}
