'use client';

import { useEffect, useMemo, useState } from 'react';

type Customer = { id: string; name: string };
type Quote = {
  id: string;
  number: string;
  status: string;
  issueDate: string;
  validUntil?: string | null;
  customerId: string;
  customer?: { name: string } | null;
  updatedAt: string;
};

const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function BudgetsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(todayISO());
  const [validUntil, setValidUntil] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [customersRes, quotesRes] = await Promise.all([
        fetch('/api/customers?limit=100'),
        fetch(`/api/quotes${statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''}`),
      ]);
      const customersData = await customersRes.json().catch(() => null);
      const quotesData = await quotesRes.json().catch(() => null);
      if (!customersRes.ok) throw new Error(customersData?.error || 'No se pudieron cargar clientes');
      if (!quotesRes.ok) throw new Error(quotesData?.error || 'No se pudieron cargar presupuestos');

      setCustomers(Array.isArray(customersData?.customers) ? customersData.customers : []);
      setQuotes(Array.isArray(quotesData?.items) ? quotesData.items : []);
      if (!customerId && customersData?.customers?.[0]?.id) {
        setCustomerId(customersData.customers[0].id);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error cargando presupuestos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const customerOptions = useMemo(
    () => customers.map((c) => ({ value: c.id, label: c.name })),
    [customers]
  );

  const createQuote = async () => {
    if (!customerId) {
      setMessage('Selecciona un cliente.');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          issueDate,
          validUntil: validUntil || null,
          lines: [],
          totals: { amountNet: 0, amountTax: 0, amountGross: 0 },
          status: 'draft',
          source: 'local',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo crear el presupuesto');
      setMessage(`Presupuesto ${data?.number || ''} creado.`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo crear el presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const actionQuote = async (id: string, action: 'send' | 'accept' | 'reject' | 'convert-to-invoice') => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/quotes/${id}/${action}`, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `No se pudo ejecutar ${action}`);
      setMessage(
        action === 'convert-to-invoice'
          ? `Presupuesto convertido en factura ${data?.invoice?.number || ''}.`
          : `Acción ${action} aplicada.`
      );
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : `No se pudo ejecutar ${action}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Presupuestos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Gestión local de presupuestos y sincronización bidireccional con integración contable vía API.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Nuevo presupuesto</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          >
            <option value="">Selecciona cliente</option>
            {customerOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          />
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          />
          <button
            onClick={createQuote}
            className="h-10 rounded-lg bg-[#0b6cfb] px-4 text-sm font-semibold text-white hover:bg-[#095edb]"
          >
            Crear borrador
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Listado</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 px-3 text-xs"
          >
            <option value="">Todos los estados</option>
            {QUOTE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Número</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td className="px-3 py-2 font-semibold text-slate-900">{q.number}</td>
                  <td className="px-3 py-2 text-slate-700">{q.customer?.name || q.customerId}</td>
                  <td className="px-3 py-2 text-slate-700">{new Date(q.issueDate).toLocaleDateString('es-ES')}</td>
                  <td className="px-3 py-2 text-slate-700">{q.status}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => actionQuote(q.id, 'send')}
                        className="rounded-full border border-slate-300 px-3 py-1 text-xs"
                      >
                        Enviar
                      </button>
                      <button
                        onClick={() => actionQuote(q.id, 'accept')}
                        className="rounded-full border border-slate-300 px-3 py-1 text-xs"
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={() => actionQuote(q.id, 'reject')}
                        className="rounded-full border border-slate-300 px-3 py-1 text-xs"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => actionQuote(q.id, 'convert-to-invoice')}
                        className="rounded-full bg-[#0b6cfb]/10 px-3 py-1 text-xs font-semibold text-[#0b6cfb]"
                      >
                        Convertir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {loading ? <p className="text-xs text-slate-500">Procesando...</p> : null}
      {message ? <p className="text-xs text-slate-700">{message}</p> : null}
    </div>
  );
}
