'use client';

import { useEffect, useState } from 'react';
import {
  LifeBuoy,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Plus,
  X,
} from 'lucide-react';

type SupportMessage = {
  id: string;
  direction: string;
  body: string;
  createdAt: string;
};

type Ticket = {
  id: string;
  status: string;
  priority: string;
  subject: string;
  channelType: string;
  orderId: string | null;
  lastMessageAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  messages: SupportMessage[];
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En gestión',
  waiting_user: 'Esperando respuesta',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-blue-50 text-blue-700 border border-blue-200',
    in_progress: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    waiting_user: 'bg-purple-50 text-purple-700 border border-purple-200',
    resolved: 'bg-green-50 text-green-700 border border-green-200',
    closed: 'bg-slate-100 text-slate-500 border border-slate-200',
  };
  const icons: Record<string, React.ReactNode> = {
    open: <AlertCircle className="h-3 w-3" />,
    in_progress: <Clock className="h-3 w-3" />,
    waiting_user: <Clock className="h-3 w-3" />,
    resolved: <CheckCircle className="h-3 w-3" />,
    closed: <CheckCircle className="h-3 w-3" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[status] ?? 'bg-slate-100 text-slate-500'}`}
    >
      {icons[status]}
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function NewTicketForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setFormError('El asunto y la descripción son obligatorios.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, description, priority }),
      });
      if (!res.ok) throw new Error('error');
      onCreated();
      onClose();
    } catch {
      setFormError('No hemos podido enviar tu consulta. Inténtalo de nuevo.');
      setSubmitting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-blue-100 bg-blue-50/50 shadow-sm">
      <div className="flex items-center justify-between border-b border-blue-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Nueva consulta</p>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-slate-400 hover:bg-blue-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        <div>
          <label className="block text-xs font-medium text-slate-700">Asunto</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="¿En qué podemos ayudarte?"
            maxLength={120}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0b6cfb] focus:outline-none focus:ring-2 focus:ring-[#0b6cfb]/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cuéntanos con detalle qué ha pasado o qué necesitas..."
            rows={4}
            maxLength={2000}
            className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0b6cfb] focus:outline-none focus:ring-2 focus:ring-[#0b6cfb]/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Prioridad</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0b6cfb] focus:outline-none focus:ring-2 focus:ring-[#0b6cfb]/20"
          >
            <option value="low">Baja</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>

        {formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-[#0b6cfb] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#095edb] disabled:opacity-50"
          >
            {submitting ? 'Enviando…' : 'Enviar consulta'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function loadTickets() {
    setLoading(true);
    fetch('/api/support/tickets?limit=50', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setTickets(data.items ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError('No hemos podido cargar tus consultas.');
        setLoading(false);
      });
  }

  useEffect(() => {
    loadTickets();
  }, []);

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
            <LifeBuoy className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Soporte</h1>
            <p className="text-xs text-slate-500">Tus consultas y tickets de ayuda</p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0b6cfb] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#095edb]"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva consulta
          </button>
        )}
      </div>

      {/* New ticket form */}
      {showForm && (
        <NewTicketForm
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            loadTickets();
          }}
        />
      )}

      {/* Content */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && tickets.length === 0 && !showForm && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-8 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">No hay consultas abiertas</p>
          <p className="mt-1 text-xs text-slate-400">
            Si tienes alguna duda o problema, abre una nueva consulta.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#0b6cfb] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#095edb]"
          >
            <Plus className="h-3.5 w-3.5" />
            Abrir consulta
          </button>
        </div>
      )}

      {!loading && !error && tickets.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {tickets.map((ticket) => {
              const lastMsg = ticket.messages[0];
              return (
                <li key={ticket.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {ticket.subject}
                        </p>
                        <span className="text-[10px] font-medium text-slate-400">
                          {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                        </span>
                      </div>
                      {lastMsg && (
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {lastMsg.direction === 'inbound' ? 'Tú: ' : 'Soporte: '}
                          {lastMsg.body}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-slate-300">
                        {formatDate(ticket.lastMessageAt ?? ticket.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <StatusBadge status={ticket.status} />
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
