"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, ArrowLeft } from "lucide-react";
import { AuthLayout, FormInput } from "../../components/AuthComponents";

type ForgotPasswordStep = "email" | "sent" | "reset";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<ForgotPasswordStep>("email");
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // TODO: Integrar con Firebase Auth
      console.log("Password reset requested for:", email);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStep("sent");
    } catch (err) {
      setError("Error al enviar el correo. Intenta de nuevo.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // TODO: Integrar con Firebase Auth
      console.log("Password reset with code:", { resetCode, newPassword });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert("Contraseña actualizada. Redirigiendo a login...");
      window.location.href = "/auth/login";
    } catch (err) {
      setError("Error al actualizar la contraseña. Intenta de nuevo.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={step === "email" ? "Recuperar contraseña" : "Reestablece tu contraseña"}
      subtitle={
        step === "email"
          ? "Te enviaremos un enlace para reestablecerla"
          : `Hemos enviado un código a ${email}`
      }
    >
      {step === "email" && (
        <motion.form
          onSubmit={handleEmailSubmit}
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Enviando..." : "Enviar enlace"}
          </button>

          <Link
            href="/auth/login"
            className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a login
          </Link>
        </motion.form>
      )}

      {step === "sent" && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <div className="text-center space-y-2 mb-6">
            <p className="text-gray-600">
              Hemos enviado un código de recuperación a:
            </p>
            <p className="font-medium text-gray-900">{email}</p>
            <p className="text-sm text-gray-500">
              Revisa tu bandeja de entrada (y spam si es necesario)
            </p>
          </div>

          <form onSubmit={handleResetSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <FormInput
              label="Código de recuperación"
              type="text"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              placeholder="Ingresa el código de 6 dígitos"
              required
            />

            <FormInput
              label="Nueva contraseña"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </form>

          <button
            onClick={() => setStep("email")}
            className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ¿No recibiste el código? Intenta de nuevo
          </button>
        </motion.div>
      )}

      {/* Helper text */}
      <div className="mt-6 text-center text-xs text-gray-500 space-y-1">
        <p>¿Necesitas ayuda?</p>
        <a href="mailto:soporte@verifactu.business" className="text-blue-600 hover:text-blue-700 font-medium">
          Contáctanos
        </a>
      </div>
    </AuthLayout>
  );
}
