'use client';

import { CheckCircle2, Loader2, Plug, Receipt, Search, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

type ExtractedExpense = {
  supplierName: string;
  supplierNif?: string;
  issueDate: string;
  invoiceNumber?: string;
  description: string;
  amountNet: number;
  vatRate: number;
  amountTax: number;
  amountTotal: number;
  currency: string;
};

type UploadStep = 'idle' | 'uploading' | 'review' | 'saving' | 'done';

function UploadPanel({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<UploadStep>('idle');
  const [expense, setExpense] = useState<ExtractedExpense | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setStep('uploading');
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/holded/upload-expense', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.ok || !data.assistantMessage?.metadata?.pendingExpense) {
        setError(data.reply ?? data.error ?? 'No se pudo leer el documento.');
        setStep('idle');
        return;
      }
      setExpense(data.assistantMessage.metadata.pendingExpense as ExtractedExpense);
      setStep('review');
    } catch {
      setError('Error de conexión.');
      setStep('idle');
    }
  };

  const handleRegister = async () => {
    if (!expense) return;
    setStep('saving');
    setError(null);
    try {
      const res = await fetch('/api/holded/actions/create-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expense }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Error al registrar.');
        setStep('review');
        return;
      }
      setStep('done');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch {
      setError('Error de conexión.');
      setStep('review');
    }
  };

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: expense?.currency ?? 'EUR',
    }).format(n);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload size={16} className="text-[#2361d8]" />
            <span className="font-semibold text-[#011c67]">Subir factura / ticket</span>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-slate-100"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {step === 'idle' && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              aria-label="Seleccionar factura o ticket"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <div
              className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 transition hover:border-[#2361d8]/40 hover:bg-[#2361d8]/5"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
            >
              <Upload size={28} className="text-slate-300" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600">Arrastra o haz clic para subir</p>
                <p className="text-xs text-slate-400">PDF, JPG, PNG, WebP · máx. 5 MB</p>
              </div>
            </div>
          </>
        )}

        {step === 'uploading' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 size={28} className="animate-spin text-[#2361d8]" />
            <p className="text-sm text-slate-500">Leyendo documento…</p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <CheckCircle2 size={32} className="text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700">Gasto registrado en Holded</p>
          </div>
        )}

        {(step === 'review' || step === 'saving') && expense && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <label
                  htmlFor="ue-supplier"
                  className="text-[11px] font-medium uppercase tracking-wide text-slate-400"
                >
                  Proveedor
                </label>
                <input
                  id="ue-supplier"
                  aria-label="Proveedor"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none"
                  value={expense.supplierName}
                  onChange={(e) => setExpense({ ...expense, supplierName: e.target.value })}
                />
              </div>
              <div>
                <label
                  htmlFor="ue-date"
                  className="text-[11px] font-medium uppercase tracking-wide text-slate-400"
                >
                  Fecha
                </label>
                <input
                  id="ue-date"
                  type="date"
                  aria-label="Fecha de la factura"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none"
                  value={expense.issueDate}
                  onChange={(e) => setExpense({ ...expense, issueDate: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label
                  htmlFor="ue-desc"
                  className="text-[11px] font-medium uppercase tracking-wide text-slate-400"
                >
                  Concepto
                </label>
                <input
                  id="ue-desc"
                  aria-label="Concepto"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none"
                  value={expense.description}
                  onChange={(e) => setExpense({ ...expense, description: e.target.value })}
                />
              </div>
            </div>
            {/* Amounts summary */}
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Base imponible</span>
                <span>{fmtMoney(expense.amountNet)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>IVA ({Math.round(expense.vatRate * 100)}%)</span>
                <span>{fmtMoney(expense.amountTax)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-800">
                <span>Total</span>
                <span>{fmtMoney(expense.amountTotal)}</span>
              </div>
            </div>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={step === 'saving'}
                onClick={handleRegister}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2361d8] py-2 text-sm font-semibold text-white hover:bg-[#1f55c0] disabled:opacity-60"
              >
                {step === 'saving' ? <Loader2 size={14} className="animate-spin" /> : null}
                Registrar en Holded
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [showUpload, setShowUpload] = useState(false);

  const reloadGastos = () => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ period });
    if (search) qs.set('search', search);
    fetch(`/api/isaak/gastos?${qs}`)
      .then((r) => r.json() as Promise<GastosResponse>)
      .then((res) => {
        if (!res.ok || !res.data) return;
        setData(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

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
              aria-label="Buscar gastos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white pl-7 pr-3 py-1.5 text-[12px] text-slate-700 placeholder-slate-400 w-40"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#2361d8] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1f55c0]"
          >
            <Upload size={12} />
            Subir factura
          </button>
        </div>
      </div>

      {showUpload && <UploadPanel onClose={() => setShowUpload(false)} onSuccess={reloadGastos} />}

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
