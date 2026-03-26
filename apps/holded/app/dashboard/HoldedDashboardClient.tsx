'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Pencil,
  KeyRound,
  Loader2,
  PlugZap,
  SendHorizonal,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react';

type SessionInfo = {
  email: string | null;
  tenantId: string | null;
  tenantName: string | null;
  legalName: string | null;
  taxId: string | null;
  keyMasked: string | null;
  connectedAt: string | null;
  lastValidatedAt: string | null;
  supportedModules: string[];
  validationSummary: string | null;
  isAdmin?: boolean;
};

type Message = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

type ConversationSummary = {
  id: string;
  title: string | null;
  lastActivity: string;
};

type SuggestionAction = {
  id: string;
  label: string;
  prompt: string;
};

const STARTER_PROMPTS = [
  '¿Cuanto he facturado este mes?',
  '¿Tengo facturas pendientes de cobro?',
  'Hazme una factura para un cliente.',
  'Explicame mis gastos de este mes.',
];

const QUICK_HELP = [
  'Empieza con una pregunta corta y concreta.',
  'Si cambias la API key, puedes reconectar desde este panel.',
  'Cuando activemos nuevas funciones, se gestionaran desde aqui.',
];

const COMING_SOON = [
  'Historial y gestion de conversaciones.',
  'Mas acciones sobre la conexion y la sincronizacion.',
  'Nuevas herramientas dentro del dashboard.',
];

function formatDate(value: string | null) {
  if (!value) return 'No disponible';

  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function HoldedDashboardClient({ session }: { session: SessionInfo }) {
  const chatRef = useRef<HTMLDivElement | null>(null);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [recentConversations, setRecentConversations] = useState<ConversationSummary[]>([]);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: 'Ya tienes tu cuenta de Holded conectada.',
    },
    {
      id: 'welcome-2',
      role: 'assistant',
      content:
        'Puedes preguntarme lo que quieras sobre tu negocio o pedirme que haga cosas por ti.',
    },
    {
      id: 'welcome-3',
      role: 'assistant',
      content:
        'Para empezar, prueba con algo como: ¿Cuanto he facturado este mes?, ¿Tengo facturas pendientes de cobro?, Hazme una factura para un cliente o Explicame mis gastos de este mes.',
    },
  ]);
  const [suggestionActions, setSuggestionActions] = useState<SuggestionAction[]>([
    {
      id: 'summary-yes',
      label: 'Si, ver resumen',
      prompt: 'Quiero ver un resumen de este mes',
    },
    {
      id: 'summary-no',
      label: 'No, gracias',
      prompt: '',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [managementError, setManagementError] = useState<string | null>(null);
  const [managementNotice, setManagementNotice] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState(session);
  const [showReconnect, setShowReconnect] = useState(false);
  const [reconnectKey, setReconnectKey] = useState('');
  const [isSavingConnection, setIsSavingConnection] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const tenantLabel =
    connectionState.tenantName ||
    connectionState.legalName ||
    connectionState.email ||
    'Tu espacio';

  const connectionBadge = useMemo(() => {
    if (connectionState.supportedModules.length > 0) {
      return `Conexion activa en ${connectionState.supportedModules.join(', ')}`;
    }

    return 'Conexion activa';
  }, [connectionState.supportedModules]);

  const openIsaak = () => {
    chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    let cancelled = false;

    const loadLatestConversation = async () => {
      setIsLoadingConversation(true);

      try {
        const listRes = await fetch('/api/holded/conversations');
        const listData = await listRes.json().catch(() => null);
        if (!listRes.ok || !listData?.ok) {
          throw new Error('No hemos podido cargar tus chats.');
        }

        const conversations = Array.isArray(listData?.conversations) ? listData.conversations : [];
        if (!cancelled) {
          setRecentConversations(
            conversations.map((item: ConversationSummary) => ({
              id: item.id,
              title: item.title,
              lastActivity: item.lastActivity,
            }))
          );
        }

        const latestId = conversations[0]?.id;
        if (!latestId) return;

        const detailRes = await fetch(`/api/holded/conversations/${latestId}`);
        const detailData = await detailRes.json().catch(() => null);
        if (!detailRes.ok || !detailData?.ok || !detailData?.conversation) {
          throw new Error('No hemos podido recuperar el ultimo chat.');
        }

        if (cancelled) return;

        setConversationId(detailData.conversation.id);
        if (
          Array.isArray(detailData.conversation.messages) &&
          detailData.conversation.messages.length > 0
        ) {
          setMessages(
            detailData.conversation.messages.map(
              (message: { id: string; role: 'assistant' | 'user'; content: string }) => ({
                id: message.id,
                role: message.role,
                content: message.content,
              })
            )
          );
          setSuggestionActions([]);
        }
      } catch {
        if (!cancelled) {
          setConversationId(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingConversation(false);
        }
      }
    };

    void loadLatestConversation();

    return () => {
      cancelled = true;
    };
  }, []);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setLoading(true);
    setChatError(null);
    setSuggestionActions([]);

    try {
      const res = await fetch('/api/holded/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversationId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.reply) {
        throw new Error(data?.error || 'No hemos podido responder ahora mismo.');
      }

      if (data?.conversation?.id) {
        setConversationId(data.conversation.id);
        setRecentConversations((current) => {
          const next = [
            {
              id: data.conversation.id,
              title: data.conversation.title || 'Chat con Isaak',
              lastActivity: new Date().toISOString(),
            },
            ...current.filter((item) => item.id !== data.conversation.id),
          ];
          return next.slice(0, 5);
        });
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
        },
      ]);

      if (
        trimmed.toLowerCase().includes('resumen') ||
        trimmed.toLowerCase().includes('este mes') ||
        trimmed.toLowerCase().includes('ver resumen')
      ) {
        setMessages((current) => [
          ...current,
          {
            id: `assistant-followup-${Date.now()}`,
            role: 'assistant',
            content:
              'Tambien puedo ayudarte con cosas como crear facturas y contactos, analizar tus ingresos y gastos, resolver dudas sobre impuestos o explicarte como usar Holded. Solo tienes que pedirmelo.',
          },
          {
            id: `assistant-retention-${Date.now()}`,
            role: 'assistant',
            content:
              'Puedo avisarte si detecto cosas importantes en tu negocio, como facturas sin cobrar, gastos raros o cambios en tus resultados. Esto estara disponible muy pronto.',
          },
        ]);
      }
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : 'No hemos podido responder ahora mismo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([
      {
        id: 'welcome-new-chat-1',
        role: 'assistant',
        content: 'Ya tienes tu cuenta de Holded conectada.',
      },
      {
        id: 'welcome-new-chat-2',
        role: 'assistant',
        content:
          'Puedes preguntarme lo que quieras sobre tu negocio o pedirme que haga cosas por ti.',
      },
      {
        id: 'welcome-new-chat-3',
        role: 'assistant',
        content:
          'Si quieres, puedo darte un resumen rapido de tu negocio ahora mismo. ¿Quieres ver un resumen de este mes?',
      },
    ]);
    setSuggestionActions([
      {
        id: 'summary-yes-reset',
        label: 'Si, ver resumen',
        prompt: 'Quiero ver un resumen de este mes',
      },
      {
        id: 'summary-no-reset',
        label: 'No, gracias',
        prompt: '',
      },
    ]);
    setChatError(null);
    openIsaak();
  };

  const openConversation = async (id: string) => {
    setIsLoadingConversation(true);
    try {
      const res = await fetch(`/api/holded/conversations/${id}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data?.conversation) {
        throw new Error('No hemos podido abrir ese chat.');
      }

      setConversationId(data.conversation.id);
      setMessages(
        Array.isArray(data.conversation.messages)
          ? data.conversation.messages.map(
              (message: { id: string; role: 'assistant' | 'user'; content: string }) => ({
                id: message.id,
                role: message.role,
                content: message.content,
              })
            )
          : []
      );
      setSuggestionActions([]);
      setChatError(null);
      openIsaak();
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'No hemos podido abrir ese chat.');
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const renameConversation = async (id: string) => {
    const nextTitle = editingTitle.trim();
    if (!nextTitle) {
      setChatError('Escribe un titulo valido para el chat.');
      return;
    }

    try {
      const res = await fetch(`/api/holded/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: nextTitle }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'No hemos podido actualizar el titulo.');
      }

      setRecentConversations((current) =>
        current.map((item) => (item.id === id ? { ...item, title: data.conversation.title } : item))
      );
      setEditingConversationId(null);
      setEditingTitle('');
      setChatError(null);
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : 'No hemos podido actualizar el titulo.'
      );
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/holded/conversations/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'No hemos podido borrar el chat.');
      }

      const nextConversations = recentConversations.filter((item) => item.id !== id);
      setRecentConversations(nextConversations);
      setEditingConversationId(null);
      setEditingTitle('');

      if (conversationId === id) {
        if (nextConversations[0]?.id) {
          await openConversation(nextConversations[0].id);
        } else {
          startNewChat();
        }
      }
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'No hemos podido borrar el chat.');
    }
  };

  const handleReconnect = async () => {
    if (!reconnectKey.trim()) {
      setManagementError('Pega una API key valida para reconectar Holded.');
      return;
    }

    setIsSavingConnection(true);
    setManagementError(null);
    setManagementNotice(null);

    try {
      const res = await fetch('/api/holded/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: reconnectKey.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'No hemos podido reconectar Holded.');
      }

      setConnectionState((current) => ({
        ...current,
        tenantName: data?.connection?.tenantName || current.tenantName,
        legalName: data?.connection?.legalName || current.legalName,
        taxId: data?.connection?.taxId || current.taxId,
        keyMasked: data?.connection?.keyMasked || current.keyMasked,
        connectedAt: data?.connection?.connectedAt || current.connectedAt,
        lastValidatedAt: data?.connection?.connectedAt || current.lastValidatedAt,
        supportedModules: Array.isArray(data?.connection?.supportedModules)
          ? data.connection.supportedModules
          : current.supportedModules,
        validationSummary: data?.connection?.validationSummary || current.validationSummary,
      }));
      setReconnectKey('');
      setShowReconnect(false);
      setManagementNotice('Conexion actualizada correctamente.');
    } catch (error) {
      setManagementError(
        error instanceof Error ? error.message : 'No hemos podido reconectar Holded.'
      );
    } finally {
      setIsSavingConnection(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setManagementError(null);
    setManagementNotice(null);

    try {
      const res = await fetch('/api/holded/connect', { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'No hemos podido desconectar Holded.');
      }

      setConnectionState((current) => ({
        ...current,
        keyMasked: null,
        connectedAt: null,
        lastValidatedAt: null,
        supportedModules: [],
        validationSummary: null,
      }));
      setManagementNotice(
        'Conexion desconectada. Para volver a usar Isaak, conecta una nueva API key.'
      );
      setShowReconnect(true);
    } catch (error) {
      setManagementError(
        error instanceof Error ? error.message : 'No hemos podido desconectar Holded.'
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_42%,#f8fafc_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-[#ff5460]/15 bg-white px-6 py-6 shadow-[0_32px_90px_-48px_rgba(255,84,96,0.35)] sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
            <Sparkles className="h-3.5 w-3.5" />
            Dashboard gratuito
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Tu cuenta de Holded ya esta conectada
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            Este es tu punto de entrada. Empieza hablando con Isaak y revisa desde aqui el estado de
            tu conexion.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {session.isAdmin ? (
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Panel admin
              </Link>
            ) : null}
            <button
              type="button"
              onClick={openIsaak}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
            >
              Abrir Isaak
              <Bot className="h-4 w-4" />
            </button>
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Desde aqui podras gestionar tu experiencia cuando activemos nuevas funciones
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <PlugZap className="h-4 w-4 text-[#ff5460]" />
              Estado de conexion Holded
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  {connectionState.keyMasked ? connectionBadge : 'Conexion pendiente'}
                </div>
                <div className="mt-2">
                  {connectionState.keyMasked
                    ? 'Tu cuenta de Holded ya esta conectada.'
                    : 'No hay una API key activa en este momento.'}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Espacio
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">{tenantLabel}</div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    API key
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">
                    {connectionState.keyMasked || 'Sin conexion'}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Ultima validacion
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">
                    {formatDate(connectionState.lastValidatedAt)}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Modulos validados
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">
                    {connectionState.supportedModules.length > 0
                      ? connectionState.supportedModules.join(', ')
                      : 'Pendiente'}
                  </div>
                </div>
              </div>

              {connectionState.validationSummary ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  {connectionState.validationSummary}
                </div>
              ) : null}

              {connectionState.taxId ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  Identificador detectado:{' '}
                  <span className="font-semibold text-slate-900">{connectionState.taxId}</span>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowReconnect((current) => !current)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <KeyRound className="h-4 w-4" />
                  {showReconnect ? 'Ocultar reconexion' : 'Reconectar Holded'}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting || isSavingConnection}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wrench className="h-4 w-4" />
                  )}
                  Desconectar
                </button>
              </div>

              {showReconnect ? (
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Actualizar API key</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Si has cambiado la clave en Holded, pegala aqui y guardamos la nueva conexion.
                  </p>
                  <textarea
                    value={reconnectKey}
                    onChange={(event) => setReconnectKey(event.target.value)}
                    rows={4}
                    placeholder="Pega aqui tu nueva API key"
                    className="mt-4 w-full resize-none rounded-3xl border border-slate-300 bg-white px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                  />
                  <button
                    type="button"
                    onClick={handleReconnect}
                    disabled={isSavingConnection}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingConnection ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Guardar nueva conexion
                  </button>
                </div>
              ) : null}

              {managementNotice ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  {managementNotice}
                </div>
              ) : null}

              {managementError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>{managementError}</div>
                  </div>
                </div>
              ) : null}
            </div>
          </article>

          <div className="space-y-6">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Bot className="h-4 w-4 text-[#ff5460]" />
                Empieza hablando con Isaak
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={startNewChat}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Nuevo chat
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {recentConversations.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border px-4 py-3 ${
                      conversationId === item.id
                        ? 'border-[#ff5460]/30 bg-[#fff7f7]'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    {editingConversationId === item.id ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <input
                          value={editingTitle}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          className="h-11 flex-1 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void renameConversation(item.id)}
                            className="rounded-full bg-[#ff5460] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingConversationId(null);
                              setEditingTitle('');
                            }}
                            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          type="button"
                          onClick={() => void openConversation(item.id)}
                          className="text-left"
                        >
                          <div className="text-sm font-semibold text-slate-900">
                            {item.title || 'Chat con Isaak'}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Ultima actividad: {formatDate(item.lastActivity)}
                          </div>
                        </button>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingConversationId(item.id);
                              setEditingTitle(item.title || 'Chat con Isaak');
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                            aria-label="Renombrar chat"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteConversation(item.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                            aria-label="Borrar chat"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-[#ff5460]/30 hover:bg-[#fff7f7]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              {suggestionActions.length > 0 ? (
                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    Si quieres, puedo darte un resumen rapido de tu negocio ahora mismo.
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    ¿Quieres ver un resumen de este mes?
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {suggestionActions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => {
                          if (!action.prompt) {
                            setSuggestionActions([]);
                            return;
                          }
                          void sendMessage(action.prompt);
                        }}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          action.prompt
                            ? 'bg-[#ff5460] text-white hover:bg-[#ef4654]'
                            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>

            <article
              ref={chatRef}
              className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 px-2 pb-4 text-sm font-semibold text-slate-900">
                <Bot className="h-4 w-4 text-[#ff5460]" />
                Chat con Isaak
              </div>

              <div className="max-h-[460px] space-y-4 overflow-y-auto px-2 py-4">
                {isLoadingConversation ? (
                  <div className="mr-10 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Cargando chat...
                  </div>
                ) : null}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.role === 'assistant'
                        ? 'mr-10 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700'
                        : 'ml-10 rounded-[1.5rem] bg-[#ff5460] px-4 py-3 text-sm leading-7 text-white'
                    }
                  >
                    {message.content}
                  </div>
                ))}
                {loading ? (
                  <div className="mr-10 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Isaak esta preparando una respuesta...
                  </div>
                ) : null}
              </div>

              {chatError ? (
                <div className="px-2 pb-3 text-sm text-rose-700">{chatError}</div>
              ) : null}

              <form
                className="mt-2 flex items-end gap-3 border-t border-slate-100 px-2 pt-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage(input);
                }}
              >
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Preguntame sobre tu negocio... Ej: ¿Cuanto he facturado este mes?"
                  rows={3}
                  className="min-h-[88px] flex-1 resize-none rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim() || !connectionState.keyMasked}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#ff5460] text-white transition hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Enviar mensaje"
                >
                  <SendHorizonal className="h-5 w-5" />
                </button>
              </form>
            </article>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Ayuda rapida para empezar</div>
            <ul className="mt-4 space-y-3">
              {QUICK_HELP.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
                >
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Proximamente</div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Estamos preparando nuevas funciones para este espacio, pero todavia no estan activas.
            </p>
            <ul className="mt-4 space-y-3">
              {COMING_SOON.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
                >
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
