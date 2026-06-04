'use client';

import type { User } from 'firebase/auth';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { AuthLayout } from '../../components/AuthComponents';
import { useToast } from '../../components/Toast';
import { signInWithGoogle } from '../../lib/auth';
import { auth } from '../../lib/firebase';
import { mintSessionCookie } from '../../lib/serverSession';
import { getAppUrl, getClientUrl } from '../../lib/urls';
import { resolveSafeRedirect } from '@verifactu/utils';

const HOLDED_SITE_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';

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

export default function HoldedAuthPage() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingUserChecking, setExistingUserChecking] = useState(true);
  const [magicSentTo, setMagicSentTo] = useState<string | null>(null);
  const [verifyingLink, setVerifyingLink] = useState(false);
  const redirectedRef = useRef(false);

  const appUrl = getAppUrl();
  const clientUrl = getClientUrl();
  const source = searchParams?.get('source')?.trim() || 'holded_login';
  const nextParam = searchParams?.get('next')?.trim() || '';

  const buildAuthHref = (pathname: string) => {
    const params = new URLSearchParams();
    if (nextParam) params.set('next', nextParam);
    if (source) params.set('source', source);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const redirectTarget = resolveSafeRedirect(
    nextParam,
    `${appUrl}/onboarding/holded?channel=chatgpt&source=${source}`,
    [appUrl, clientUrl]
  );

  const redirectWithSession = React.useCallback(() => {
    try {
      const targetUrl = new URL(redirectTarget);
      const redirectUrl = `/api/dashboard-redirect?target=${encodeURIComponent(
        targetUrl.toString()
      )}`;
      window.location.href = redirectUrl;
    } catch {
      window.location.href = '/api/dashboard-redirect?target=%2Fonboarding%2Fholded';
    }
  }, [redirectTarget]);

  const activateAndRedirect = React.useCallback(
    async (user: User) => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      try {
        await mintSessionCookie(user, { rememberDevice });
        redirectWithSession();
      } catch {
        redirectedRef.current = false;
        setExistingUserChecking(false);
        setVerifyingLink(false);
        setError('Hemos validado el acceso, pero no pudimos activar la sesion.');
      }
    },
    [redirectWithSession, rememberDevice]
  );

  useEffect(() => {
    const stored = window.localStorage.getItem('vf_remember_device');
    setRememberDevice(stored === null ? true : stored === 'true');
  }, []);

  useEffect(() => {
    window.localStorage.setItem('vf_remember_device', String(rememberDevice));
  }, [rememberDevice]);

  useEffect(() => {
    let cancelled = false;

    const hydrateExistingUser = async () => {
      if (!auth?.currentUser || redirectedRef.current) {
        if (!cancelled) setExistingUserChecking(false);
        return;
      }

      await activateAndRedirect(auth.currentUser as User);
      if (!cancelled) setExistingUserChecking(false);
    };

    void hydrateExistingUser();
    return () => {
      cancelled = true;
    };
  }, [activateAndRedirect]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!auth || !isSignInWithEmailLink(auth, window.location.href)) return;

    const savedEmail = window.localStorage.getItem('vf_holded_magic_email') || '';
    if (!savedEmail) {
      setExistingUserChecking(false);
      setError('No encontramos tu correo guardado. Vuelve a solicitar el enlace.');
      return;
    }

    setExistingUserChecking(false);
    setVerifyingLink(true);
    signInWithEmailLink(auth, savedEmail, window.location.href)
      .then(async (result) => {
        window.localStorage.removeItem('vf_holded_magic_email');
        await activateAndRedirect(result.user as User);
      })
      .catch((err) => {
        setVerifyingLink(false);
        setError(
          err?.code === 'auth/invalid-action-code'
            ? 'El enlace ha caducado o ya fue usado. Solicita uno nuevo.'
            : 'No pudimos verificar el enlace. Solicita uno nuevo.'
        );
      });
  }, [activateAndRedirect]);

  const handleGoogle = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await signInWithGoogle({ rememberDevice });
      if (result.error) {
        setError(result.error.userMessage);
        showToast({ type: 'error', title: 'Error', message: result.error.userMessage });
        return;
      }
      if (result.user) await activateAndRedirect(result.user);
    } catch {
      setError('Error al iniciar sesion con Google. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (nextParam) params.set('next', nextParam);
      if (source) params.set('source', source);
      const continueUrl = `${window.location.origin}/auth/holded?${params.toString()}`;

      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, continueUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'No pudimos enviar el enlace. Intenta de nuevo.');
        return;
      }

      window.localStorage.setItem('vf_holded_magic_email', email);
      setMagicSentTo(email);
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (existingUserChecking || verifyingLink) {
    return (
      <AuthLayout
        title={verifyingLink ? 'Verificando enlace' : 'Preparando tu conexion'}
        subtitle={
          verifyingLink
            ? 'Estamos validando tu correo para continuar con Holded.'
            : 'Estamos activando tu acceso para continuar con Holded.'
        }
        brandMode="holded"
        backHref={HOLDED_SITE_URL}
        backLabel="Volver a Holded"
        compact
        showSecurityCard={false}
      >
        <div className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#fff1f2]">
            <Loader2 className="h-5 w-5 animate-spin text-[#ff5460]" />
          </div>
          <p className="mt-4 text-sm text-slate-600">Cargando tu acceso...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Accede para conectar Holded"
      subtitle="Entra con Google o con un enlace de correo. Despues terminamos la conexion con Holded."
      brandMode="holded"
      backHref={HOLDED_SITE_URL}
      backLabel="Volver a Holded"
      compact
      showSecurityCard={false}
      footerText="Prefieres cuenta con contrasena?"
      footerLink={{ href: buildAuthHref('/auth/login'), label: 'Usar login clasico' }}
    >
      {magicSentTo ? (
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-950">Revisa tu correo</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Te hemos enviado un enlace de acceso a{' '}
            <span className="font-semibold text-slate-950">{magicSentTo}</span>. Caduca en 10
            minutos.
          </p>
          <button
            type="button"
            onClick={() => setMagicSentTo(null)}
            className="mt-5 text-sm font-semibold text-[#ff5460] underline-offset-4 hover:underline"
          >
            Usar otro correo
          </button>
        </div>
      ) : (
        <>
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading}
            className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="h-5 w-5" />
            )}
            {isLoading ? 'Abriendo Google...' : 'Continuar con Google'}
          </button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">o</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleMagicLink} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="holded-email" className="block text-sm font-medium text-slate-700">
                Tu email
              </label>
              <input
                id="holded-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@empresa.com"
                required
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/25"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ff5460] px-4 text-sm font-semibold text-white transition hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {isLoading ? 'Enviando enlace...' : 'Continuar con correo'}
            </button>
          </form>

          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(event) => setRememberDevice(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-[#ff5460] focus:ring-[#ff5460]"
            />
            Recordar este dispositivo
          </label>

          <p className="text-center text-xs leading-5 text-slate-500">
            Con correo no necesitas contrasena. Te enviamos un enlace de un solo uso para continuar
            con la conexion.
          </p>

          <div className="text-center text-xs text-slate-500">
            <Link href={buildAuthHref('/auth/signup')} className="font-semibold text-[#ff5460]">
              Crear cuenta nueva
            </Link>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
