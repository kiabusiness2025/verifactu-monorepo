'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Users } from 'lucide-react';

type Contact = {
  id: string;
  name: string;
  type: string;
  nif: string | null;
  email: string | null;
  phone: string | null;
  balance: number | null;
  country: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  client: 'Cliente',
  supplier: 'Proveedor',
  debtor: 'Deudor',
  creditor: 'Acreedor',
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    client: 'bg-emerald-50 text-emerald-700',
    supplier: 'bg-blue-50 text-blue-700',
    debtor: 'bg-amber-50 text-amber-700',
    creditor: 'bg-rose-50 text-rose-700',
  };
  const cls = colors[type] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

export default function ContactosClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filtered, setFiltered] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [noHolded, setNoHolded] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'client' | 'supplier'>('all');
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/contacts/list?type=${typeFilter}`)
      .then(async (r) => {
        if (r.status === 422) {
          setNoHolded(true);
          return;
        }
        const d = await r.json();
        if (d.ok) setContacts(d.contacts);
      })
      .finally(() => setLoading(false));
  }, [typeFilter]);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      setFiltered(contacts);
      return;
    }
    setFiltered(
      contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.nif ?? '').toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q)
      )
    );
  }, [search, contacts]);

  if (noHolded) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-sm text-slate-500">Conecta tu ERP para ver tus contactos.</p>
        <a
          href="/settings/connections"
          className="rounded-lg bg-[#2361d8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a4fc4]"
        >
          Conectar tu ERP
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-[#fafbff] px-4 py-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, NIF o email…"
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2361d8]/30"
          />
        </div>
        {/* Type filter */}
        <div className="flex gap-1">
          {(['all', 'client', 'supplier'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-[#2361d8] text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t === 'all' ? 'Todos' : t === 'client' ? 'Clientes' : 'Proveedores'}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400">
          {loading ? '…' : `${filtered.length} contactos`}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-slate-400">
            Cargando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Users size={32} className="text-slate-200" />
            <p className="text-sm text-slate-400">Sin contactos para este filtro.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#fafbff]">
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="hidden px-4 py-3 md:table-cell">NIF</th>
                <th className="hidden px-4 py-3 lg:table-cell">Email</th>
                <th className="hidden px-4 py-3 lg:table-cell">Teléfono</th>
                <th className="px-4 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-[#011c67]">{c.name || '—'}</td>
                  <td className="px-4 py-3">
                    <TypeBadge type={c.type} />
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{c.nif ?? '—'}</td>
                  <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                    {c.email ? (
                      <a
                        href={`mailto:${c.email}`}
                        className="hover:text-[#2361d8] hover:underline"
                      >
                        {c.email}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                    {c.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {c.balance !== null ? (
                      <span className={c.balance < 0 ? 'text-rose-600' : 'text-slate-700'}>
                        {fmt(c.balance)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
