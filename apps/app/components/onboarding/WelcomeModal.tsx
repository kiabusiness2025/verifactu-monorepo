'use client';

import React, { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import { buildFullName, normalizePersonNamePart, splitFullName } from '@/lib/personName';
import { Button } from '@verifactu/ui';
import { X, Sparkles } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function WelcomeModal({ isOpen, onComplete }: WelcomeModalProps) {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen || !user) return;

    const nameParts = splitFullName(user.displayName);
    setFirstName(nameParts.firstName || '');
    setLastName(nameParts.lastName || '');
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedFirstName = normalizePersonNamePart(firstName);
    const normalizedLastName = normalizePersonNamePart(lastName);
    const fullName = buildFullName({
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
    });

    if (!normalizedFirstName || !fullName) {
      setError('Por favor introduce al menos tu nombre');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updateProfile(user, {
        displayName: fullName,
      });

      await fetch('/api/auth/sync-user', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: fullName,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          photoURL: user.photoURL || null,
          emailVerified: user.emailVerified,
          provider: user.providerData?.[0]?.providerId || 'password',
        }),
      }).catch(() => null);

      await user.reload();

      onComplete();
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('No se pudo actualizar el nombre. Intenta de nuevo.');
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
            <h2 className="text-xl font-bold text-slate-900">¡Bienvenido a Verifactu! 🎉</h2>
            <p className="text-sm text-slate-600">Empecemos por conocerte</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor="firstName" className="mb-2 block text-sm font-semibold text-slate-700">
              Nombre
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ej: Ksenia"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
              disabled={isSubmitting}
            />

            <label htmlFor="lastName" className="mb-2 block text-sm font-semibold text-slate-700">
              Apellidos
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ej: Ivanova Lopez"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              disabled={isSubmitting}
            />
          </div>

          {error && <p className="-mt-2 text-sm text-red-600">{error}</p>}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm leading-relaxed text-slate-700">
              Guardaremos tu nombre y tus apellidos por separado. Isaak y los correos te saludarán
              solo por tu nombre.
            </p>
          </div>

          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-sm leading-relaxed text-slate-700">
              <strong className="text-blue-900">Isaak</strong> (tu asistente fiscal) se dirigirá a
              ti por tu nombre para que la conversación sea más natural.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 font-semibold text-white hover:from-blue-700 hover:to-cyan-600 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Continuar'}
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
