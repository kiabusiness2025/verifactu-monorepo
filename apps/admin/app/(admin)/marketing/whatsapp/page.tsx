'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminGet } from '@/lib/adminApi';
import { MessageSquare, Bot, User2, RefreshCw, Tag } from 'lucide-react';

type Stats = {
  threads: { total: number; open: number; human: number };
  messages: { total: number; inbound: number; outbound: number; last_30_days: number };
};

type ThreadRow = {
  id: string;
  phoneNumber: string;
  status: string;
  mode: string;
  language: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  tenant: { id: string; name: string } | null;
  assignedAgent: { id: string; name: string | null; email: string } | null;
  events: { id: string; body: string | null; direction: string; occurredAt: string }[];
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-100 text-slate-600',
  opted_out: 'bg-red-100 text-red-700',
};

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function WhatsAppPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const [modeFilter, setModeFilter] = useState('all');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    adminGet<Stats>('/api/admin/whatsapp/stats').then(setStats).catch(console.error);
  }, [refreshKey]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (modeFilter !== 'all') params.set('mode', modeFilter);
    if (phoneSearch.trim()) params.set('phone', phoneSearch.trim());
    params.set('limit', '100');

    adminGet<{ items: ThreadRow[] }>(`/api/admin/whatsapp/threads?${params}`)
      .then(({ items }) => setThreads(items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter, modeFilter, phoneSearch, refreshKey]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">WhatsApp</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/marketing/whatsapp/templates"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Tag className="h-4 w-4" />
            Plantillas
          </Link>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Conversaciones"
            value={stats.threads.total}
            icon={<MessageSquare className="h-5 w-5 text-emerald-600" />}
          />
          <StatCard
            label="Abiertas"
            value={stats.threads.open}
            icon={<MessageSquare className="h-5 w-5 text-sky-600" />}
          />
          <StatCard
            label="Modo humano"
            value={stats.threads.human}
            icon={<User2 className="h-5 w-5 text-violet-600" />}
          />
          <StatCard
            label="Mensajes (30d)"
            value={stats.messages.last_30_days}
            icon={<Bot className="h-5 w-5 text-amber-600" />}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          title="Filtrar por estado"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Todos los estados</option>
          <option value="open">Abiertas</option>
          <option value="closed">Cerradas</option>
          <option value="opted_out">Opt-out</option>
        </select>
        <select
          title="Filtrar por modo"
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Bot + Humano</option>
          <option value="bot">Solo bot</option>
          <option value="human">Solo humano</option>
        </select>
        <input
          type="text"
          value={phoneSearch}
          onChange={(e) => setPhoneSearch(e.target.value)}
          placeholder="Buscar por teléfono..."
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-52"
        />
      </div>

      {/* Thread table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Teléfono</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Último mensaje</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Modo</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Tenant</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Agente</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Actividad</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  Cargando...
                </td>
              </tr>
            ) : threads.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  Sin resultados
                </td>
              </tr>
            ) : (
              threads.map((t) => (
                <tr
                  key={t.id}
                  className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/marketing/whatsapp/${t.id}`}
                      className="font-mono text-emerald-700 hover:underline"
                    >
                      {t.phoneNumber}
                    </Link>
                    {t.language && (
                      <span className="ml-2 text-xs text-slate-400 uppercase">{t.language}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <span className="truncate block text-slate-600 text-xs">
                      {t.events[0]?.body?.slice(0, 80) ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] ?? 'bg-slate-100 text-slate-600'}`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.mode === 'human' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-violet-700 font-medium">
                        <User2 className="h-3 w-3" /> Humano
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Bot className="h-3 w-3" /> Bot
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{t.tenant?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {t.assignedAgent?.name ?? t.assignedAgent?.email ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {relativeTime(t.lastMessageAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4">
      <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}
