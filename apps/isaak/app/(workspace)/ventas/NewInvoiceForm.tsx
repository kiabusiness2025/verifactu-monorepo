'use client';

import { CheckCircle2, ChevronDown, Loader2, X, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Customer = { id: string; name: string; nif: string | null };

type SubmitResult = {
  ok: boolean;
  error?: string;
  invoice?: {
    id: string;
    number: string;
    customerName: string;
    issueDate: string;
    amountNet: number;
    amountTax: number;
    amountGross: number;
    taxRate: number;
  };
  verifactuStatus?: string;
  verifactuHash?: string | null;
};

const TAX_RATES = [
  { label: '21% — General', value: 0.21 },
  { label: '10% — Reducido', value: 0.1 },
  { label: '4% — Superreducido', value: 0.04 },
  { label: '0% — Exento', value: 0 },
];

function fmtMoney(value: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

function verifactuLabel(status?: string) {
  switch (status) {
    case 'validated':
    case 'accepted':
      return 'Registrada en AEAT';
    case 'accepted_with_errors':
      return 'Aceptada con advertencias';
    case 'pending':
      return 'Pendiente de registro';
    case 'error':
      return 'Error en registro';
    default:
      return status ?? 'Sin estado';
  }
}

export default function NewInvoiceForm({ onCreated }: { onCreated: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerNif, setCustomerNif] = useState('');
  const [description, setDescription] = useState('');
  const [amountNetStr, setAmountNetStr] = useState('');
  const [taxRate, setTaxRate] = useState(0.21);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/ventas/customers', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { ok?: boolean; customers?: Customer[] }) => {
        if (data.ok && data.customers) setCustomers(data.customers);
      })
      .catch(() => null);
  }, []);

  const amountNet = parseFloat(amountNetStr.replace(',', '.'));
  const amountTax = Number.isFinite(amountNet) ? Math.round(amountNet * taxRate * 100) / 100 : 0;
  const amountGross = Number.isFinite(amountNet)
    ? Math.round((amountNet + amountTax) * 100) / 100
    : 0;

  const filtered =
    customerName.trim().length > 0
      ? customers.filter((c) => c.name.toLowerCase().includes(customerName.toLowerCase()))
      : [];

  const handleSelectCustomer = (c: Customer) => {
    setCustomerName(c.name);
    setCustomerNif(c.nif ?? '');
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim()) {
      setFormError('Indica el nombre del cliente.');
      return;
    }
    if (!description.trim()) {
      setFormError('Indica el concepto de la factura.');
      return;
    }
    if (!Number.isFinite(amountNet) || amountNet <= 0) {
      setFormError('El importe neto debe ser mayor que 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/ventas/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerNif: customerNif.trim() || undefined,
          description: description.trim(),
          amountNet,
          taxRate,
          issueDate,
        }),
      });

      const data = (await res.json().catch(() => null)) as SubmitResult | null;
      setResult(data ?? { ok: false, error: 'Error al procesar la respuesta' });
      if (data?.ok) onCreated();
    } catch {
      setResult({ ok: false, error: 'Error de red al emitir la factura' });
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const success = result.ok;
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          {success ? (
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-500" />
          )}
          <div className="flex-1 space-y-1">
            {success && result.invoice ? (
              <>
                <p className="text-[15px] font-semibold text-slate-800">
                  Factura {result.invoice.number} emitida
                </p>
                <p className="text-[13px] text-slate-600">
                  {result.invoice.customerName} · {result.invoice.issueDate}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[13px]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Base
                    </p>
                    <p className="font-semibold text-slate-800">
                      {fmtMoney(result.invoice.amountNet)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      IVA {Math.round(result.invoice.taxRate * 100)}%
                    </p>
                    <p className="font-semibold text-slate-800">
                      {fmtMoney(result.invoice.amountTax)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Total
                    </p>
                    <p className="text-[15px] font-bold text-[#011c67]">
                      {fmtMoney(result.invoice.amountGross)}
                    </p>
                  </div>
                </div>
                {result.verifactuStatus && (
                  <p className="mt-2 text-[12px] text-slate-500">
                    VeriFactu:{' '}
                    <span
                      className={`font-semibold ${
                        result.verifactuStatus === 'validated' ||
                        result.verifactuStatus === 'accepted'
                          ? 'text-emerald-600'
                          : result.verifactuStatus === 'error'
                            ? 'text-rose-600'
                            : 'text-amber-600'
                      }`}
                    >
                      {verifactuLabel(result.verifactuStatus)}
                    </span>
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-[15px] font-semibold text-rose-700">
                  Error al emitir la factura
                </p>
                <p className="text-[13px] text-slate-600">{result.error ?? 'Error desconocido'}</p>
              </>
            )}
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => setResult(null)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Nueva factura
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-2xl border bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Customer name with autocomplete */}
        <div className="relative sm:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Cliente *
          </label>
          <input
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Nombre del cliente o empresa"
            className="h-[40px] w-full rounded-xl border border-slate-200 px-3 text-[13px] text-slate-800 outline-none focus:border-[#2361d8]/50 focus:ring-2 focus:ring-[#2361d8]/10"
            autoComplete="off"
          />
          {showSuggestions && filtered.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={() => handleSelectCustomer(c)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">{c.name}</span>
                  {c.nif && <span className="text-[11px] text-slate-500">{c.nif}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* NIF */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            NIF / CIF del cliente
          </label>
          <input
            value={customerNif}
            onChange={(e) => setCustomerNif(e.target.value)}
            placeholder="B12345678"
            className="h-[40px] w-full rounded-xl border border-slate-200 px-3 text-[13px] text-slate-800 outline-none focus:border-[#2361d8]/50 focus:ring-2 focus:ring-[#2361d8]/10"
          />
        </div>

        {/* Issue date */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Fecha de emisión
          </label>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="h-[40px] w-full rounded-xl border border-slate-200 px-3 text-[13px] text-slate-800 outline-none focus:border-[#2361d8]/50 focus:ring-2 focus:ring-[#2361d8]/10"
          />
        </div>

        {/* Description */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Concepto *
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Servicios de consultoría — mayo 2026"
            className="h-[40px] w-full rounded-xl border border-slate-200 px-3 text-[13px] text-slate-800 outline-none focus:border-[#2361d8]/50 focus:ring-2 focus:ring-[#2361d8]/10"
          />
        </div>

        {/* Amount net */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Importe neto (€) *
          </label>
          <input
            value={amountNetStr}
            onChange={(e) => setAmountNetStr(e.target.value)}
            placeholder="1000,00"
            inputMode="decimal"
            className="h-[40px] w-full rounded-xl border border-slate-200 px-3 text-[13px] text-slate-800 outline-none focus:border-[#2361d8]/50 focus:ring-2 focus:ring-[#2361d8]/10"
          />
        </div>

        {/* Tax rate */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            IVA
          </label>
          <div className="relative">
            <select
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value))}
              className="h-[40px] w-full appearance-none rounded-xl border border-slate-200 px-3 pr-8 text-[13px] text-slate-800 outline-none focus:border-[#2361d8]/50 focus:ring-2 focus:ring-[#2361d8]/10"
            >
              {TAX_RATES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Totals preview */}
      {Number.isFinite(amountNet) && amountNet > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-[#2361d8]/10 bg-[#2361d8]/5 p-4 text-[13px]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Base imponible
            </p>
            <p className="mt-0.5 font-semibold text-slate-800">{fmtMoney(amountNet)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              IVA {Math.round(taxRate * 100)}%
            </p>
            <p className="mt-0.5 font-semibold text-slate-800">{fmtMoney(amountTax)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Total factura
            </p>
            <p className="mt-0.5 text-[16px] font-bold text-[#011c67]">{fmtMoney(amountGross)}</p>
          </div>
        </div>
      )}

      {formError && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          <X size={14} className="shrink-0" />
          {formError}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <p className="text-[12px] text-slate-500">
          La factura se registrará en VeriFactu (AEAT) al emitir.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2361d8] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#1f55c0] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting ? 'Emitiendo...' : 'Emitir factura'}
        </button>
      </div>
    </form>
  );
}
