"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AuthLayout, FormInput, PasswordInput } from "../../components/AuthComponents";
import { useAuth } from "../../context/AuthContext";
import { signUpWithEmail, signInWithGoogle, signInWithMicrosoft } from "../../lib/auth";
import { getAppUrl, getClientUrl } from "../../lib/urls";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const appUrl = getAppUrl();
  const clientUrl = getClientUrl();
  const source = searchParams?.get("source")?.trim() || "";
  const nextParam = searchParams?.get("next")?.trim() || "";
  const holdedSiteUrl = process.env.NEXT_PUBLIC_HOLDED_SITE_URL || "https://holded.verifactu.business";
  const holdedMode =
    source.startsWith("holded") ||
    nextParam.includes("/onboarding/holded") ||
    nextParam.includes("holded.verifactu.business");
  const buildAuthHref = (pathname: string) => {
    const params = new URLSearchParams();
    if (nextParam) params.set("next", nextParam);
    if (source) params.set("source", source);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  const redirectTarget = (() => {
    if (!nextParam) return `${appUrl}/demo`;
    try {
      const target = new URL(nextParam);
      const appOrigin = new URL(appUrl).origin;
      const clientOrigin = new URL(clientUrl).origin;
      const allowedOrigins = new Set([appOrigin, clientOrigin]);
      if (!allowedOrigins.has(target.origin)) {
        return `${appUrl}/demo`;
      }
      return target.toString();
    } catch {
      return `${appUrl}/demo`;
    }
  })();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  React.useEffect(() => {
    if (user) {
      window.location.href = redirectTarget;
    }
  }, [user, redirectTarget]);

  const validateForm = () => {
    setError("");
    setPasswordError("");

    if (password.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres");
      return false;
    }

    if (password !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return false;
    }

    if (!agreeTerms) {
      setError("Debes aceptar los terminos y condiciones");
      return false;
    }

    return true;
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signUpWithEmail(email, password);

      if (result.error) {
        setError(result.error.userMessage);
        return;
      }

      router.push(buildAuthHref("/auth/verify-email"));
    } catch (err) {
      setError("Error al registrarse. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await signInWithGoogle();

      if (result.error) {
        setError(result.error.userMessage);
        return;
      }

      window.location.href = redirectTarget;
    } catch (err) {
      setError("Error al registrarse con Google. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignup = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await signInWithMicrosoft();

      if (result.error) {
        setError(result.error.userMessage);
        return;
      }

      window.location.href = redirectTarget;
    } catch (err) {
      setError("Error al registrarse con Microsoft. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={holdedMode ? "Crea tu cuenta para conectar Holded" : "Crea tu cuenta"}
      subtitle={
        holdedMode
          ? "Crea tu cuenta y conectamos Holded en el siguiente paso."
          : "Crea tu cuenta en menos de un minuto."
      }
      footerText="Ya tienes cuenta?"
      footerLink={{ href: buildAuthHref("/auth/login"), label: "Inicia sesion aqui" }}
      brandMode={holdedMode ? "holded" : "default"}
      backHref={holdedMode ? holdedSiteUrl : undefined}
      backLabel={holdedMode ? "Volver a Holded" : undefined}
      compact
      showSecurityCard={!holdedMode}
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleGoogleSignup}
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
          {isLoading ? "Abriendo Google..." : "Continuar con Google"}
        </button>

        <button
          type="button"
          onClick={handleMicrosoftSignup}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#F25022" d="M2 2h9v9H2z" />
            <path fill="#7FBA00" d="M13 2h9v9h-9z" />
            <path fill="#00A4EF" d="M2 13h9v9H2z" />
            <path fill="#FFB900" d="M13 13h9v9h-9z" />
          </svg>
          {isLoading ? "Abriendo Microsoft..." : "Continuar con Microsoft 365"}
        </button>
      </div>

      <div className="relative pt-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">O crea cuenta con email y contraseña</span>
        </div>
      </div>

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
            Contraseña <span className="text-red-500">*</span>
          </label>
          <PasswordInput
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError("");
            }}
            placeholder="Minimo 8 caracteres"
            required
          />
          {passwordError && <p className="mt-1 text-sm text-red-500">{passwordError}</p>}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Confirmar contraseña <span className="text-red-500">*</span>
          </label>
          <PasswordInput
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setPasswordError("");
            }}
            placeholder="Repite tu contraseña"
            required
          />
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => {
              setAgreeTerms(e.target.checked);
              setError("");
            }}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-[#2361d8] focus:ring-[#2361d8]"
          />
          <span className="text-gray-600">
            Acepto los{" "}
            <Link
              href="/legal/terminos"
              className="font-medium text-[#2361d8] hover:text-[#2361d8]"
              aria-label="Leer terminos y condiciones"
            >
              terminos y condiciones
            </Link>{" "}
            y la{" "}
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
          className={`w-full rounded-full py-3 font-semibold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-50 ${
            holdedMode ? "bg-[#ff5460] hover:bg-[#ef4654]" : "bg-[#2361d8] hover:bg-[#1f55c0]"
          }`}
        >
          {isLoading ? "Creando cuenta..." : "Crear cuenta con email"}
        </button>
      </motion.form>
    </AuthLayout>
  );
}


