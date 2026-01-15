"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, ArrowLeft } from "lucide-react";
import { AuthLayout, FormInput } from "../../components/AuthComponents";
import { useToast } from "../../components/Toast";
import { sendResetEmail, resetPasswordWithCode } from "../../lib/auth";
import { useAuth } from "../../context/AuthContext";

type ForgotPasswordStep = "email" | "sent" | "reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
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
      const result = await sendResetEmail(email);

      if (result.error) {
        setError(result.error.userMessage);
        showToast({ type: "error", title: "Error", message: result.error.userMessage });
        return;
      }

      showToast({ type: "info", title: "Correo enviado", message: "Revisa tu bandeja para el codigo" });
      setStep("sent");
    } catch (err) {
      setError("Error al enviar el correo. Intenta de nuevo.");
      showToast({ type: "error", title: "Error", message: "No se pudo enviar el correo" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await resetPasswordWithCode(resetCode, newPassword);

      if (result.error) {
        setError(result.error.userMessage);
        showToast({ type: "error", title: "Error", message: result.error.userMessage });
        return;
      }

      showToast({ type: "success", title: "Actualizada", message: "Tu contraseña ha sido cambiada" });
      router.push("/auth/login");
    } catch (err) {
      setError("Error al actualizar la contraseña. Intenta de nuevo.");
      showToast({ type: "error", title: "Error", message: "No se pudo actualizar la contraseña" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={step === "email" ? "Recuperar contraseña" : "Restablece tu contraseña"}
      subtitle={
        step === "email"
          ? "Te enviaremos un enlace para restablecerla"
          : `Hemos enviado un codigo a ${email}`
      }
    >
      {user && (
        <div className="mb-3 rounded border border-[#0060F0]/20 bg-sky-50/70 p-2 text-xs text-[#0060F0]">
          Ya has iniciado sesion. Puedes cambiar tu contraseña con el enlace del correo.
        </div>
      )}
      {step === "email" && (
        <motion.form
          onSubmit={handleEmailSubmit}
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-gradient-to-r from-[#0060F0] to-[#20B0F0] py-3 font-semibold text-white shadow-md transition hover:from-[#0056D6] hover:to-[#1AA3DB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Enviando..." : "Enviar enlace"}
          </button>

          <Link
            href="/auth/login"
            className="flex items-center justify-center gap-2 text-sm font-medium text-[#0060F0] hover:text-[#0080F0]"
          >
            <ArrowLeft className="h-4 w-4" />
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
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-50/70">
              <Mail className="h-6 w-6 text-[#0060F0]" />
            </div>
          </div>

          <div className="mb-6 space-y-2 text-center">
            <p className="text-gray-600">Hemos enviado un codigo de recuperacion a:</p>
            <p className="font-medium text-gray-900">{email}</p>
            <p className="text-sm text-gray-500">Revisa tu bandeja de entrada (y spam si es necesario)</p>
          </div>

          <form onSubmit={handleResetSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <FormInput
              label="Codigo de recuperacion"
              type="text"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              placeholder="Ingresa el codigo de 6 digitos"
              required
            />

            <FormInput
              label="Nueva contraseña"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimo 8 caracteres"
              required
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-gradient-to-r from-[#0060F0] to-[#20B0F0] py-3 font-semibold text-white shadow-md transition hover:from-[#0056D6] hover:to-[#1AA3DB] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </form>

          <button
            onClick={() => setStep("email")}
            className="w-full text-sm font-medium text-[#0060F0] hover:text-[#0080F0]"
          >
            No recibiste el codigo? Intenta de nuevo
          </button>
        </motion.div>
      )}

      <div className="mt-6 space-y-1 text-center text-xs text-gray-500">
        <p>Necesitas ayuda?</p>
        <a
          href="mailto:soporte@verifactu.business"
          className="font-medium text-[#0060F0] hover:text-[#0080F0]"
        >
          Contactanos
        </a>
      </div>
    </AuthLayout>
  );
}
