'use client';

import { Loader2, Plug, Receipt, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type GastoItem = {
  id: string;
  number: string;
  date: string | null;
  supplierName: string;
  supplierId: string | null;
  totalNet: number | null;
  totalTax: number | null;
  totalGross: number | null;
  status: string;
  currency: string;
  description: string;
};

type GastosResponse = {
  ok: boolean;
  data?: {
    items: GastoItem[];
    total: number;
    totalAmount: number;
    suppliers: string[];
    truncated: boolean;
  };
  error?: string;
  message?: string;
};

type Period =
  | 'current_month'
  | 'previous_month'
  | 'current_quarter'
  | 'previous_quarter'
  | 'current_year';

const PERIOD_LABELS: Record<Period, string> = {
  current_month: 'Este mes',
  previous_month: 'Mes anterior',
  current_quarter: 'Este trimestre',
  previous_quarter: 'Trimestre anterior',
  current_year: 'Este año',
};

function fmtMoney(value: number | null, currency = 'EUR') {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === 'paid' || s === 'accepted' || s === '1') {
    return (
      <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold px-2 py-0.5">
        Pagada
      </span>
    );
  }
  if (s === 'pending' || s === '0') {
    return (
      <span className="rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold px-2 py-0.5">
        Pendiente
      </span>
    );
  }
  if (s === 'overdue') {
    return (
      <span className="rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold px-2 py-0.5">
        Vencida
      </span>
    );
  }
  if (!status) return null;
  return (
    <span className="rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-medium px-2 py-0.5">
      {status}
    </span>
  );
}

export default function GastosClient() {
  const [period, setPeriod] = useState<Period>('current_month');
  const [search, setSearch] = useState('');
  const [supplier, setSupplier] = useState('');
  const [data, setData] = useState<GastosResponse['data'] | null>(null);
  const [noHolded, setNoHolded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ period });
    if (search) qs.set('search', search);
    fetch(`/api/isaak/gastos?${qs}`)
      .then((r) => r.json() as Promise<GastosResponse>)
      .then((res) => {
        if (res.error === 'no_holded') {
          setNoHolded(true);
          return;
        }
        if (!res.ok || !res.data) {
          setError(res.message ?? 'Error cargando gastos');
          return;
        }
        setData(res.data);
        setNoHolded(false);
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false));
  }, [period, search]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return supplier ? data.items.filter((i) => i.supplierName === supplier) : data.items;
  }, [data, supplier]);

  const filteredTotal = useMemo(
    () => filtered.reduce((s, i) => s + (i.totalGross ?? 0), 0),
    [filtered]
  );

  if (noHolded) {
    return (
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
            <Plug size={24} className="text-amber-500" />
          </div>
          <p className="text-[16px] font-semibold text-[#011c67]">Holded no conectado</p>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
            Los gastos se cargan desde Holded. Conecta tu cuenta para ver tus compras y proveedores.
          </p>
          <Link
            href="/settings?section=integrations"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#2361d8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f55c0]"
          >
            Conectar Holded
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-5 py-2.5">
        <div className="flex gap-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPeriod(p);
                setSupplier('');
              }}
              className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition ${
                period === p
                  ? 'bg-[#2361d8]/10 text-[#2361d8]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {data?.suppliers && data.suppliers.length > 0 && (
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-600"
            >
              <option value="">Todos los proveedores</option>
              {data.suppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white pl-7 pr-3 py-1.5 text-[12px] text-slate-700 placeholder-slate-400 w-40"
            />
          </div>
        </div>
      </div>

      {/* Summary bar */}
      {data && (
        <div className="flex items-center gap-6 border-b border-slate-100 bg-slate-50 px-5 py-2">
          <span className="text-[12px] text-slate-500">
            <strong className="text-slate-800">{filtered.length}</strong> facturas
            {supplier && <span className="text-slate-400"> · {supplier}</span>}
          </span>
          <span className="text-[12px] text-slate-500">
            Total: <strong className="text-slate-800">{fmtMoney(filteredTotal)}</strong>
          </span>
          {data.truncated && (
            <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              Mostrando primeras 200 facturas
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-rose-500">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Receipt size={24} className="text-slate-300" />
            <p className="text-sm text-slate-400">
              {search || supplier
                ? 'Sin resultados para este filtro'
                : 'Sin facturas de compra en este período'}
            </p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-2.5 font-semibold text-slate-500 text-[11px] uppercase tracking-wide">
                  Fecha
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 text-[11px] uppercase tracking-wide">
                  Nº Factura
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 text-[11px] uppercase tracking-wide">
                  Proveedor
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 text-[11px] uppercase tracking-wide hidden md:table-cell">
                  Concepto
                </th>
                <th className="text-right px-3 py-2.5 font-semibold text-slate-500 text-[11px] uppercase tracking-wide">
                  Base
                </th>
                <th className="text-right px-5 py-2.5 font-semibold text-slate-500 text-[11px] uppercase tracking-wide">
                  Total
                </th>
                <th className="text-center px-3 py-2.5 font-semibold text-slate-500 text-[11px] uppercase tracking-wide hidden sm:table-cell">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">
                    {fmtDate(item.date)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-600 text-[11px]">
                    {item.number || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-slate-800 font-medium max-w-[180px] truncate">
                    {item.supplierName || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 max-w-[160px] truncate hidden md:table-cell text-[12px]">
                    {item.description || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                    {fmtMoney(item.totalNet, item.currency)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono font-semibold text-slate-800">
                    {fmtMoney(item.totalGross, item.currency)}
                  </td>
                  <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                    {statusBadge(item.status)}
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
