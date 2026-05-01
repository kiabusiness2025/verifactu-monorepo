'use client';

import { useState, useEffect } from 'react';
import { Zap, CheckCircle, AlertCircle } from 'lucide-react';

type FulfillmentCase = {
  id: string;
  orderId: string;
  orderNumber: string;
  tenantName: string;
  status: string;
  priority: string;
  taskCount: number;
  assignedTaskCount: number;
  createdAt: string;
  updatedAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  assigned: 'bg-blue-100 text-blue-700',
  'in-progress': 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-slate-500',
  medium: 'text-yellow-600',
  high: 'text-red-600',
};

export default function AdminFulfillmentPage() {
  const [cases, setCases] = useState<FulfillmentCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    const loadCases = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
        if (status) params.append('status', status);

        const res = await fetch(`/api/admin/fulfillment?${params}`);
        if (!res.ok) throw new Error('Failed to load fulfillment cases');

        const data = await res.json();
        setCases(data.cases);
        setTotal(data.pagination.total);
      } catch (error) {
        console.error('Error loading cases:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCases();
  }, [status, offset]);

  const handleStatusChange = async (caseId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/fulfillment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: caseId, status: newStatus }),
      });

      if (res.ok) {
        setOffset(0);
        setCases([]);
      }
    } catch (error) {
      console.error('Error updating case:', error);
    }
  };

  return (
    <main className="space-y-6">
      {/* Header */}
      <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Provisioning
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Cola de fulfillment</h1>
            <p className="mt-1 text-sm text-slate-600">
              Casos en {status ? `estado "${status}"` : 'todos los estados'} ({total} total)
            </p>
          </div>
          <Zap className="h-12 w-12 text-[#2361d8]/20" />
        </div>
      </header>

      {/* Filtro de estado */}
      <div className="flex flex-wrap gap-3">
        {['', 'pending', 'assigned', 'in-progress', 'completed', 'failed'].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setOffset(0);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              status === s
                ? 'bg-[#2361d8] text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {s ? s.replace('-', ' ') : 'Todos'}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Pedido</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Tenant</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Estado</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Prioridad</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Tareas</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Actualizado</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  Cargando...
                </td>
              </tr>
            ) : cases.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  No hay casos de fulfillment
                </td>
              </tr>
            ) : (
              cases.map((fc) => (
                <tr key={fc.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-[#2361d8]">{fc.orderNumber}</td>
                  <td className="px-6 py-4 text-slate-600">{fc.tenantName}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        STATUS_COLORS[fc.status] || STATUS_COLORS.pending
                      }`}
                    >
                      {fc.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td
                    className={`px-6 py-4 text-center font-semibold ${PRIORITY_COLORS[fc.priority] || 'text-slate-500'}`}
                  >
                    {fc.priority}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600">
                    {fc.assignedTaskCount}/{fc.taskCount}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(fc.updatedAt).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <select
                      value={fc.status}
                      onChange={(e) => handleStatusChange(fc.id, e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium"
                    >
                      <option value="pending">pending</option>
                      <option value="assigned">assigned</option>
                      <option value="in-progress">in-progress</option>
                      <option value="completed">completed</option>
                      <option value="failed">failed</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
        <p className="text-sm text-slate-600">
          Mostrando {offset + 1}–{Math.min(offset + limit, total)} de {total}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="rounded border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="rounded border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </main>
  );
}
