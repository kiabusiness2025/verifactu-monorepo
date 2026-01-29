'use client';

import { useEffect, useState } from 'react';
import {
  Mail,
  Clock,
  AlertCircle,
  Check,
  Archive,
  RefreshCw,
  Send,
  Inbox,
  X,
  Plus,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { useToast } from '@/components/notifications/ToastNotifications';

{
  /* Help section */
}
<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
  <div className="flex gap-3">
    <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
    <div className="text-sm text-blue-900">
      <p className="font-semibold mb-1">Informacion</p>
      <p className="text-blue-700">
        Inserta emails de prueba para poblar la bandeja y prueba envíos reales con todas las
        opciones de Resend. Todos los correos se envían siempre desde{' '}
        <strong>Verifactu Business</strong> usando la cuenta soporte@verifactu.business.
      </p>
    </div>
  </div>
</div>;
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
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<'inbox' | 'compose' | 'settings'>('inbox');

  // Inbox state
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'responded'>('all');
  const [stats, setStats] = useState({ total: 0, pending: 0 });

  // Reply state
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replySubject, setReplySubject] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySuccess, setReplySuccess] = useState(false);

  // Compose state (new email)
  const [composeFrom, setComposeFrom] = useState('usuario@ejemplo.com');
  const [composeName, setComposeName] = useState('Usuario de Prueba');
  const [composeSubject, setComposeSubject] = useState('Pregunta sobre facturas');
  const [composeMessage, setComposeMessage] = useState(
    'Hola, tengo una pregunta sobre cómo validar mis facturas...'
  );
  const [composeSending, setComposeSending] = useState(false);
  const [composeSuccess, setComposeSuccess] = useState(false);

  // Real send (Resend full options)
  const [sendTo, setSendTo] = useState('cliente@ejemplo.com');
  const [sendCc, setSendCc] = useState('');
  const [sendBcc, setSendBcc] = useState('');
  const [sendReplyTo, setSendReplyTo] = useState('soporte@verifactu.business');
  const [sendSubject, setSendSubject] = useState('Actualización de tu factura');
  const [sendText, setSendText] = useState('Hola, adjunto la actualización de tu factura.');
  const [sendHtml, setSendHtml] = useState('<p>Hola, adjunto la actualización de tu factura.</p>');
  const [sendTagsInput, setSendTagsInput] = useState('categoria:soporte\nproyecto:verifactu');
  const [sendAttachmentsInput, setSendAttachmentsInput] = useState(`[
  {"filename":"nota.txt","content":"Q29udGVuaWRvIGRlIGVqZW1wbG8u"}
]`);
  const [sendSending, setSendSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'inbox') {
      loadEmails();
    }
  }, [activeTab]);

  async function sendReplyEmail() {
    if (!selectedEmail || !replyMessage.trim()) return;

    try {
      setReplySending(true);
      setReplyError(null);
      setReplySuccess(false);

      const response = await fetch('/api/admin/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalEmailId: selectedEmail.id,
          subject: replySubject || `Re: ${selectedEmail.subject}`,
          message: replyMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setReplyError(data.error || 'Error al enviar la respuesta');
        return;
      }

      setReplySuccess(true);
      setReplyMessage('');
      setReplySubject('');

      // Actualizar el estado del email en la UI
      setEmails((prev) =>
        prev.map((e) => (e.id === selectedEmail.id ? { ...e, status: 'responded' } : e))
      );

      if (selectedEmail) {
        setSelectedEmail({ ...selectedEmail, status: 'responded' });
      }

      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        setShowReplyModal(false);
        setReplySuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error sending reply:', error);
      setReplyError('Error al enviar la respuesta. Intenta nuevamente.');
    } finally {
      setReplySending(false);
    }
  }

  function openReplyModal() {
    if (!selectedEmail) return;
    setReplySubject(`Re: ${selectedEmail.subject}`);
    setReplyMessage('');
    setReplyError(null);
    setReplySuccess(false);
    setShowReplyModal(true);
  }

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
        body: JSON.stringify({ emailId, status }),
      });

      if (response.ok) {
        setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, status } : e)));
        setStats((prev) => ({
          ...prev,
          pending: status === 'pending' ? prev.pending + 1 : prev.pending - 1,
        }));
        if (selectedEmail?.id === emailId) {
          setSelectedEmail({ ...selectedEmail, status });
        }
      }
    } catch (error) {
      console.error('Error updating email status:', error);
    }
  }

  async function insertTestEmail() {
    try {
      setComposeSending(true);
      setComposeSuccess(false);

      const response = await fetch('/api/admin/emails/insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_email: composeFrom,
          from_name: composeName,
          to_email: 'soporte@verifactu.business',
          subject: composeSubject,
          text_content: composeMessage,
          priority: 'normal',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showError(
          'Error al insertar email',
          data.error || 'No se pudo insertar el email de prueba'
        );
        return;
      }

      setComposeSuccess(true);
      success('Email insertado', 'El email de prueba se insert\u00f3 correctamente');
      await loadEmails();

      setComposeFrom('usuario@ejemplo.com');
      setComposeName('Usuario de Prueba');
      setComposeSubject('Pregunta sobre facturas');
      setComposeMessage('Hola, tengo una pregunta...');

      setTimeout(() => {
        setActiveTab('inbox');
      }, 1500);
    } catch (error) {
      console.error('Error inserting test email:', error);
      showError('Error al insertar email', 'No se pudo insertar el email de prueba');
    } finally {
      setComposeSending(false);
    }
  }

  async function sendCustomEmail() {
    try {
      setSendSending(true);
      setSendError(null);
      setSendSuccess(false);

      const toList = sendTo
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      const ccList = sendCc
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      const bccList = sendBcc
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

      if (toList.length === 0) {
        setSendError('Agrega al menos un destinatario');
        setSendSending(false);
        return;
      }

      // Parse tags: formato clave:valor por línea
      const tags = sendTagsInput
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [key, ...rest] = line.split(':');
          return { name: key?.trim() || '', value: rest.join(':').trim() };
        })
        .filter((t) => t.name && t.value);

      // Parse attachments JSON opcional
      let attachments: Array<{ filename: string; content: string }> | undefined;
      if (sendAttachmentsInput.trim()) {
        try {
          const parsed = JSON.parse(sendAttachmentsInput);
          if (Array.isArray(parsed)) {
            attachments = parsed
              .filter((a) => a.filename && a.content)
              .map((a) => ({ filename: a.filename, content: a.content }));
          }
        } catch (err) {
          setSendError('Revisa el JSON de adjuntos');
          setSendSending(false);
          return;
        }
      }

      const response = await fetch('/api/admin/emails/send/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toList,
          cc: ccList.length ? ccList : undefined,
          bcc: bccList.length ? bccList : undefined,
          replyTo: sendReplyTo || undefined,
          subject: sendSubject,
          text: sendText,
          html: sendHtml,
          tags: tags.length ? tags : undefined,
          attachments,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSendError(data.error || 'No se pudo enviar el correo');
        return;
      }

      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 2000);
    } catch (error) {
      console.error('Error sending custom email:', error);
      setSendError('Error al enviar el correo');
    } finally {
      setSendSending(false);
    }
  }

  const filteredEmails = emails.filter((email) => {
    if (filter === 'all') return true;
    return email.status === filter;
  });

  const getPriorityColor = (priority: Email['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'normal':
        return 'text-blue-600 bg-blue-50';
      case 'low':
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: Email['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'responded':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'archived':
        return <Archive className="h-4 w-4 text-gray-500" />;
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
    return d.toLocaleString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-4">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'inbox'
                ? 'bg-[#0b6cfb] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Inbox className="h-4 w-4" />
            Bandeja de entrada
          </button>
          <button
            onClick={() => setActiveTab('compose')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'compose'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Send className="h-4 w-4" />
            Enviar correo
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'settings'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Settings className="h-4 w-4" />
            Configuración
          </button>
        </div>

        {activeTab === 'inbox' && (
          <button
            onClick={loadEmails}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-[#0b6cfb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a5be0] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        )}
      </div>

      {/* Inbox Tab */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
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
                  <div className="text-2xl font-bold text-green-900">
                    {stats.total - stats.pending}
                  </div>
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
                  <p className="text-xs text-slate-500">Los nuevos mensajes aparecerán aquí</p>
                </div>
              ) : (
                filteredEmails.map((email) => (
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
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getPriorityColor(
                              email.priority
                            )}`}
                          >
                            {email.priority === 'high' && ''}
                            {email.priority === 'normal' && ''}
                            {email.priority === 'low' && ''}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900 truncate">{email.subject}</h3>
                        <p className="text-xs text-slate-600 mt-1">De: {email.from}</p>
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">{email.text}</p>
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
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityColor(
                          selectedEmail.priority
                        )}`}
                      >
                        {selectedEmail.priority === 'high' && ' Alta'}
                        {selectedEmail.priority === 'normal' && ' Normal'}
                        {selectedEmail.priority === 'low' && ' Baja'}
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

                  {/* Reply Button - New */}
                  <button
                    onClick={openReplyModal}
                    className="w-full rounded-lg bg-[#0b6cfb] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#0a5be0] flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Responder desde soporte@verifactu.business
                  </button>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-center py-12">
                  <div>
                    <Mail className="mx-auto h-16 w-16 text-slate-300" />
                    <p className="mt-4 text-sm font-semibold text-slate-900">Selecciona un email</p>
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
                  <p className="font-semibold mb-1">Informacion</p>
                  <p className="text-blue-700">
                    Para ver emails reales, configura el webhook de Resend y una base de datos para
                    almacenar los mensajes entrantes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* COMPOSE TAB - Insertar email de prueba */}
      {activeTab === 'compose' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1"> Enviar correo</h2>
            <p className="text-sm text-slate-600 mb-4">
              Todas las opciones disponibles: múltiples destinatarios, CC, BCC, Reply-To, tags y
              adjuntos.
            </p>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Para</label>
                  <input
                    type="text"
                    value={sendTo}
                    onChange={(e) => setSendTo(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-[#0b6cfb] focus:outline-none focus:ring-2 focus:ring-[#0b6cfb]/20"
                    placeholder="correo1@dominio.com, correo2@dominio.com"
                  />
                  <p className="text-xs text-slate-500 mt-1">Separar con comas.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    CC (opcional)
                  </label>
                  <input
                    type="text"
                    value={sendCc}
                    onChange={(e) => setSendCc(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-[#0b6cfb] focus:outline-none focus:ring-2 focus:ring-[#0b6cfb]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    BCC (opcional)
                  </label>
                  <input
                    type="text"
                    value={sendBcc}
                    onChange={(e) => setSendBcc(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-[#0b6cfb] focus:outline-none focus:ring-2 focus:ring-[#0b6cfb]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Reply-To
                  </label>
                  <input
                    type="email"
                    value={sendReplyTo}
                    onChange={(e) => setSendReplyTo(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-[#0b6cfb] focus:outline-none focus:ring-2 focus:ring-[#0b6cfb]/20"
                    placeholder="respuestas@dominio.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Asunto</label>
                <input
                  type="text"
                  value={sendSubject}
                  onChange={(e) => setSendSubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-[#0b6cfb] focus:outline-none focus:ring-2 focus:ring-[#0b6cfb]/20"
                  placeholder="Asunto del correo"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Texto plano
                  </label>
                  <textarea
                    value={sendText}
                    onChange={(e) => setSendText(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-[#0b6cfb] focus:outline-none focus:ring-2 focus:ring-[#0b6cfb]/20 font-mono"
                    rows={8}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    HTML (opcional)
                  </label>
                  <textarea
                    value={sendHtml}
                    onChange={(e) => setSendHtml(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-[#0b6cfb] focus:outline-none focus:ring-2 focus:ring-[#0b6cfb]/20 font-mono"
                    rows={8}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tags (clave:valor, una por línea)
                  </label>
                  <textarea
                    value={sendTagsInput}
                    onChange={(e) => setSendTagsInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-[#0b6cfb] focus:outline-none focus:ring-2 focus:ring-[#0b6cfb]/20 font-mono"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Adjuntos (JSON opcional)
                  </label>
                  <textarea
                    value={sendAttachmentsInput}
                    onChange={(e) => setSendAttachmentsInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-[#0b6cfb] focus:outline-none focus:ring-2 focus:ring-[#0b6cfb]/20 font-mono"
                    rows={4}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Formato: [{'{'}
                    &quot;filename&quot;:&quot;nota.txt&quot;,&quot;content&quot;:&quot;BASE64&quot;
                    {'}'}]
                  </p>
                </div>
              </div>

              {sendError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {sendError}
                </div>
              )}
              {sendSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  Correo enviado correctamente.
                </div>
              )}

              <button
                onClick={sendCustomEmail}
                disabled={sendSending || !sendTo || !sendSubject || (!sendText && !sendHtml)}
                className="w-full rounded-lg bg-[#0b6cfb] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0a5be0] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendSending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar correo real
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex gap-3">
              <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Informacion</p>
                <p className="text-blue-700">
                  Envía correos a tus clientes con todas las opciones de Resend. Todos los correos
                  se envían desde <strong>Verifactu Business</strong> usando
                  soporte@verifactu.business.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              ️ Configuración del Buzón
            </h2>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 mb-2"> Email de Soporte</h3>
                <p className="text-sm text-slate-600 mb-3">Todos los correos se envían desde:</p>
                <div className="bg-slate-100 px-4 py-2 rounded-lg font-mono text-sm text-slate-900">
                  Verifactu Business &lt;soporte@verifactu.business&gt;
                </div>
              </div>

              {/* Webhook configuration */}
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                   Configuración de Webhook (Producción)
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Para recibir emails reales en producción, configura el webhook de Resend:
                </p>
                <div className="bg-slate-100 px-4 py-2 rounded-lg font-mono text-xs text-slate-900 overflow-auto">
                  https://app.verifactu.business/api/webhooks/resend/inbound
                </div>
              </div>

              {/* API Endpoints */}
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 mb-2"> API Endpoints</h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-900">
                      GET /api/admin/emails
                    </p>
                    <p className="text-slate-600 mt-1">Obtener lista de emails</p>
                  </div>
                  <div>
                    <p className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-900">
                      POST /api/admin/emails/send
                    </p>
                    <p className="text-slate-600 mt-1">
                      Enviar respuesta desde soporte@verifactu.business
                    </p>
                  </div>
                  <div>
                    <p className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-900">
                      POST /api/admin/emails/send/custom
                    </p>
                    <p className="text-slate-600 mt-1">
                      Enviar correo nuevo con CC/BCC/Reply-To/Tags/Adjuntos
                    </p>
                  </div>
                  <div>
                    <p className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-900">
                      PATCH /api/admin/emails
                    </p>
                    <p className="text-slate-600 mt-1">Cambiar estado de email</p>
                  </div>
                </div>
              </div>

              {/* Help */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <p className="font-semibold mb-1">Informacion</p>
                    <p>
                      En <strong>desarrollo local</strong>, usa la pestana &quot;Insertar email de
                      prueba&quot; para crear emails de prueba. En <strong>produccion</strong>, los
                      emails se reciben automaticamente via webhook desde Resend.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Responder email</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Respondiendo a: <span className="font-semibold">{selectedEmail?.from}</span>
                </p>
              </div>
              <button
                onClick={() => setShowReplyModal(false)}
                className="rounded-lg p-2 hover:bg-slate-100 text-slate-600"
                disabled={replySending}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* From */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Desde</label>
                <div className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-700 font-medium">
                  soporte@verifactu.business
                </div>
              </div>

              {/* To */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Para</label>
                <div className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-700 font-medium">
                  {selectedEmail?.from}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Asunto</label>
                <input
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-[#0b6cfb] focus:outline-none focus:ring-2 focus:ring-[#0b6cfb]/20"
                  placeholder="Re: ..."
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Mensaje</label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-[#0b6cfb] focus:outline-none focus:ring-2 focus:ring-[#0b6cfb]/20 font-mono"
                  placeholder="Escribe tu respuesta aquí..."
                  rows={8}
                />
                <p className="text-xs text-slate-500 mt-1">{replyMessage.length} caracteres</p>
              </div>

              {/* Error Message */}
              {replyError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <X className="h-4 w-4" />
                    {replyError}
                  </p>
                </div>
              )}

              {/* Success Message */}
              {replySuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-sm text-green-600 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Respuesta enviada correctamente desde soporte@verifactu.business
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex gap-2 justify-end">
              <button
                onClick={() => setShowReplyModal(false)}
                disabled={replySending}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={sendReplyEmail}
                disabled={replySending || !replyMessage.trim()}
                className="flex items-center gap-2 rounded-lg bg-[#0b6cfb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a5be0] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {replySending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar respuesta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
