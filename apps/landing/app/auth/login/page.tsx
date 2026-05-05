'use client';

import type { User } from 'firebase/auth';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useRef, useState } from 'react';
import { AuthLayout, FormInput, PasswordInput } from '../../components/AuthComponents';
import { AuthOAuthButtons } from '../../components/AuthOAuthButtons';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { signInWithEmail, signInWithGoogle, signInWithMicrosoft } from '../../lib/auth';
import { mintSessionCookie } from '../../lib/serverSession';
import { getAppUrl, getClientUrl } from '../../lib/urls';
import { resolveSafeRedirect } from '@verifactu/utils';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mintError, setMintError] = useState(false);
  const [authLoadingTimedOut, setAuthLoadingTimedOut] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem('vf_remember_device');
    if (stored === null) return true;
    return stored === 'true';
  });
  const hasRedirected = useRef(false);

  const appUrl = getAppUrl();
  const clientUrl = getClientUrl();
  const reportInvalidNext = (reason: string, value: string) => {
    try {
      const payload = JSON.stringify({
        reason,
        nextParam: value,
        appUrl,
        ts: new Date().toISOString(),
      });
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        navigator.sendBeacon('/api/auth/log-next', payload);
        return;
      }
      fetch('/api/auth/log-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }).catch(() => {});
    } catch {
      // Best-effort logging only
    }
  };

  const source = searchParams?.get('source')?.trim() || '';
  const nextParam = searchParams?.get('next')?.trim() || '';
  const holdedSiteUrl =
    process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';
  const holdedMode =
    source.startsWith('holded') ||
    nextParam.includes('/onboarding/holded') ||
    nextParam.includes('holded.verifactu.business');
  const buildAuthHref = (pathname: string) => {
    const params = new URLSearchParams();
    if (nextParam) params.set('next', nextParam);
    if (source) params.set('source', source);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  const redirectTarget = resolveSafeRedirect(
    nextParam,
    `${appUrl}/dashboard/isaak`,
    [appUrl, clientUrl],
    reportInvalidNext
  );

  const redirectToDashboard = React.useCallback(() => {
    try {
      const targetUrl = new URL(redirectTarget);
      const redirectUrl = `/api/dashboard-redirect?target=${encodeURIComponent(
        targetUrl.toString()
      )}`;
      window.location.href = redirectUrl;
    } catch {
      window.location.href = '/api/dashboard-redirect?target=%2Fdashboard%2Fisaak';
    }
  }, [redirectTarget]);

  React.useEffect(() => {
    if (!authLoading && user && !hasRedirected.current) {
      mintSessionCookie(user as User, { rememberDevice })
        .then(() => {
          hasRedirected.current = true;
          redirectToDashboard();
        })
        .catch(() => {
          hasRedirected.current = false;
          setMintError(true);
        });
    }
  }, [user, authLoading, redirectToDashboard, rememberDevice]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('vf_remember_device', String(rememberDevice));
  }, [rememberDevice]);

  React.useEffect(() => {
    if (!authLoading) {
      setAuthLoadingTimedOut(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setAuthLoadingTimedOut(true);
    }, 10000);

    return () => window.clearTimeout(timeout);
  }, [authLoading]);

  if (authLoading) {
    if (holdedMode) {
      return (
        <div className="min-h-screen bg-white px-4 py-10 text-black sm:px-6 lg:px-8">
          <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
            <div className="w-full rounded-[30px] border border-neutral-200 bg-white p-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-10">
              <div className="flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                  <Image
                    src="/brand/holded/holded-diamond-logo.png"
                    alt="Isaak for Holded"
                    width={52}
                    height={52}
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Isaak for Holded
              </div>

              <h1 className="mt-5 text-2xl font-bold tracking-tight text-black sm:text-3xl">
                Preparando tu conexión
              </h1>

              {!authLoadingTimedOut ? (
                <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-neutral-600 sm:text-base">
                  Estamos validando tu acceso para continuar con la conexión de Holded.
                </p>
              ) : (
                <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-amber-700 sm:text-base">
                  Está tardando más de lo normal. Puedes recargar para reintentar.
                </p>
              )}

              <div className="mx-auto mt-8 h-2 w-28 overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full w-1/2 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-neutral-700" />
              </div>

              {authLoadingTimedOut ? (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-5 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Recargar
                </button>
              ) : (
                <p className="mt-4 text-xs text-neutral-500">Cargando...</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#2361d8]/5">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-[#2361d8]"></div>
          <p className="mt-4 text-sm font-semibold text-slate-900">Cargando tu acceso...</p>
          {!authLoadingTimedOut ? (
            <p className="mt-1 text-sm text-gray-600">
              En unos segundos continuamos con la conexión.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-amber-700">
                Está tardando más de lo normal. Puedes recargar para reintentar.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Recargar
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (user) {
    if (holdedMode && !mintError) {
      return (
        <div className="min-h-screen bg-white px-4 py-10 text-black sm:px-6 lg:px-8">
          <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
            <div className="w-full rounded-[30px] border border-neutral-200 bg-white p-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-10">
              <div className="flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                  <Image
                    src="/brand/holded/holded-diamond-logo.png"
                    alt="Isaak for Holded"
                    width={52}
                    height={52}
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Isaak for Holded
              </div>

              <h1 className="mt-5 text-2xl font-bold tracking-tight text-black sm:text-3xl">
                Conectando tu espacio
              </h1>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-neutral-600 sm:text-base">
                Todo listo. En unos segundos entrarás al paso de conexión con Holded.
              </p>

              <div className="mx-auto mt-8 h-2 w-28 overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full w-1/2 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-neutral-700" />
              </div>

              <p className="mt-4 text-xs text-neutral-500">Redirigiendo...</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#2361d8]/5">
        <div className="text-center">
          {mintError ? (
            <>
              <p className="mt-4 text-red-600">
                Error al iniciar sesión. Por favor, recarga e inténtalo de nuevo.
              </p>
              <button
                className="mt-4 text-[#2361d8] underline text-sm"
                onClick={() => {
                  setMintError(false);
                  hasRedirected.current = false;
                  mintSessionCookie(user as User, { rememberDevice })
                    .then(() => {
                      hasRedirected.current = true;
                      redirectToDashboard();
                    })
                    .catch(() => setMintError(true));
                }}
              >
                Reintentar
              </button>
            </>
          ) : (
            <>
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[#2361d8]"></div>
              <p className="mt-4 text-gray-600">Redirigiendo...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signInWithEmail(email, password, { rememberDevice });

      if (result.error) {
        setError(result.error.userMessage);
        showToast({ type: 'error', title: 'Error', message: result.error.userMessage });
        return;
      }

      showToast({ type: 'success', title: 'Bienvenido', message: 'Inicio de sesion correcto' });
    } catch (err) {
      setError('Error al iniciar sesion. Intenta de nuevo.');
      showToast({ type: 'error', title: 'Error', message: 'Error al iniciar sesion' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await signInWithGoogle({ rememberDevice });

      if (result.error) {
        setError(result.error.userMessage);
        showToast({ type: 'error', title: 'Error', message: result.error.userMessage });
        return;
      }

      showToast({ type: 'success', title: 'Bienvenido', message: 'Inicio de sesion con Google' });
    } catch (err) {
      setError('Error al iniciar sesion con Google. Intenta de nuevo.');
      showToast({ type: 'error', title: 'Error', message: 'Error al iniciar sesion con Google' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await signInWithMicrosoft({ rememberDevice });

      if (result.error) {
        setError(result.error.userMessage);
        showToast({ type: 'error', title: 'Error', message: result.error.userMessage });
        return;
      }

      showToast({
        type: 'success',
        title: 'Bienvenido',
        message: 'Inicio de sesion con Microsoft',
      });
    } catch (err) {
      setError('Error al iniciar sesion con Microsoft. Intenta de nuevo.');
      showToast({ type: 'error', title: 'Error', message: 'Error al iniciar sesion' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={holdedMode ? 'Inicia sesion para conectar Holded' : 'Inicia sesion'}
      subtitle={
        holdedMode
          ? 'Accede ahora y en el siguiente paso conectas Holded.'
          : 'Accede a tu cuenta en segundos.'
      }
      footerText={'No tienes cuenta?'}
      footerLink={{ href: buildAuthHref('/auth/signup'), label: 'Registrate aqui' }}
      brandMode={holdedMode ? 'holded' : 'default'}
      backHref={holdedMode ? holdedSiteUrl : undefined}
      backLabel={holdedMode ? 'Volver a Holded' : undefined}
      compact
      showSecurityCard={!holdedMode}
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <AuthOAuthButtons
        onGoogle={handleGoogleLogin}
        onMicrosoft={handleMicrosoftLogin}
        isLoading={isLoading}
        dividerText="O entra con email y contraseña"
      />

      <motion.form
        onSubmit={handleEmailLogin}
        className="space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <FormInput
          label="Correo electronico"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <Link
              href={buildAuthHref('/auth/forgot-password')}
              className={`text-sm font-medium ${
                holdedMode
                  ? 'text-[#ff5460] hover:text-[#ef4654]'
                  : 'text-[#2361d8] hover:text-[#1f55c0]'
              }`}
            >
              La olvidaste?
            </Link>
          </div>
          <PasswordInput
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            required
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(e) => setRememberDevice(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#2361d8] focus:ring-[#2361d8]"
          />
          Recordar este dispositivo
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full rounded-full py-3 font-semibold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-50 ${
            holdedMode ? 'bg-[#ff5460] hover:bg-[#ef4654]' : 'bg-[#2361d8] hover:bg-[#1f55c0]'
          }`}
        >
          {isLoading ? 'Iniciando sesion...' : 'Continuar con email'}
        </button>
      </motion.form>
    </AuthLayout>
  );
}
