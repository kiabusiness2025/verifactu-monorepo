"use client";

import React, { useState } from "react";
import { updateProfile } from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@verifactu/ui";
import { X, Sparkles } from "lucide-react";

interface WelcomeModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function WelcomeModal({ isOpen, onComplete }: WelcomeModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Por favor introduce tu nombre");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Actualizar displayName en Firebase
      await updateProfile(user, {
        displayName: name.trim(),
      });

      // Forzar recarga del usuario para que useAuth vea el cambio
      await user.reload();

      onComplete();
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("No se pudo actualizar el nombre. Intenta de nuevo.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              ¡Bienvenido a Verifactu! 🎉
            </h2>
            <p className="text-sm text-slate-600">
              Empecemos por conocerte
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              ¿Cómo te llamas?
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Ksenia"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
              disabled={isSubmitting}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-sm leading-relaxed text-slate-700">
              <strong className="text-blue-900">Isaak</strong> (tu asistente fiscal) 
              usará tu nombre para personalizar sus mensajes 😊
            </p>
          </div>

          <Button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 font-semibold text-white hover:from-blue-700 hover:to-cyan-600 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Guardando..." : "Continuar"}
          </Button>
        </form>

        {/* Nota pequeña */}
        <p className="mt-4 text-center text-xs text-slate-500">
          Podrás cambiar tu nombre más tarde en configuración
        </p>
      </div>
    </div>
  );
}
