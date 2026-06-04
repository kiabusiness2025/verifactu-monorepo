'use client';

import { adminDelete, adminPatch, adminPost } from '@/lib/adminApi';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  userId: string;
  email: string;
  isBlocked: boolean;
};

const ISAAK_URL = process.env.NEXT_PUBLIC_ISAAK_URL ?? 'https://isaak.verifactu.business';

export function UserActions({ userId, email, isBlocked }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleBlock() {
    setBusy(true);
    setError(null);
    try {
      await adminPatch(`/api/admin/users/${userId}`, { isBlocked: !isBlocked });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser() {
    if (!confirm(`¿Eliminar a ${email}? Esta acción no se puede deshacer.`)) return;
    setBusy(true);
    setError(null);
    try {
      await adminDelete(`/api/admin/users/${userId}`);
      router.push('/users');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setBusy(false);
    }
  }

  async function impersonate() {
    if (
      !confirm(
        `Vas a abrir Isaak suplantando a ${email}. La sesión de impersonación queda registrada. ¿Continuar?`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await adminPost(`/api/admin/users/${userId}/impersonate`, {});
      window.open(`${ISAAK_URL}/chat`, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={impersonate}
        disabled={busy}
        className="w-full rounded-xl border border-[#2361d8]/30 bg-[#2361d8]/5 px-3 py-2 text-sm font-semibold text-[#2361d8] transition hover:bg-[#2361d8]/10 disabled:opacity-50"
      >
        Abrir Isaak suplantando al usuario
      </button>
      <button
        onClick={toggleBlock}
        disabled={busy}
        className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${
          isBlocked
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
        }`}
      >
        {isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
      </button>
      <button
        onClick={deleteUser}
        disabled={busy}
        className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
      >
        Eliminar usuario
      </button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
