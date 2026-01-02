"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AuthLayout, FormInput, PasswordInput, GoogleAuthButton } from "../../components/AuthComponents";
import { useAuth } from "../../context/AuthContext";
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from "../../lib/auth";
import { useToast } from "../../components/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [passwordError, setPasswordError] = useState("");

  // Redirect if already authenticated
  React.useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

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

      // Redirect to dashboard
      showToast({ type: "success", title: "Bienvenido", message: "Inicio de sesión correcto" });
      router.push("/");
    } catch (err) {
      setError("Error al iniciar sesión. Intenta de nuevo.");
      showToast({ type: "error", title: "Error", message: "Error al iniciar sesión" });
      console.error(err);
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

      // Redirect to dashboard
      showToast({ type: "success", title: "Bienvenido", message: "Inicio de sesión con Google" });
      router.push("/");
    } catch (err) {
      setError("Error al iniciar sesión con Google. Intenta de nuevo.");
      showToast({ type: "error", title: "Error", message: "Error al iniciar sesión con Google" });
      console.error(err);
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
      setError("Debes aceptar los términos y condiciones");
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
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}
      subtitle={mode === "login" ? "Accede a tu cuenta de Verifactu" : "Únete a Verifactu hoy"}
      footerText={mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
      footerLink={mode === "login" ? { href: "/auth/signup", label: "Regístrate aquí" } : { href: "/auth/login", label: "Inicia sesión aquí" }}
    >
      {/* Tabs */}
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 py-2 rounded-lg border ${mode === "login" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 py-2 rounded-lg border ${mode === "signup" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}
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
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <FormInput
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
        />

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            {mode === "login" && (
              <Link
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                ¿La olvidaste?
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
            <p className="text-sm text-red-500 mt-1">{passwordError}</p>
          )}
        </div>

        {mode === "signup" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-600">
              Acepto los {" "}
              <a href="/legal/terminos" className="text-blue-600 hover:text-blue-700 font-medium">
                términos y condiciones
              </a>{" "}
              y la {" "}
              <a href="/legal/privacidad" className="text-blue-600 hover:text-blue-700 font-medium">
                política de privacidad
              </a>
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-md transition hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (mode === "login" ? "Iniciando sesión..." : "Creando cuenta...") : (mode === "login" ? "Iniciar sesión" : "Crear cuenta")}
        </button>
      </motion.form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">O continúa con</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-md transition hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
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
        {isLoading ? (mode === "login" ? "Iniciando sesión..." : "Registrándose...") : "Continuar con Google"}
      </button>
    </AuthLayout>
  );
}
