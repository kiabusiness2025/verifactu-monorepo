'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

type Props = {
  initialSearch: string;
  initialStatus: string;
};

export function UsersSearchBar({ initialSearch, initialStatus }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);

  const navigate = useCallback(
    (s: string, st: string) => {
      const sp = new URLSearchParams();
      if (s) sp.set('search', s);
      if (st !== 'all') sp.set('status', st);
      const q = sp.toString();
      router.push(`/users${q ? `?${q}` : ''}`);
    },
    [router]
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate(search, status);
      }}
      className="flex flex-wrap gap-2"
    >
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por email o nombre…"
        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm placeholder:text-slate-400 focus:border-[#2361d8] focus:outline-none"
      />
      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          navigate(search, e.target.value);
        }}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#2361d8] focus:outline-none"
      >
        <option value="all">Todos los usuarios</option>
        <option value="connected">Conectados (Holded)</option>
        <option value="blocked">Bloqueados</option>
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
