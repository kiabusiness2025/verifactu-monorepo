'use client';

import { adminPost } from '@/lib/adminApi';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Token = {
  id: string;
  name: string;
  keyPrefix: string;
  channelKey: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type Props = {
  connectionId: string;
  tokens: Token[];
};

const CHANNEL_LABELS: Record<string, string> = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  dashboard: 'Dashboard',
};

function fmt(v: string | null) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return v;
  }
}

export function ConnectorTokens({ connectionId, tokens }: Props) {
  const router = useRouter();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function revoke(tokenId: string) {
    if (!confirm('¿Revocar este token? La acción es inmediata e irreversible.')) return;
    setRevoking(tokenId);
    setError(null);
    try {
      await adminPost(`/api/admin/connectors/${connectionId}/tokens/${tokenId}/revoke`, {});
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setRevoking(null);
    }
  }

  if (tokens.length === 0) {
    return <p className="text-xs text-slate-400">Sin tokens activos</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {tokens.map((t) => (
        <div key={t.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800">{t.name}</p>
              <code className="text-[10px] text-slate-500">{t.keyPrefix}…</code>
            </div>
            <button
              onClick={() => revoke(t.id)}
              disabled={revoking === t.id}
              className="shrink-0 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
            >
              {revoking === t.id ? '…' : 'Revocar'}
            </button>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
            <span>{CHANNEL_LABELS[t.channelKey] ?? t.channelKey}</span>
            <span>Último uso: {fmt(t.lastUsedAt)}</span>
            {t.expiresAt && <span>Expira: {fmt(t.expiresAt)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
