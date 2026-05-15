'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

type Props = {
  initialSearch: string;
  initialChannel: string;
  initialStatus: string;
};

const CHANNELS = [
  { value: 'all', label: 'Todos los canales' },
  { value: 'claude', label: 'Claude' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'mobile', label: 'Mobile' },
];

const STATUSES = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'connected', label: 'Conectado' },
  { value: 'error', label: 'Con error' },
  { value: 'revoked_api', label: 'Revocado' },
  { value: 'disconnected', label: 'Desconectado' },
];

export function ConnectorsFilters({ initialSearch, initialChannel, initialStatus }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [channel, setChannel] = useState(initialChannel);
  const [status, setStatus] = useState(initialStatus);

  const navigate = useCallback(
    (s: string, ch: string, st: string) => {
      const sp = new URLSearchParams();
      if (s) sp.set('search', s);
      if (ch !== 'all') sp.set('channel', ch);
      if (st !== 'all') sp.set('status', st);
      const q = sp.toString();
      router.push(`/connectors${q ? `?${q}` : ''}`);
    },
    [router]
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate(search, channel, status);
      }}
      className="flex flex-wrap gap-2"
    >
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por tenant o usuario…"
        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm placeholder:text-slate-400 focus:border-[#2361d8] focus:outline-none"
      />
      <select
        value={channel}
        onChange={(e) => {
          setChannel(e.target.value);
          navigate(search, e.target.value, status);
        }}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#2361d8] focus:outline-none"
      >
        {CHANNELS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          navigate(search, channel, e.target.value);
        }}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#2361d8] focus:outline-none"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-xl bg-[#2361d8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e56c4]"
      >
        Buscar
      </button>
    </form>
  );
}
