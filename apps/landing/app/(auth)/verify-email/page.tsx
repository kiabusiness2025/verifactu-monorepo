"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, CheckCircle2, RotateCcw } from "lucide-react";
import { AuthLayout } from "../../components/AuthComponents";
import { resendVerificationEmail } from "../../lib/auth";
import { auth } from "../../lib/firebase";

type VerifyEmailStep = "pending" | "resent" | "verified";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [step, setStep] = useState<VerifyEmailStep>("pending");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCount, setResendCount] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [userEmail, setUserEmail] = useState("tu@email.com");

  // Get user email on client mount
  useEffect(() => {
    if (auth.currentUser?.email) {
      setUserEmail(auth.currentUser.email);
    }
  }, []);

  // Check if email is verified periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        setStep("verified");
        setTimeout(() => {
          router.push("/");
        }, 2000);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [router]);

  // Handle resend countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && resendCount > 0) {
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
        return;
      }

      setStep("resent");
      setResendCount((prev) => prev + 1);
      setCanResend(false);
      setCountdown(60); // 60 seconds before resending again
    } catch (err) {
      setError("Error al reenviar el correo. Intenta de nuevo.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "verified") {
    return (
      <AuthLayout
        title="¡Correo verificado!"
        subtitle="Redirigiendo..."
      >
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-gray-600 text-center">
            Tu correo ha sido verificado. Accediendo a tu cuenta...
          </p>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verifica tu correo"
      subtitle={`Enviamos un enlace a ${userEmail}`}
    >
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

        {step === "resent" && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
            ✓ Correo reenviado. Revisa tu bandeja de entrada.
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-2 mb-6 text-center">
          <p className="text-gray-600">
            Hemos enviado un enlace de verificación a:
          </p>
          <p className="font-medium text-gray-900">{userEmail}</p>
          <p className="text-sm text-gray-500">
            Haz clic en el enlace del correo para verificar tu cuenta.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          💡 <strong>Tip:</strong> No ves el correo? Revisa tu carpeta de spam.
        </div>

        <div className="pt-4 space-y-2">
          <button
            onClick={handleResendEmail}
            disabled={!canResend || isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            {isLoading
              ? "Reenviando..."
              : canResend
              ? "Reenviar correo"
              : `Reenviar en ${countdown}s`}
          </button>

          <a
            href="/auth/login"
            className="w-full block text-center py-3 text-blue-600 hover:text-blue-700 font-medium"
          >
            Volver a login
          </a>
        </div>
      </motion.div>

      {/* Support */}
      <div className="mt-6 text-center text-xs text-gray-500 space-y-1">
        <p>¿Problemas?</p>
        <a
          href="mailto:soporte@verifactu.business"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Contáctanos
        </a>
      </div>
    </AuthLayout>
  );
}
