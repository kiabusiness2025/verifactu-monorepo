"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AuthLayout, FormInput, PasswordInput, GoogleAuthButton } from "../../components/AuthComponents";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");

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
      setError("Debes aceptar los términos y condiciones");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // TODO: Integrar con Firebase Auth
      console.log("Signup attempt:", { email, password, fullName });
      // Simular delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      alert("Signup functionality will be connected to Firebase Auth");
    } catch (err) {
      setError("Error al registrarse. Intenta de nuevo.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Únete a Verifactu hoy"
      footerText="¿Ya tienes cuenta?"
      footerLink={{ href: "/auth/login", label: "Inicia sesión aquí" }}
    >
      <motion.form
        onSubmit={handleSubmit}
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
          label="Nombre completo"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Juan Pérez"
          required
        />

        <FormInput
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contraseña <span className="text-red-500">*</span>
          </label>
          <PasswordInput
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError("");
            }}
            placeholder="Mínimo 8 caracteres"
            required
          />
          {passwordError && (
            <p className="text-sm text-red-500 mt-1">{passwordError}</p>
          )}
        </div>

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

        {/* Terms Checkbox */}
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
            Acepto los{" "}
            <a href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">
              términos y condiciones
            </a>{" "}
            y la{" "}
            <a href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">
              política de privacidad
            </a>
          </span>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </motion.form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">O regístrate con</span>
        </div>
      </div>

      <GoogleAuthButton />
    </AuthLayout>
  );
}
