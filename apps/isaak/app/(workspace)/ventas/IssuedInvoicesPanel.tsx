'use client';

import { Download, FileText, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type IssuedInvoiceItem = {
  id: string;
  number: string;
  issueDate: string;
  customerName: string;
  customerNif: string | null;
  amountNet: number | null;
  amountTax: number | null;
  amountGross: number | null;
  status: string;
  verifactuStatus: string | null;
  verifactuHash: string | null;
  verifactuSubmissionId: string | null;
  updatedAt: string;
};

type IssuedInvoicesResponse = {
  ok: boolean;
  data?: {
    items: IssuedInvoiceItem[];
    total: number;
    customers: string[];
  };
  error?: string;
};

type PeriodValue =
  | 'current_month'
  | 'previous_month'
  | 'current_quarter'
  | 'previous_quarter'
  | 'current_year'
  | 'previous_year'
  | 'all';

function fmtMoney(value: number | null) {
  if (value === null) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function statusLabel(value: string | null) {
  if (!value) return 'Sin estado';
  switch (value) {
    case 'validated':
      return 'Validada';
    case 'accepted':
      return 'Aceptada';
    case 'accepted_with_errors':
      return 'Aceptada con errores';
    case 'pending':
      return 'Pendiente';
    case 'error':
      return 'Con error';
    default:
      return value;
  }
}

function statusClass(value: string | null) {
  if (value === 'validated' || value === 'accepted') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (value === 'accepted_with_errors') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (value === 'error') {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

export default function IssuedInvoicesPanel() {
  const [items, setItems] = useState<IssuedInvoiceItem[]>([]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [customer, setCustomer] = useState('');
  const [status, setStatus] = useState('all');
  const [period, setPeriod] = useState<PeriodValue>('current_month');
  const [sortBy, setSortBy] = useState('issueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          q: search,
          customer,
          status,
          period,
          sortBy,
          sortDir,
          limit: '100',
        });

        const res = await fetch(`/api/ventas/invoices/issued?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => null)) as IssuedInvoicesResponse | null;
        if (!res.ok || !data?.ok || !data.data) {
          throw new Error(data?.error || 'No se pudo cargar facturas emitidas');
        }

        setItems(data.data.items);
        setTotal(data.data.total);
        setCustomers(data.data.customers || []);
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'No se pudo cargar facturas emitidas');
      } finally {
        setLoading(false);
      }
    };

    void run();
    return () => controller.abort();
  }, [search, customer, status, period, sortBy, sortDir]);

  const periodOptions = useMemo(
    () => [
      { value: 'current_month', label: 'Mes actual' },
      { value: 'previous_month', label: 'Mes anterior' },
      { value: 'current_quarter', label: 'Trimestre actual' },
      { value: 'previous_quarter', label: 'Trimestre anterior' },
      { value: 'current_year', label: 'Año actual' },
      { value: 'previous_year', label: 'Año anterior' },
      { value: 'all', label: 'Todo el histórico' },
    ],
    []
  );

  const handleDownloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    if (downloadingPdf) return;
    setDownloadingPdf(invoiceId);
    try {
      const response = await fetch(`/api/ventas/invoices/${invoiceId}/pdf`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('No se pudo generar el PDF');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeNumber = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      link.download = `${safeNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descargar el PDF');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleExport = async (format: 'xlsx' | 'csv') => {
    if (exporting) return;

    setExporting(true);
    try {
      const params = new URLSearchParams({
        q: search,
        customer,
        status,
        period,
        sortBy,
        sortDir,
        format,
        exportLimit: '5000',
      });

      const response = await fetch(`/api/ventas/invoices/issued?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(
          format === 'csv' ? 'No se pudo generar el CSV' : 'No se pudo generar el Excel'
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        format === 'csv' ? 'facturas-emitidas-filtrado.csv' : 'facturas-emitidas-filtrado.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : format === 'csv'
            ? 'No se pudo descargar el CSV'
            : 'No se pudo descargar el Excel'
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 bg-white px-5 py-4">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
          <label className="col-span-1 xl:col-span-2">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Buscar
            </span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <Search size={14} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nº factura, cliente o NIF"
                className="w-full bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
          </label>

          <label>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Estado
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-[38px] w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none"
            >
              <option value="all">Todos</option>
              <option value="validated">Validada</option>
              <option value="accepted">Aceptada</option>
              <option value="accepted_with_errors">Aceptada con errores</option>
              <option value="pending">Pendiente</option>
              <option value="error">Con error</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Cliente
            </span>
            <select
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="h-[38px] w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none"
            >
              <option value="">Todos</option>
              {customers.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Periodo
            </span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodValue)}
              className="h-[38px] w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none"
            >
              {periodOptions.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Orden
            </span>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-[38px] rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none"
              >
                <option value="issueDate">Fecha</option>
                <option value="number">Numero</option>
                <option value="customerName">Cliente</option>
                <option value="amountGross">Total</option>
                <option value="updatedAt">Actualizada</option>
              </select>
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
                className="h-[38px] rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#fafbff] px-5 py-4">
        <div className="mb-3 flex items-center justify-between text-[12px] text-slate-500">
          <span>
            Mostrando <strong className="text-slate-700">{items.length}</strong> de{' '}
            <strong className="text-slate-700">{total}</strong> facturas emitidas
          </span>
          <div className="inline-flex items-center gap-2">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'xlsx' | 'csv')}
              disabled={exporting || loading}
              aria-label="Formato de exportacion"
              className="h-[32px] rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-semibold text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
            </select>
            <button
              type="button"
              onClick={() => void handleExport(exportFormat)}
              disabled={exporting || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {exporting
                ? 'Generando...'
                : exportFormat === 'csv'
                  ? 'Descargar CSV'
                  : 'Descargar Excel'}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Numero</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Base</th>
                <th className="px-4 py-3">IVA</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Cargando facturas...
                    </span>
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-rose-600">
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No hay facturas emitidas con los filtros actuales.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                items.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.number}</td>
                    <td className="px-4 py-3 text-slate-600">{row.issueDate}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{row.customerName}</p>
                      {row.customerNif && (
                        <p className="text-[11px] text-slate-500">{row.customerNif}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass(row.verifactuStatus)}`}
                      >
                        {statusLabel(row.verifactuStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{fmtMoney(row.amountNet)}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtMoney(row.amountTax)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {fmtMoney(row.amountGross)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void handleDownloadPdf(row.id, row.number)}
                        disabled={downloadingPdf === row.id}
                        title="Descargar PDF"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {downloadingPdf === row.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <FileText size={12} />
                        )}
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
