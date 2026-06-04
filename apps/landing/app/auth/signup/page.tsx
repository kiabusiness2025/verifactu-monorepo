'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AuthLayout, FormInput, PasswordInput } from '../../components/AuthComponents';
import { AuthOAuthButtons } from '../../components/AuthOAuthButtons';
import { useAuth } from '../../context/AuthContext';
import { signUpWithEmail, signInWithGoogle, signInWithMicrosoft } from '../../lib/auth';
import { getAppUrl, getClientUrl } from '../../lib/urls';
import { resolveSafeRedirect } from '@verifactu/utils';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const appUrl = getAppUrl();
  const clientUrl = getClientUrl();
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
  const redirectTarget = resolveSafeRedirect(nextParam, `${appUrl}/demo`, [appUrl, clientUrl]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  React.useEffect(() => {
    if (user) {
      window.location.href = redirectTarget;
    }
  }, [user, redirectTarget]);

  const validateForm = () => {
    setError('');
    setPasswordError('');

    if (password.length < 8) {
      setPasswordError('La contrasena debe tener al menos 8 caracteres');
      return false;
    }

    if (password !== confirmPassword) {
      setPasswordError('Las contrasenas no coinciden');
      return false;
    }

    if (!agreeTerms) {
      setError('Debes aceptar los terminos y condiciones');
      return false;
    }

    return true;
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signUpWithEmail(email, password);

      if (result.error) {
        setError(result.error.userMessage);
        return;
      }

      router.push(buildAuthHref('/auth/verify-email'));
    } catch (err) {
      setError('Error al registrarse. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await signInWithGoogle();

      if (result.error) {
        setError(result.error.userMessage);
        return;
      }

      window.location.href = redirectTarget;
    } catch (err) {
      setError('Error al registrarse con Google. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignup = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await signInWithMicrosoft();

      if (result.error) {
        setError(result.error.userMessage);
        return;
      }

      window.location.href = redirectTarget;
    } catch (err) {
      setError('Error al registrarse con Microsoft. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={holdedMode ? 'Crea tu cuenta para conectar Holded' : 'Crea tu cuenta'}
      subtitle={
        holdedMode
          ? 'Crea tu cuenta y conectamos Holded en el siguiente paso.'
          : 'Crea tu cuenta en menos de un minuto.'
      }
      footerText="Ya tienes cuenta?"
      footerLink={{ href: buildAuthHref('/auth/login'), label: 'Inicia sesion aqui' }}
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
        onGoogle={handleGoogleSignup}
        onMicrosoft={handleMicrosoftSignup}
        isLoading={isLoading}
        dividerText="O crea cuenta con email y contrasena"
      />

      <motion.form
        onSubmit={handleEmailSignup}
        className="space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <FormInput
          label="Nombre completo"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Juan Perez"
          required
        />

        <FormInput
          label="Correo electronico"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Contrasena <span className="text-red-500">*</span>
          </label>
          <PasswordInput
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError('');
            }}
            placeholder="Minimo 8 caracteres"
            required
          />
          {passwordError && <p className="mt-1 text-sm text-red-500">{passwordError}</p>}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Confirmar contrasena <span className="text-red-500">*</span>
          </label>
          <PasswordInput
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setPasswordError('');
            }}
            placeholder="Repite tu contrasena"
            required
          />
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => {
              setAgreeTerms(e.target.checked);
              setError('');
            }}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-[#2361d8] focus:ring-[#2361d8]"
          />
          <span className="text-gray-600">
            Acepto los{' '}
            <Link
              href="/legal/terminos"
              className="font-medium text-[#2361d8] hover:text-[#2361d8]"
              aria-label="Leer terminos y condiciones"
            >
              terminos y condiciones
            </Link>{' '}
            y la{' '}
            <Link
              href="/legal/privacidad"
              className="font-medium text-[#2361d8] hover:text-[#2361d8]"
              aria-label="Leer politica de privacidad"
            >
              politica de privacidad
            </Link>
          </span>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className={`h-12 w-full rounded-2xl text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
            holdedMode ? 'bg-[#ff5460] hover:bg-[#ef4654]' : 'bg-[#2361d8] hover:bg-[#1f55c0]'
          }`}
        >
          {isLoading ? 'Creando cuenta...' : 'Crear cuenta con email'}
        </button>
      </motion.form>
    </AuthLayout>
  );
}
