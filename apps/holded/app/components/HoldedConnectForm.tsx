'use client';

import { useState } from 'react';

export function HoldedConnectForm() {
  const [apiKey, setApiKey] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/holded/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, channel: 'chatgpt' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Error de conexión');

      if (data?.nextStep === 'onboarding_required') {
        const next = encodeURIComponent('/');
        window.location.assign(`/onboarding/profile?next=${next}`);
        return;
      }

      setConnected(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row items-center">
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="API Key de Holded..."
        className="w-56 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
        disabled={loading || connected}
      />
      <button
        type="button"
        onClick={handleConnect}
        disabled={apiKey.length < 8 || loading || connected}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#ff5460] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#ef4654] disabled:opacity-40"
      >
        {loading ? <span className="animate-spin mr-1">⏳</span> : null}
        {connected ? 'Conectado' : loading ? 'Conectando...' : 'Conectar'}
      </button>
      {error && <span className="ml-3 text-xs text-rose-600">{error}</span>}
    </div>
  );
}
