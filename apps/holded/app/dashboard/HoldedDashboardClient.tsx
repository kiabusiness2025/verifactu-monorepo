'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  SendHorizonal,
  Sparkles,
  Trash2,
} from 'lucide-react';

type SessionInfo = {
  email: string | null;
  name?: string | null;
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
  'Cuanto he facturado este mes?',
  'Tengo facturas pendientes de cobro?',
  'Hazme una factura para un cliente.',
  'Explicame mis gastos de este mes.',
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

function buildWelcomeMessages(isConnected: boolean): Message[] {
  if (!isConnected) {
    return [
      {
        id: 'welcome-disconnected-1',
        role: 'assistant',
        content: 'Aun no veo una API key activa de Holded.',
      },
      {
        id: 'welcome-disconnected-2',
        role: 'assistant',
        content:
          'Conecta tu cuenta y en cuanto este lista podras preguntarme por facturacion, cobros, gastos y mucho mas.',
      },
    ];
  }

  return [
    {
      id: 'welcome-connected-1',
      role: 'assistant',
      content: 'Ya esta todo listo. Puedes empezar cuando quieras.',
    },
    {
      id: 'welcome-connected-2',
      role: 'assistant',
      content: 'Preguntame por tu negocio, pideme un resumen o dime que quieres revisar en Holded.',
    },
  ];
}

function buildSuggestionActions(isConnected: boolean): SuggestionAction[] {
  if (!isConnected) return [];

  return [
    {
      id: 'summary-yes',
      label: 'Ver resumen del mes',
      prompt: 'Quiero ver un resumen de este mes',
    },
    {
      id: 'pending-bills',
      label: 'Facturas pendientes',
      prompt: 'Tengo facturas pendientes de cobro?',
    },
  ];
}

function formatGreetingName(session: SessionInfo) {
  const source =
    session.name || session.tenantName || session.legalName || session.email || 'tu negocio';

  if (source.includes('@')) {
    return source.split('@')[0] || source;
  }

  return source;
}

function getSpanishGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat('es-ES', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Europe/Madrid',
    }).format(new Date())
  );

  if (Number.isNaN(hour)) return 'Hola';
  if (hour < 6) return 'Buenas noches';
  if (hour < 12) return 'Buenos dias';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function normalizeToken(value: string | null | undefined) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function inferProfileNeedsName(name: string | null | undefined, email: string | null | undefined) {
  if (!name?.trim()) return true;
  if (!email?.trim()) return false;

  const emailPrefix = email.split('@')[0] || '';
  const normalizedName = normalizeToken(name);
  const normalizedEmail = normalizeToken(emailPrefix);

  if (!normalizedName) return true;
  if (normalizedName === normalizedEmail) return true;
  if (!name.includes(' ') && /[_\-.0-9]/.test(emailPrefix)) return true;

  return false;
}

export default function HoldedDashboardClient({ session }: { session: SessionInfo }) {
  const chatRef = useRef<HTMLDivElement | null>(null);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [recentConversations, setRecentConversations] = useState<ConversationSummary[]>([]);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [connectionState, setConnectionState] = useState(session);
  const [messages, setMessages] = useState<Message[]>(
    buildWelcomeMessages(Boolean(session.keyMasked))
  );
  const [suggestionActions, setSuggestionActions] = useState<SuggestionAction[]>(
    buildSuggestionActions(Boolean(session.keyMasked))
  );
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [managementError, setManagementError] = useState<string | null>(null);
  const [managementNotice, setManagementNotice] = useState<string | null>(null);
  const [showConnectionPanel, setShowConnectionPanel] = useState(false);
  const [reconnectKey, setReconnectKey] = useState('');
  const [isSavingConnection, setIsSavingConnection] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [displayName, setDisplayName] = useState(session.name || '');
  const [pendingProfileName, setPendingProfileName] = useState(session.name || '');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const isConnected = Boolean(connectionState.keyMasked);
  const greetingName = formatGreetingName({ ...connectionState, name: displayName });
  const greetingCopy = getSpanishGreeting();
  const profileNeedsName = inferProfileNeedsName(displayName, connectionState.email);

  const hasRealConversation = useMemo(
    () => messages.some((message) => message.role === 'user') || Boolean(conversationId),
    [conversationId, messages]
  );

  const connectionSummary = useMemo(() => {
    if (!isConnected) {
      return {
        label: 'Holded sin conectar',
        detail: 'Conecta tu API key para empezar a usar Isaak con tus datos.',
        tone: 'border-amber-200 bg-amber-50 text-amber-900 shadow-[0_18px_40px_-28px_rgba(245,158,11,0.45)]',
      };
    }

    const modules =
      connectionState.supportedModules.length > 0
        ? connectionState.supportedModules.join(', ')
        : 'Conexion lista';

    return {
      label: 'Holded conectado',
      detail: connectionState.validationSummary || modules,
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-900 shadow-[0_18px_40px_-28px_rgba(16,185,129,0.35)]',
    };
  }, [connectionState.supportedModules, connectionState.validationSummary, isConnected]);

  const openIsaak = () => {
    chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const saveProfileName = async () => {
    const trimmed = pendingProfileName.trim().replace(/\s+/g, ' ');
    if (trimmed.length < 2) {
      setProfileError('Escribe tu nombre para continuar.');
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'No hemos podido guardar tu nombre.');
      }

      setDisplayName(data.user?.name || trimmed);
      setPendingProfileName(data.user?.name || trimmed);
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : 'No hemos podido guardar tu nombre.'
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadConnectionState = async () => {
      try {
        const res = await fetch('/api/holded/status', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || cancelled) return;

        const nextConnected = Boolean(data.keyMasked);

        setConnectionState((current) => ({
          ...current,
          tenantName: data.tenantName ?? current.tenantName,
          legalName: data.legalName ?? current.legalName,
          taxId: data.taxId ?? current.taxId,
          keyMasked: data.keyMasked ?? null,
          connectedAt: data.connectedAt ?? null,
          lastValidatedAt: data.lastValidatedAt ?? null,
          supportedModules: Array.isArray(data.supportedModules) ? data.supportedModules : [],
          validationSummary: data.validationSummary ?? null,
        }));

        if (!hasRealConversation) {
          setMessages(buildWelcomeMessages(nextConnected));
          setSuggestionActions(buildSuggestionActions(nextConnected));
        }
        setPendingProfileName((current) => current || displayName);
      } catch {
        // Do not block dashboard rendering if status hydration fails.
      }
    };

    void loadConnectionState();

    return () => {
      cancelled = true;
    };
  }, [displayName, hasRealConversation]);

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
    if (!trimmed || loading || !isConnected || profileNeedsName) return;

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
          return next.slice(0, 12);
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
    setMessages(buildWelcomeMessages(isConnected));
    setSuggestionActions(buildSuggestionActions(isConnected));
    setChatError(null);
    setInput('');
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
      setManagementError('Pega una API key valida para conectar Holded.');
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
        throw new Error(data?.error || 'No hemos podido conectar Holded.');
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
      setShowConnectionPanel(false);
      setManagementNotice('Holded ya esta listo para usar con Isaak.');
      if (!hasRealConversation) {
        setMessages(buildWelcomeMessages(true));
        setSuggestionActions(buildSuggestionActions(true));
      }
    } catch (error) {
      setManagementError(
        error instanceof Error ? error.message : 'No hemos podido conectar Holded.'
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
      setManagementNotice('Conexion eliminada. Puedes conectar otra API key cuando quieras.');
      if (!hasRealConversation) {
        setMessages(buildWelcomeMessages(false));
        setSuggestionActions([]);
      }
    } catch (error) {
      setManagementError(
        error instanceof Error ? error.message : 'No hemos podido desconectar Holded.'
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7f1_0%,#fffdf8_34%,#ffffff_70%)] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200/80 bg-white/82 px-4 py-5 backdrop-blur lg:border-b-0 lg:border-r lg:px-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Isaak
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">Chat para Holded</div>
            </div>
            {session.isAdmin ? (
              <Link
                href="/admin"
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Admin
              </Link>
            ) : null}
          </div>

          <button
            type="button"
            onClick={startNewChat}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Nuevo chat
          </button>

          <div
            className={`mt-6 rounded-[1.5rem] border px-4 py-4 text-sm ${connectionSummary.tone}`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {isConnected ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {connectionSummary.label}
            </div>
            <p className="mt-2 leading-6">{connectionSummary.detail}</p>
            <button
              type="button"
              onClick={() => setShowConnectionPanel((current) => !current)}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 transition hover:underline"
            >
              {isConnected ? 'Gestionar conexion' : 'Conectar Holded'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {showConnectionPanel ? (
            <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">
                {isConnected ? 'Actualizar API key' : 'Conectar tu API key'}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Pega aqui la clave de Holded. Si no la tienes a mano, puedes volver a onboarding.
              </p>
              <textarea
                value={reconnectKey}
                onChange={(event) => setReconnectKey(event.target.value)}
                rows={4}
                placeholder="Pega aqui tu API key de Holded"
                className="mt-4 w-full resize-none rounded-[1.25rem] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleReconnect}
                  disabled={isSavingConnection}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingConnection ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  {isConnected ? 'Actualizar' : 'Conectar'}
                </button>
                <Link
                  href="/onboarding/holded"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ver ayuda
                </Link>
                {isConnected ? (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting || isSavingConnection}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDisconnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    Desconectar
                  </button>
                ) : null}
              </div>
              {managementNotice ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  {managementNotice}
                </div>
              ) : null}
              {managementError ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {managementError}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6">
            <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Chats
            </div>
            <div className="mt-3 space-y-2">
              {recentConversations.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 px-4 py-5 text-sm leading-6 text-slate-500">
                  Tus conversaciones apareceran aqui.
                </div>
              ) : null}
              {recentConversations.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-[1.25rem] border px-3 py-3 transition ${
                    conversationId === item.id
                      ? 'border-slate-900 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {editingConversationId === item.id ? (
                    <div className="space-y-3">
                      <input
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
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
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => void openConversation(item.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div
                          className={`truncate text-sm font-semibold ${conversationId === item.id ? 'text-white' : 'text-slate-900'}`}
                        >
                          {item.title || 'Chat con Isaak'}
                        </div>
                        <div
                          className={`mt-1 text-xs ${conversationId === item.id ? 'text-slate-300' : 'text-slate-500'}`}
                        >
                          {formatDate(item.lastActivity)}
                        </div>
                      </button>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingConversationId(item.id);
                            setEditingTitle(item.title || 'Chat con Isaak');
                          }}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                            conversationId === item.id
                              ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                          aria-label="Renombrar chat"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteConversation(item.id)}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                            conversationId === item.id
                              ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                              : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                          aria-label="Borrar chat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
            <div className="font-semibold text-slate-900">
              {connectionState.email || 'Tu cuenta'}
            </div>
            <div className="mt-1">
              {isConnected ? connectionState.keyMasked : 'Sin API key activa'}
            </div>
          </div>
        </aside>

        <section className="flex min-h-screen flex-col px-4 py-5 sm:px-8 lg:px-12">
          <div className="flex items-center justify-end gap-3">
            <div
              className={`rounded-full border px-4 py-2 text-xs font-semibold ${connectionSummary.tone}`}
            >
              {connectionSummary.label}
            </div>
            {isConnected ? (
              <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600">
                Validado: {formatDate(connectionState.lastValidatedAt)}
              </div>
            ) : null}
          </div>

          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col" ref={chatRef}>
            <div
              className={`flex flex-1 flex-col ${hasRealConversation ? 'justify-end pt-8' : 'justify-center pb-16 pt-10'}`}
            >
              {!hasRealConversation ? (
                <div className="mx-auto w-full max-w-2xl text-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/15 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#ff5460] shadow-[0_18px_40px_-30px_rgba(255,84,96,0.35)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Isaak para Holded
                  </div>
                  <h1 className="mt-8 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                    {greetingCopy}, {greetingName}
                  </h1>
                  <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                    {isConnected
                      ? 'Pregunta lo que necesites sobre tu negocio y deja que Isaak trabaje contigo desde aqui.'
                      : 'Antes de empezar, conecta tu API key de Holded. En cuanto este lista, el chat se activara al instante.'}
                  </p>
                </div>
              ) : (
                <div className="mx-auto w-full max-w-3xl space-y-5 pb-6">
                  {isLoadingConversation ? (
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
                      Cargando chat...
                    </div>
                  ) : null}
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={
                        message.role === 'assistant'
                          ? 'mr-8 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 text-sm leading-7 text-slate-700 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.35)]'
                          : 'ml-8 rounded-[1.75rem] bg-slate-950 px-5 py-4 text-sm leading-7 text-white shadow-[0_20px_48px_-40px_rgba(15,23,42,0.5)]'
                      }
                    >
                      {message.content}
                    </div>
                  ))}
                  {loading ? (
                    <div className="mr-8 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.35)]">
                      Isaak esta preparando una respuesta...
                    </div>
                  ) : null}
                </div>
              )}

              <div className="mx-auto w-full max-w-3xl">
                {suggestionActions.length > 0 && !hasRealConversation && !profileNeedsName ? (
                  <div className="mb-5 flex flex-wrap justify-center gap-3">
                    {suggestionActions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => void sendMessage(action.prompt)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#ff5460]/30 hover:bg-[#fff7f7]"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {!hasRealConversation && !profileNeedsName ? (
                  <div className="mb-5 flex flex-wrap justify-center gap-3">
                    {STARTER_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendMessage(prompt)}
                        disabled={!isConnected || profileNeedsName}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#ff5460]/30 hover:bg-[#fff7f7] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                ) : null}

                {profileNeedsName ? (
                  <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.35)]">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Antes de empezar
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                      Como quieres que te llame?
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                      Completa tu perfil una sola vez y abrimos el chat de Isaak con una experiencia
                      mas personal y limpia.
                    </p>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <input
                        value={pendingProfileName}
                        onChange={(event) => setPendingProfileName(event.target.value)}
                        placeholder="Escribe tu nombre"
                        className="h-12 flex-1 rounded-[1.25rem] border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                      />
                      <button
                        type="button"
                        onClick={() => void saveProfileName()}
                        disabled={isSavingProfile}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Continuar
                      </button>
                    </div>
                    {profileError ? (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                        {profileError}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {chatError ? (
                  <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    {chatError}
                  </div>
                ) : null}

                {!isConnected ? (
                  <div className="mb-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900">
                    Necesitas una API key activa de Holded para hablar con Isaak.
                    <Link
                      href="/onboarding/holded"
                      className="ml-2 font-semibold underline underline-offset-4"
                    >
                      Abrir conexion
                    </Link>
                  </div>
                ) : null}

                <form
                  className="rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.4)]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendMessage(input);
                  }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder={
                        isConnected && !profileNeedsName
                          ? 'Preguntame sobre tu negocio... Ej: Cuanto he facturado este mes?'
                          : profileNeedsName
                            ? 'Completa tu perfil para empezar a hablar con Isaak'
                            : 'Conecta Holded para empezar a hablar con Isaak'
                      }
                      rows={hasRealConversation ? 2 : 3}
                      className="min-h-[84px] flex-1 resize-none rounded-[1.5rem] border-0 bg-transparent px-3 py-3 text-[15px] leading-7 text-slate-900 outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={loading || !input.trim() || !isConnected || profileNeedsName}
                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      aria-label="Enviar mensaje"
                    >
                      <SendHorizonal className="h-5 w-5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
