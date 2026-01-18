"use client";

import { useEffect, useState } from "react";
import { Mail, Clock, AlertCircle, Check, Archive, RefreshCw, Send, FlaskConical } from "lucide-react";

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  receivedAt: string;
  status: 'pending' | 'responded' | 'archived';
  priority: 'low' | 'normal' | 'high';
}

interface EmailsData {
  emails: Email[];
  total: number;
  pending: number;
  note?: string;
}

export default function AdminEmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'responded'>('all');
  const [stats, setStats] = useState({ total: 0, pending: 0 });

  useEffect(() => {
    loadEmails();
  }, []);

  async function loadEmails() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/emails');
      const data: EmailsData = await response.json();
      
      if (data.emails) {
        setEmails(data.emails);
        setStats({ total: data.total, pending: data.pending });
      }
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateEmailStatus(emailId: string, status: Email['status']) {
    try {
      const response = await fetch('/api/admin/emails', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, status })
      });

      if (response.ok) {
        // Actualizar localmente
        setEmails(prev => prev.map(e => 
          e.id === emailId ? { ...e, status } : e
        ));
        
        // Actualizar stats
        setStats(prev => ({
          ...prev,
          pending: status === 'pending' ? prev.pending + 1 : prev.pending - 1
        }));

        if (selectedEmail?.id === emailId) {
          setSelectedEmail({ ...selectedEmail, status });
        }
      }
    } catch (error) {
      console.error('Error updating email status:', error);
    }
  }

  const filteredEmails = emails.filter(email => {
    if (filter === 'all') return true;
    return email.status === filter;
  });

  const getPriorityColor = (priority: Email['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'normal': return 'text-blue-600 bg-blue-50';
      case 'low': return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: Email['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'responded': return <Check className="h-4 w-4 text-green-500" />;
      case 'archived': return <Archive className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bandeja de Correo
          </h1>
          <p className="text-sm text-slate-500">
            soporte@verifactu.business
          </p>
        </div>
        <button
          onClick={loadEmails}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[#0b6cfb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a5be0] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-3">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
              <div className="text-xs text-slate-500">Total de emails</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-3">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-900">{stats.pending}</div>
              <div className="text-xs text-orange-700">Pendientes</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-900">{stats.total - stats.pending}</div>
              <div className="text-xs text-green-700">Respondidos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            filter === 'all'
              ? 'bg-[#0b6cfb] text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Todos ({emails.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            filter === 'pending'
              ? 'bg-orange-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Pendientes ({stats.pending})
        </button>
        <button
          onClick={() => setFilter('responded')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            filter === 'responded'
              ? 'bg-green-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Respondidos ({stats.total - stats.pending})
        </button>
      </div>

      {/* Email List */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* List Panel */}
        <div className="space-y-2">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-400" />
              <p className="mt-2 text-sm text-slate-500">Cargando emails...</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <Mail className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-900">
                No hay emails {filter !== 'all' && filter}
              </p>
              <p className="text-xs text-slate-500">
                Los nuevos mensajes aparecerán aquí
              </p>
            </div>
          ) : (
            filteredEmails.map(email => (
              <button
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`w-full rounded-xl border bg-white p-4 text-left transition-all hover:shadow-md ${
                  selectedEmail?.id === email.id
                    ? 'border-[#0b6cfb] ring-2 ring-[#0b6cfb]/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(email.status)}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getPriorityColor(email.priority)}`}>
                        {email.priority === 'high' && '🔴'}
                        {email.priority === 'normal' && '🔵'}
                        {email.priority === 'low' && '⚪'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 truncate">
                      {email.subject}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      De: {email.from}
                    </p>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                      {email.text}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(email.receivedAt)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          {selectedEmail ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {selectedEmail.subject}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      De: <span className="font-semibold">{selectedEmail.from}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(selectedEmail.receivedAt).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityColor(selectedEmail.priority)}`}>
                    {selectedEmail.priority === 'high' && '🔴 Alta'}
                    {selectedEmail.priority === 'normal' && '🔵 Normal'}
                    {selectedEmail.priority === 'low' && '⚪ Baja'}
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 p-4 mb-4">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedEmail.text}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-200">
                {selectedEmail.status === 'pending' && (
                  <button
                    onClick={() => updateEmailStatus(selectedEmail.id, 'responded')}
                    className="flex-1 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
                  >
                    <Check className="inline-block h-4 w-4 mr-2" />
                    Marcar como respondido
                  </button>
                )}
                {selectedEmail.status === 'responded' && (
                  <button
                    onClick={() => updateEmailStatus(selectedEmail.id, 'pending')}
                    className="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                  >
                    <Clock className="inline-block h-4 w-4 mr-2" />
                    Marcar como pendiente
                  </button>
                )}
                <button
                  onClick={() => updateEmailStatus(selectedEmail.id, 'archived')}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Archive className="inline-block h-4 w-4 mr-2" />
                  Archivar
                </button>
              </div>

              {/* Reply Button */}
              <a
                href={`mailto:${selectedEmail.from}?subject=Re: ${selectedEmail.subject}`}
                className="block w-full rounded-lg bg-[#0b6cfb] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#0a5be0]"
              >
                <Mail className="inline-block h-4 w-4 mr-2" />
                Responder por email
              </a>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center py-12">
              <div>
                <Mail className="mx-auto h-16 w-16 text-slate-300" />
                <p className="mt-4 text-sm font-semibold text-slate-900">
                  Selecciona un email
                </p>
                <p className="text-xs text-slate-500">
                  Haz click en un mensaje para ver los detalles
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Note */}
      {emails.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Datos de demostración</p>
              <p className="text-blue-700">
                Para ver emails reales, configura el webhook de Resend y una base de datos para almacenar los mensajes entrantes.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
