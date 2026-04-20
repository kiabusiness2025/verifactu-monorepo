'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { TableSkeleton } from '@/components/accessibility/LoadingSkeleton';
import { useToast } from '@/components/notifications/ToastNotifications';
import { adminGet } from '@/lib/adminApi';
import { formatShortDate } from '@/src/lib/formatters';

type TicketRow = {
  id: string;
  status: string;
  priority: string;
  subject: string;
  description: string;
  channelType: string;
  lastMessageAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  metadataJson?: {
    requesterEmail?: string;
    requesterName?: string;
    company?: string;
    product?: string;
    category?: string;
    url?: string;
  } | null;
  tenant?: { id: string; name: string; legalName?: string | null; nif?: string | null } | null;
  openedByUser?: { id: string; email?: string | null; name?: string | null } | null;
  assignedToUser?: { id: string; email?: string | null; name?: string | null } | null;
  messages: Array<{
    id: string;
    body: string;
    direction: string;
    createdAt: string;
  }>;
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Abiertos' },
  { value: 'waiting_user', label: 'Esperando usuario' },
  { value: 'resolved', label: 'Resueltos' },
  { value: 'closed', label: 'Cerrados' },
];

const CHANNEL_OPTIONS = [
  { value: 'all', label: 'Todos los canales' },
  { value: 'landing', label: 'Landing' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone', label: 'Telefono' },
];

function statusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'resolved') return 'bg-emerald-50 text-emerald-700';
  if (normalized === 'closed') return 'bg-slate-100 text-slate-700';
  if (normalized === 'waiting_user') return 'bg-amber-50 text-amber-700';
  return 'bg-sky-50 text-sky-700';
}

export default function SupportTicketsPage() {
  const { error: showError } = useToast();
  const [items, setItems] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [channel, setChannel] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (status !== 'all') query.set('status', status);
        if (channel !== 'all') query.set('channel', channel);

        const response = await adminGet<{ items: TicketRow[] }>(
          `/api/admin/support-tickets?${query.toString()}`
        );

        if (mounted) {
          setItems(response.items || []);
        }
      } catch (error) {
        if (mounted) {
          showError(error instanceof Error ? error.message : 'No se pudieron cargar los tickets');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [channel, showError, status]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const tenantName = item.tenant?.legalName || item.tenant?.name || '';
      const requesterEmail = item.metadataJson?.requesterEmail || item.openedByUser?.email || '';
      const requesterName = item.metadataJson?.requesterName || item.openedByUser?.name || '';
      const company = item.metadataJson?.company || '';
      return [
        item.subject,
        item.description,
        tenantName,
        requesterEmail,
        requesterName,
        company,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [items, search]);

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tickets de soporte</h1>
          <p className="text-sm text-slate-600">
            Bandeja central para tickets creados desde landing y desde la app.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filtrar tickets por estado"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            aria-label="Filtrar tickets por canal"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por asunto, tenant o solicitante"
            className="min-w-[280px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </header>

      {loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Solicitante</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Ultimo movimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.map((item) => {
                const latestMessage = item.messages[0];
                const requester =
                  item.metadataJson?.requesterName ||
                  item.openedByUser?.name ||
                  item.openedByUser?.email;
                const requesterEmail =
                  item.metadataJson?.requesterEmail || item.openedByUser?.email || 'Sin email';

                return (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.subject}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.id}</div>
                      <div className="mt-2 max-w-xl text-sm text-slate-600">
                        {latestMessage?.body || item.description}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-medium text-slate-900">{requester || 'Sin nombre'}</div>
                      <div className="text-xs text-slate-500">{requesterEmail}</div>
                      {item.metadataJson?.company ? (
                        <div className="mt-1 text-xs text-slate-500">
                          {item.metadataJson.company}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-medium text-slate-900">
                        {item.tenant?.legalName || item.tenant?.name || 'Sin tenant'}
                      </div>
                      {item.tenant?.id ? (
                        <Link
                          href={`/tenants/${item.tenant.id}`}
                          className="mt-1 inline-flex text-xs text-sky-700 hover:text-sky-800"
                        >
                          Ver tenant
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-medium uppercase tracking-wide text-slate-800">
                        {item.channelType}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{item.priority}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{formatShortDate(item.lastMessageAt || item.createdAt)}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Creado {formatShortDate(item.createdAt)}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={6}>
                    No hay tickets con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
