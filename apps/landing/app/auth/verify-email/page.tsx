"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, CheckCircle2, RotateCcw } from "lucide-react";
import { AuthLayout } from "../../components/AuthComponents";
import { resendVerificationEmail } from "../../lib/auth";
import { getAppUrl } from "../../lib/urls";
import { useToast } from "../../components/Toast";
import { auth } from "../../lib/firebase";

type VerifyEmailStep = "pending" | "resent" | "verified";

export default function VerifyEmailPage() {
  const { showToast } = useToast();
  const appUrl = getAppUrl();
  const [step, setStep] = useState<VerifyEmailStep>("pending");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCount, setResendCount] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [userEmail, setUserEmail] = useState("tu@email.com");

  useEffect(() => {
    if (auth.currentUser?.emailVerified) {
      setStep("verified");
      showToast({ type: "success", title: "Verificado", message: "Correo ya verificado" });
      setTimeout(() => {
        window.location.href = `${appUrl}/dashboard`;
      }, 1000);
    }
  }, [appUrl, showToast]);

  useEffect(() => {
    if (auth.currentUser?.email) {
      setUserEmail(auth.currentUser.email);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        setStep("verified");
        setTimeout(() => {
          window.location.href = `${appUrl}/dashboard`;
        }, 2000);
        showToast({ type: "success", title: "Verificado", message: "Correo verificado" });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [appUrl, showToast]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (countdown === 0 && resendCount > 0) {
      setCanResend(true);
    }
  }, [countdown, resendCount]);

  const handleResendEmail = async () => {
    if (!canResend || !auth.currentUser) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await resendVerificationEmail(auth.currentUser);

      if (result.error) {
        setError(result.error.userMessage);
        showToast({ type: "error", title: "Error", message: result.error.userMessage });
        return;
      }

      setStep("resent");
      showToast({ type: "info", title: "Correo reenviado", message: "Revisa tu bandeja de entrada" });
      setResendCount((prev) => prev + 1);
      setCanResend(false);
      setCountdown(60);
    } catch (err) {
      setError("Error al reenviar el correo. Intenta de nuevo.");
      showToast({ type: "error", title: "Error", message: "No se pudo reenviar el correo" });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "verified") {
    return (
      <AuthLayout title="Correo verificado" subtitle="Redirigiendo...">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <p className="text-center text-gray-600">
            Tu correo ha sido verificado. Accediendo a tu cuenta...
          </p>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Verifica tu correo" subtitle={`Enviamos un enlace a ${userEmail}`}>
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2361d8]/10">
            <Mail className="h-6 w-6 text-[#2361d8]" />
          </div>
        </div>

        {step === "resent" && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Correo reenviado. Revisa tu bandeja de entrada.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 space-y-2 text-center">
          <p className="text-gray-600">Hemos enviado un enlace de verificacion a:</p>
          <p className="font-medium text-gray-900">{userEmail}</p>
          <p className="text-sm text-gray-500">Haz clic en el enlace del correo para verificar tu cuenta.</p>
        </div>

        <div className="rounded-lg border border-[#2361d8]/20 bg-[#2361d8]/10 p-3 text-sm text-[#2361d8]">
          <strong>Tip:</strong> No ves el correo? Revisa tu carpeta de spam.
        </div>

        <div className="space-y-2 pt-4">
          <button
            onClick={handleResendEmail}
            disabled={!canResend || isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            {isLoading
              ? "Reenviando..."
              : canResend
              ? "Reenviar correo"
              : `Reenviar en ${countdown}s`}
          </button>

          <a
            href="/auth/login"
            className="block w-full py-3 text-center font-medium text-[#2361d8] hover:text-[#2361d8]"
          >
            Volver a login
          </a>
        </div>
      </motion.div>

      <div className="mt-6 space-y-1 text-center text-xs text-gray-500">
        <p>Problemas?</p>
        <a
          href="mailto:soporte@verifactu.business"
          className="font-medium text-[#2361d8] hover:text-[#2361d8]"
        >
          Contactanos
        </a>
      </div>
    </AuthLayout>
  );
}



