'use client';

import type { User } from 'firebase/auth';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { AuthLayout, FormInput, PasswordInput } from '../../components/AuthComponents';
import { useToast } from '../../components/Toast';
import { signInWithEmail, signInWithGoogle } from '../../lib/auth';
import { auth } from '../../lib/firebase';
import { mintSessionCookie } from '../../lib/serverSession';
import { getAppUrl, getClientUrl } from '../../lib/urls';

const HOLDED_SITE_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';

export default function HoldedAuthPage() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingUserChecking, setExistingUserChecking] = useState(true);
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

  const redirectTarget = (() => {
    if (!nextParam) return `${appUrl}/onboarding/holded?channel=chatgpt&source=${source}`;
    try {
      const target = new URL(nextParam);
      const appOrigin = new URL(appUrl).origin;
      const clientOrigin = new URL(clientUrl).origin;
      const allowedOrigins = new Set([appOrigin, clientOrigin]);
      if (!allowedOrigins.has(target.origin)) {
        return `${appUrl}/onboarding/holded?channel=chatgpt&source=${source}`;
      }
      return target.toString();
    } catch {
      return `${appUrl}/onboarding/holded?channel=chatgpt&source=${source}`;
    }
  })();

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

  useEffect(() => {
    const stored = window.localStorage.getItem('vf_remember_device');
    if (stored === null) {
      setRememberDevice(true);
    } else {
      setRememberDevice(stored === 'true');
    }
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

      try {
        redirectedRef.current = true;
        await mintSessionCookie(auth.currentUser as User, { rememberDevice });
        redirectWithSession();
      } catch {
        redirectedRef.current = false;
        if (!cancelled) {
          setExistingUserChecking(false);
          setError(
            'Hemos detectado tu sesión, pero no hemos podido activarla. Reintenta para continuar.'
          );
        }
      }
    };

    void hydrateExistingUser();
    return () => {
      cancelled = true;
    };
  }, [rememberDevice, redirectWithSession]);

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signInWithEmail(email, password, { rememberDevice });
      if (result.error) {
        setError(result.error.userMessage);
        showToast({ type: 'error', title: 'Error', message: result.error.userMessage });
        return;
      }
      redirectWithSession();
    } catch {
      setError('Error al iniciar sesión. Intenta de nuevo.');
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
        showToast({ type: 'error', title: 'Error', message: result.error.userMessage });
        return;
      }
      redirectWithSession();
    } catch {
      setError('Error al iniciar sesión con Google. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (existingUserChecking) {
    return (
      <AuthLayout
        title="Preparando tu conexión"
        subtitle="Estamos activando tu acceso para continuar con Holded."
        brandMode="holded"
        backHref={HOLDED_SITE_URL}
        backLabel="Volver a Holded"
        compact
        showSecurityCard={false}
      >
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-[#ff5460]" />
          <p className="mt-4 text-sm text-neutral-600">Cargando tu acceso...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Accede para conectar Holded"
      subtitle="Entras ahora y en el siguiente paso terminas la conexion con Holded."
      brandMode="holded"
      backHref={HOLDED_SITE_URL}
      backLabel="Volver a Holded"
      compact
      showSecurityCard={false}
      footerText="¿No tienes cuenta?"
      footerLink={{ href: buildAuthHref('/auth/signup'), label: 'Regístrate aquí' }}
    >
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
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

      <div className="relative pt-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">O entra con email y contraseña</span>
        </div>
      </div>

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <FormInput
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@email.com"
          required
        />

        <PasswordInput
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(event) => setRememberDevice(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#ff5460] focus:ring-[#ff5460]"
          />
          Recordar este dispositivo
        </label>

        <div className="flex items-center justify-between">
          <Link
            href={buildAuthHref('/auth/forgot-password')}
            className="text-sm font-medium text-[#ff5460] hover:text-[#ef4654]"
          >
            ¿La olvidaste?
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-full bg-[#ff5460] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
