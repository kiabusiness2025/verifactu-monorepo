"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AuthLayout, FormInput, PasswordInput } from "../../components/AuthComponents";
import { useAuth } from "../../context/AuthContext";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInWithMicrosoft,
} from "../../lib/auth";
import { mintSessionCookie } from "../../lib/serverSession";
import { useToast } from "../../components/Toast";
import { getAppUrl } from "../../lib/urls";
import type { User } from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [passwordError, setPasswordError] = useState("");
  const hasRedirected = useRef(false);

  const appUrl = getAppUrl();
  const reportInvalidNext = (reason: string, value: string) => {
    try {
      const payload = JSON.stringify({
        reason,
        nextParam: value,
        appUrl,
        ts: new Date().toISOString(),
      });
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        navigator.sendBeacon("/api/auth/log-next", payload);
        return;
      }
      fetch("/api/auth/log-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).catch(() => {});
    } catch {
      // Best-effort logging only
    }
  };

  const nextParam = searchParams?.get("next")?.trim() || "";
  const redirectTarget = (() => {
    if (!nextParam) return `${appUrl}/dashboard`;
    try {
      const target = new URL(nextParam);
      const appOrigin = new URL(appUrl).origin;
      if (target.origin !== appOrigin) {
        reportInvalidNext("cross-origin", nextParam);
        return `${appUrl}/dashboard`;
      }
      return target.toString();
    } catch {
      reportInvalidNext("malformed", nextParam);
      return `${appUrl}/dashboard`;
    }
  })();

  const redirectToDashboard = React.useCallback(() => {
    window.location.href = redirectTarget;
  }, [redirectTarget]);

  React.useEffect(() => {
    if (!authLoading && user && !hasRedirected.current) {
      mintSessionCookie(user as User)
        .then(() => {
          hasRedirected.current = true;
          redirectToDashboard();
        })
        .catch(() => {
          hasRedirected.current = false;
        });
    }
  }, [user, authLoading, redirectToDashboard]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#2361d8]/5">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[#2361d8]"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#2361d8]/5">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[#2361d8]"></div>
          <p className="mt-4 text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signInWithEmail(email, password);

      if (result.error) {
        setError(result.error.userMessage);
        showToast({ type: "error", title: "Error", message: result.error.userMessage });
        return;
      }

      showToast({ type: "success", title: "Bienvenido", message: "Inicio de sesion correcto" });
      redirectToDashboard();
    } catch (err) {
      setError("Error al iniciar sesion. Intenta de nuevo.");
      showToast({ type: "error", title: "Error", message: "Error al iniciar sesion" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await signInWithGoogle();

      if (result.error) {
        setError(result.error.userMessage);
        showToast({ type: "error", title: "Error", message: result.error.userMessage });
        return;
      }

      showToast({ type: "success", title: "Bienvenido", message: "Inicio de sesion con Google" });
      redirectToDashboard();
    } catch (err) {
      setError("Error al iniciar sesion con Google. Intenta de nuevo.");
      showToast({ type: "error", title: "Error", message: "Error al iniciar sesion con Google" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await signInWithMicrosoft();

      if (result.error) {
        setError(result.error.userMessage);
        showToast({ type: "error", title: "Error", message: result.error.userMessage });
        return;
      }

      showToast({ type: "success", title: "Bienvenido", message: "Inicio de sesion con Microsoft" });
      redirectToDashboard();
    } catch (err) {
      setError("Error al iniciar sesion con Microsoft. Intenta de nuevo.");
      showToast({ type: "error", title: "Error", message: "Error al iniciar sesion" });
    } finally {
      setIsLoading(false);
    }
  };

  const validateSignup = () => {
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
    if (!validateSignup()) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await signUpWithEmail(email, password);
      if (result.error) {
        setError(result.error.userMessage);
        return;
      }
      router.push("/auth/verify-email");
    } catch (err) {
      setError("Error al registrarse. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={mode === "login" ? "Inicia sesion" : "Crea tu cuenta"}
      subtitle={mode === "login" ? "Accede a tu cuenta de Verifactu" : "Unete a Verifactu hoy"}
      footerText={mode === "login" ? "No tienes cuenta?" : "Ya tienes cuenta?"}
      footerLink={
        mode === "login"
          ? { href: "/auth/signup", label: "Registrate aqui" }
          : { href: "/auth/login", label: "Inicia sesion aqui" }
      }
    >
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-lg border py-2 ${
            mode === "login"
              ? "border-[#2361d8] bg-[#2361d8] text-white"
              : "border-gray-300 bg-white text-gray-700"
          }`}
        >
          Iniciar sesion
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-lg border py-2 ${
            mode === "signup"
              ? "border-[#2361d8] bg-[#2361d8] text-white"
              : "border-gray-300 bg-white text-gray-700"
          }`}
        >
          Crear cuenta
        </button>
      </div>

      <motion.form
        onSubmit={mode === "login" ? handleEmailLogin : handleEmailSignup}
        className="space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

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
            {mode === "login" && (
              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium text-[#2361d8] hover:text-[#2361d8]"
              >
                La olvidaste?
              </Link>
            )}
          </div>
          <PasswordInput
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError("");
            }}
            required
          />
          {mode === "signup" && passwordError && (
            <p className="mt-1 text-sm text-red-500">{passwordError}</p>
          )}
        </div>

        {mode === "signup" && (
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
        )}

        {mode === "signup" && (
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
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-[#2361d8] py-3 font-semibold text-white shadow-md transition hover:bg-[#1f55c0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading
            ? mode === "login"
              ? "Iniciando sesion..."
              : "Creando cuenta..."
            : mode === "login"
            ? "Iniciar sesion"
            : "Crear cuenta"}
        </button>
      </motion.form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">O continua con</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-3 rounded-full bg-[#2361d8] px-4 py-3 font-semibold text-white shadow-md transition hover:bg-[#1f55c0] disabled:cursor-not-allowed disabled:opacity-50"
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
        {isLoading
          ? mode === "login"
            ? "Iniciando sesion..."
            : "Registrandose..."
          : "Continuar con Google"}
      </button>

      <button
        type="button"
        onClick={handleMicrosoftLogin}
        disabled={isLoading}
        className="mt-3 flex w-full items-center justify-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#F25022" d="M2 2h9v9H2z" />
          <path fill="#7FBA00" d="M13 2h9v9h-9z" />
          <path fill="#00A4EF" d="M2 13h9v9H2z" />
          <path fill="#FFB900" d="M13 13h9v9h-9z" />
        </svg>
        {isLoading ? "Iniciando sesion..." : "Continuar con Microsoft"}
      </button>
    </AuthLayout>
  );
}


