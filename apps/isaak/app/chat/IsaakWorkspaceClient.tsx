'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import type { IsaakInstructionProfile, IsaakOnboardingProfile } from '@verifactu/integrations';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  LifeBuoy,
  Loader2,
  LogOut,
  Menu,
  MessageSquarePlus,
  Paperclip,
  SendHorizonal,
  Settings2,
  X,
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
  phone?: string | null;
  representative?: string | null;
  isAdmin?: boolean;
};

type LiveInsight = {
  sales: number;
  pendingInvoices: number;
  invoices: number;
  contacts: number;
  accounts: number;
  insight: string;
};

type Message = { id: string; role: 'assistant' | 'user'; content: string };
type ConversationSummary = { id: string; title: string | null; lastActivity: string };
type AttachedFile = { id: string; name: string; sizeLabel: string };

const QUICK_START_PROMPTS = [
  'Quiero ver un resumen del negocio',
  'Cuanto he vendido este mes?',
  'Que facturas tengo pendientes?',
  'Explicame mis gastos recientes',
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

function takeFirstName(value: string | null | undefined) {
  const normalized = (value || '').trim();
  if (!normalized) return '';
  return normalized.split(' ')[0]?.trim() || normalized;
}

function deriveName(session: SessionInfo) {
  return (
    takeFirstName(session.name || session.representative || session.email?.split('@')[0]) || 'Hola'
  );
}

function formatRoleLabel(value: string | null | undefined) {
  if (!value) return 'responsable del negocio';
  switch (value) {
    case 'autonomo':
      return 'autonomo';
    case 'administrador':
      return 'administrador';
    case 'gerente':
      return 'gerente';
    case 'financiero':
      return 'responsable financiero';
    default:
      return value;
  }
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function AssistantAvatar() {
  return (
    <div className="relative mt-1 h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
      <Image
        src="/Personalidad/isaak-avatar-verifactu.png"
        alt="Isaak"
        fill
        sizes="36px"
        className="object-cover"
      />
    </div>
  );
}

function AssistantMessage({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar />
      <div className="max-w-[min(100%,42rem)] rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 text-sm leading-7 text-slate-700 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.28)]">
        <div>{children}</div>
        {extra}
      </div>
    </div>
  );
}

export default function IsaakWorkspaceClient({
  session,
  onboardingProfile,
  instructionProfile,
  liveInsight,
  connectionPending = false,
  quickPrompts,
  connectionSettingsUrl,
  settingsUrl,
}: {
  session: SessionInfo;
  onboardingProfile?: IsaakOnboardingProfile | null;
  instructionProfile?: IsaakInstructionProfile | null;
  liveInsight?: LiveInsight | null;
  connectionPending?: boolean;
  quickPrompts?: string[];
  connectionSettingsUrl: string;
  settingsUrl: string;
}) {
  const [connectionState, setConnectionState] = useState(session);
  const [recentConversations, setRecentConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(
    connectionPending && !session.keyMasked
  );
  const [connectionCheckAttempts, setConnectionCheckAttempts] = useState(0);
  const [typedGreetingCount, setTypedGreetingCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const answers = onboardingProfile
    ? {
        preferredName: onboardingProfile.preferredName,
        companyName: onboardingProfile.companyName,
        roleInCompany: onboardingProfile.roleInCompanyOther || onboardingProfile.roleInCompany,
        goals: onboardingProfile.mainGoals,
      }
    : null;

  const hasLiveConnection = Boolean(connectionState.keyMasked);
  const showConnectionWarmup = connectionPending && !hasLiveConnection;
  const connectionVerificationStalled =
    showConnectionWarmup && !isCheckingConnection && connectionCheckAttempts >= 8;
  const greeting = getSpanishGreeting();
  const displayName =
    takeFirstName(answers?.preferredName || deriveName(connectionState)) || 'Hola';
  const companyLabel =
    connectionState.tenantName || connectionState.legalName || answers?.companyName;
  const quickStartPrompts = quickPrompts?.length ? quickPrompts : QUICK_START_PROMPTS;
  const onboardingGoalSummary =
    answers?.goals?.slice(0, 2).join(' y ') ||
    instructionProfile?.mainSupportGoals?.slice(0, 2).join(' y ') ||
    '';
  const greetingLine = `${greeting}, ${displayName}`;
  const userInitial = displayName.trim().charAt(0).toUpperCase() || 'I';

  const assistantLeadMessage = useMemo(() => {
    if (showConnectionWarmup) {
      return `Ya tengo tu contexto inicial y estoy terminando de confirmar la conexion con Holded para trabajar con ${companyLabel || 'tu empresa'}.`;
    }
    if (!hasLiveConnection) {
      return `En cuanto confirmemos Holded, podre ayudarte con datos reales de ${companyLabel || 'tu empresa'}.`;
    }
    return `Ya tengo acceso a tu cuenta de Holded${companyLabel ? ` y a ${companyLabel}` : ''}. Puedes preguntarme lo que necesites y me adapto a como quieres gestionar tu negocio.`;
  }, [companyLabel, hasLiveConnection, showConnectionWarmup]);

  const assistantSupportMessage = useMemo(() => {
    if (showConnectionWarmup) {
      return 'La comprobacion final esta en marcha. En cuanto termine, activare respuestas con tus datos reales sin sacarte del chat.';
    }
    if (!hasLiveConnection) {
      return 'Todavia no he podido confirmar la conexion real de Holded. Puedes revisar la integracion sin perder tu contexto.';
    }
    if (onboardingGoalSummary) {
      return `Voy a centrarme en ayudarte con ${onboardingGoalSummary}. Si quieres, empezamos con un resumen simple o con una tarea concreta.`;
    }
    return 'Puedo ayudarte a entender tus numeros, resolver dudas contables y preparar acciones concretas desde este mismo chat.';
  }, [hasLiveConnection, onboardingGoalSummary, showConnectionWarmup]);

  const assistantInsightMessage = useMemo(() => {
    if (!liveInsight || showConnectionWarmup || !hasLiveConnection) return null;

    const fragments: string[] = [];
    if (liveInsight.sales > 0) {
      fragments.push(
        `En la muestra inicial ya veo ${liveInsight.sales.toLocaleString('es-ES', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })} EUR en ventas aproximadas`
      );
    }
    if (liveInsight.pendingInvoices > 0) {
      fragments.push(`${liveInsight.pendingInvoices} facturas pendientes de cobro`);
    }
    if (liveInsight.contacts > 0) {
      fragments.push(`${liveInsight.contacts} contactos visibles`);
    }

    if (fragments.length === 0) {
      return liveInsight.insight;
    }

    return `${fragments.join(', ')}. ${liveInsight.insight} Si quieres, sigo con resultados, cobros pendientes o ventas recientes.`;
  }, [hasLiveConnection, liveInsight, showConnectionWarmup]);

  useEffect(() => {
    if (messages.length > 0) return;
    setTypedGreetingCount(0);
    let current = 0;
    const timeout = window.setTimeout(() => {
      const interval = window.setInterval(() => {
        current += 1;
        setTypedGreetingCount(current);
        if (current >= greetingLine.length) {
          window.clearInterval(interval);
        }
      }, 26);
    }, 240);
    return () => window.clearTimeout(timeout);
  }, [greetingLine, messages.length]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    let attempts = 0;

    const syncConnectionState = async () => {
      try {
        const res = await fetch('/api/holded/status', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || cancelled) return false;
        const resolved = Boolean(data.keyMasked);
        setConnectionState((current) => ({
          ...current,
          tenantName: data.tenantName ?? current.tenantName,
          legalName: data.legalName ?? current.legalName,
          taxId: data.taxId ?? current.taxId,
          keyMasked: data.keyMasked ?? current.keyMasked,
          connectedAt: data.connectedAt ?? current.connectedAt,
          lastValidatedAt: data.lastValidatedAt ?? current.lastValidatedAt,
          supportedModules:
            resolved && Array.isArray(data.supportedModules)
              ? data.supportedModules
              : current.supportedModules,
          validationSummary: data.validationSummary ?? current.validationSummary,
        }));
        return resolved;
      } catch {
        return false;
      }
    };

    const poll = async () => {
      const resolved = await syncConnectionState();
      if (cancelled) return;
      if (resolved || !connectionPending) {
        setIsCheckingConnection(false);
        if (resolved) setConnectionCheckAttempts(0);
        return;
      }
      attempts += 1;
      setConnectionCheckAttempts(attempts);
      if (attempts >= 8) {
        setIsCheckingConnection(false);
        return;
      }
      setIsCheckingConnection(true);
      timeoutId = window.setTimeout(() => void poll(), 2200);
    };

    setIsCheckingConnection(connectionPending && !hasLiveConnection);
    void poll();
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [connectionPending, hasLiveConnection]);

  useEffect(() => {
    let cancelled = false;
    const loadLatestConversation = async () => {
      setLoadingConversation(true);
      try {
        const listRes = await fetch('/api/holded/conversations');
        const listData = await listRes.json().catch(() => null);
        if (!listRes.ok || !listData?.ok) throw new Error();
        const conversations = Array.isArray(listData.conversations) ? listData.conversations : [];
        if (!cancelled) setRecentConversations(conversations);
        const latestId = conversations[0]?.id;
        if (!latestId) return;
        const detailRes = await fetch(`/api/holded/conversations/${latestId}`);
        const detailData = await detailRes.json().catch(() => null);
        if (!detailRes.ok || !detailData?.ok || !detailData?.conversation) throw new Error();
        if (cancelled) return;
        setConversationId(detailData.conversation.id);
        setMessages(
          Array.isArray(detailData.conversation.messages)
            ? detailData.conversation.messages.map(
                (message: { id: string; role: 'assistant' | 'user'; content: string }) => ({
                  id: message.id,
                  role: message.role,
                  content: message.content,
                })
              )
            : []
        );
      } catch {
        if (!cancelled) {
          setConversationId(null);
          setMessages([]);
        }
      } finally {
        if (!cancelled) setLoadingConversation(false);
      }
    };
    void loadLatestConversation();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading, typedGreetingCount, chatError]);

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setInput('');
    setChatError(null);
    setAttachedFiles([]);
    setSidebarOpen(false);
    setUserMenuOpen(false);
  };

  const openConversation = async (id: string) => {
    setLoadingConversation(true);
    setSidebarOpen(false);
    setUserMenuOpen(false);
    try {
      const res = await fetch(`/api/holded/conversations/${id}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data?.conversation) throw new Error();
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
      setChatError(null);
    } catch {
      setChatError('No hemos podido abrir ese chat.');
    } finally {
      setLoadingConversation(false);
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || !hasLiveConnection || !answers) return;
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', content: trimmed },
    ]);
    setInput('');
    setLoading(true);
    setChatError(null);
    setAttachedFiles([]);
    try {
      const res = await fetch('/api/holded/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversationId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.reply) throw new Error(data?.error || 'No hemos podido responder.');
      if (data?.conversation?.id) {
        setConversationId(data.conversation.id);
        setRecentConversations((current) =>
          [
            {
              id: data.conversation.id,
              title: data.conversation.title || 'Nueva conversación',
              lastActivity: new Date().toISOString(),
            },
            ...current.filter((item) => item.id !== data.conversation.id),
          ].slice(0, 16)
        );
      }
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: 'assistant', content: data.reply },
      ]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'No hemos podido responder.');
    } finally {
      setLoading(false);
    }
  };

  const applyPromptToInput = (prompt: string) => {
    setInput(prompt);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // noop
    } finally {
      window.location.href = 'https://holded.verifactu.business/auth/holded?source=isaak_logout';
    }
  };

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setAttachedFiles(
      files.map((file) => ({
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        sizeLabel: formatFileSize(file.size),
      }))
    );
    event.target.value = '';
  };

  const connectionPill = (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
        hasLiveConnection
          ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
          : showConnectionWarmup
            ? 'border border-sky-200 bg-sky-50 text-sky-900'
            : 'border border-amber-200 bg-amber-50 text-amber-900'
      }`}
    >
      {showConnectionWarmup ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : hasLiveConnection ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5" />
      )}
      {hasLiveConnection
        ? 'Holded conectado'
        : showConnectionWarmup
          ? isCheckingConnection
            ? 'Comprobando conexion'
            : 'Revision manual recomendada'
          : 'Holded pendiente'}
    </span>
  );

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,#f5f8ff_0%,#f8fafc_38%,#f8fafc_100%)] text-slate-900">
      <div className="mx-auto flex min-h-dvh max-w-[1600px] flex-col lg:flex-row">
        <div
          className={`fixed inset-0 z-40 bg-slate-950/40 transition lg:hidden ${sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
          onClick={() => setSidebarOpen(false)}
        />

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[320px] flex-col border-r border-slate-200 bg-white px-4 py-4 shadow-2xl transition-transform lg:sticky lg:top-0 lg:h-dvh lg:w-[296px] lg:max-w-none lg:translate-x-0 lg:overflow-y-auto lg:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between gap-3 pb-4">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
                <Image
                  src="/Personalidad/isaak-avatar-verifactu.png"
                  alt="Isaak"
                  fill
                  sizes="44px"
                  className="object-cover"
                  priority
                />
              </div>
              <div>
                <div className="text-base font-semibold text-slate-950">Isaak</div>
                <div className="text-xs text-slate-500">Tu asistente contable</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={startNewChat}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#2361d8] px-4 text-sm font-semibold text-white shadow-[0_18px_38px_-26px_rgba(35,97,216,0.8)] transition hover:bg-[#1d55c2]"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Nuevo chat
          </button>

          <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Integracion principal
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-950">Holded</div>
                <div className="mt-1 text-xs text-slate-500">
                  {companyLabel || 'Empresa conectada'}
                </div>
              </div>
              <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm">
                <Image
                  src="/brand/holded/holded-diamond-logo.png"
                  alt="Holded"
                  fill
                  sizes="44px"
                  className="object-contain p-2"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>{connectionPill}</div>
              <Link
                href={connectionSettingsUrl}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Configurar
                <Settings2 className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="mt-5 min-h-0 flex-1 overflow-y-auto pb-4">
            <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Conversaciones
            </div>
            <div className="mt-3 space-y-2">
              {recentConversations.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm leading-6 text-slate-500">
                  Tus chats apareceran aqui.
                </div>
              ) : null}
              {recentConversations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openConversation(item.id)}
                  className={`w-full rounded-[1.25rem] border px-4 py-3 text-left transition ${conversationId === item.id ? 'border-[#2361d8]/20 bg-[#eef4ff] text-slate-900' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {item.title || 'Nueva conversacion'}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{formatDate(item.lastActivity)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <button
                type="button"
                onClick={() => setUserMenuOpen((current) => !current)}
                className="flex w-full items-center gap-3 text-left"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-950">{displayName}</div>
                  <div className="truncate text-xs text-slate-500">
                    {companyLabel || formatRoleLabel(answers?.roleInCompany)}
                  </div>
                </div>
                <ChevronRight
                  className={`h-4 w-4 text-slate-400 transition ${userMenuOpen ? 'rotate-90' : ''}`}
                />
              </button>
              <div className="mt-4 grid gap-2">
                <Link
                  href={settingsUrl}
                  className="inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white"
                >
                  Ajustes
                  <CreditCard className="h-4 w-4" />
                </Link>
                <Link
                  href="/support"
                  className="inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white"
                >
                  Ayuda
                  <LifeBuoy className="h-4 w-4" />
                </Link>
              </div>
              {userMenuOpen ? (
                <div className="mt-3 space-y-2 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-2">
                  <Link
                    href={`${settingsUrl}?section=profile`}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                  >
                    Mi perfil
                  </Link>
                  <Link
                    href={`${settingsUrl}?section=company`}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                  >
                    Empresa
                  </Link>
                  <Link
                    href={`${settingsUrl}?section=connections`}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                  >
                    Conexiones
                  </Link>
                  <Link
                    href={`${settingsUrl}?section=isaak`}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                  >
                    Isaak
                  </Link>
                  <Link
                    href={`${settingsUrl}?section=billing`}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                  >
                    Plan
                  </Link>
                  <Link
                    href="/support"
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                  >
                    Ayuda
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    disabled={loggingOut}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-white disabled:opacity-60"
                  >
                    Cerrar sesion
                    {loggingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="flex min-h-dvh flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 lg:hidden"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div>
                  <div className="text-sm font-semibold text-slate-950">isaak.chat</div>
                  <div className="text-xs text-slate-500">
                    {companyLabel || 'Espacio conectado'}
                  </div>
                </div>
              </div>
              <div className="hidden sm:block">{connectionPill}</div>
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 sm:px-6 sm:pt-6 lg:px-8">
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end">
                {messages.length === 0 ? (
                  <div className="space-y-5 py-8 sm:py-12">
                    {loadingConversation ? (
                      <AssistantMessage>
                        Estoy recuperando tu espacio y tus ultimos mensajes...
                      </AssistantMessage>
                    ) : (
                      <>
                        <AssistantMessage>
                          <div className="font-medium text-slate-900">
                            {greetingLine.slice(0, typedGreetingCount)}
                            {typedGreetingCount < greetingLine.length ? (
                              <span className="ml-1 inline-block h-5 w-[2px] animate-pulse rounded-full bg-[#2361d8]" />
                            ) : null}
                          </div>
                        </AssistantMessage>
                        {typedGreetingCount >= greetingLine.length ? (
                          <>
                            <AssistantMessage>{assistantLeadMessage}</AssistantMessage>
                            <AssistantMessage
                              extra={
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  {connectionPill}
                                  {connectionVerificationStalled ? (
                                    <Link
                                      href={connectionSettingsUrl}
                                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                                    >
                                      Revisar conexion Holded
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                  ) : null}
                                </div>
                              }
                            >
                              {assistantSupportMessage}
                            </AssistantMessage>
                            {assistantInsightMessage ? (
                              <AssistantMessage>{assistantInsightMessage}</AssistantMessage>
                            ) : null}
                          </>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5 py-8 sm:py-10">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={
                          message.role === 'assistant'
                            ? 'flex items-start gap-3'
                            : 'flex justify-end'
                        }
                      >
                        {message.role === 'assistant' ? <AssistantAvatar /> : null}
                        <div
                          className={
                            message.role === 'assistant'
                              ? 'max-w-[min(100%,42rem)] rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 text-sm leading-7 text-slate-700 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.28)]'
                              : 'max-w-[min(100%,38rem)] rounded-[1.6rem] bg-[#2361d8] px-5 py-4 text-sm leading-7 text-white shadow-[0_20px_48px_-32px_rgba(35,97,216,0.5)]'
                          }
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}
                    {loading ? (
                      <AssistantMessage>
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-[#2361d8]" />
                          Isaak esta preparando una respuesta...
                        </span>
                      </AssistantMessage>
                    ) : null}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            <div className="mx-auto mt-4 w-full max-w-3xl">
              {chatError ? (
                <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {chatError}
                </div>
              ) : null}

              {answers ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {quickStartPrompts.slice(0, 4).map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => applyPromptToInput(prompt)}
                      disabled={!hasLiveConnection}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#2361d8]/30 hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : null}

              {attachedFiles.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachedFiles.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() =>
                        setAttachedFiles((current) => current.filter((item) => item.id !== file.id))
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {file.name}
                      <span className="text-slate-400">{file.sizeLabel}</span>
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              ) : null}

              <form
                className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-3 shadow-[0_28px_64px_-40px_rgba(15,23,42,0.28)] backdrop-blur"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage(input);
                }}
              >
                <div className="mb-3 flex items-center justify-between gap-3 px-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                  >
                    <Paperclip className="h-4 w-4" />
                    Añadir documentos
                  </button>
                  <Link
                    href={connectionSettingsUrl}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <div className="relative h-4 w-4 overflow-hidden rounded-full">
                      <Image
                        src="/brand/holded/holded-diamond-logo.png"
                        alt="Holded"
                        fill
                        sizes="16px"
                        className="object-contain"
                      />
                    </div>
                    Revisar conexión Holded
                  </Link>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFilesSelected}
                  />
                </div>
                <div className="flex items-end gap-3">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={
                      hasLiveConnection && answers
                        ? 'Preguntame por ventas, gastos, cobros o facturas'
                        : showConnectionWarmup && answers
                          ? 'Estoy terminando de activar Holded con tus datos reales...'
                          : 'Completa la conexion de Holded para activar el chat'
                    }
                    rows={3}
                    className="min-h-[96px] flex-1 resize-none rounded-[1.3rem] border border-slate-100 bg-slate-50 px-4 py-3 text-[15px] leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2361d8]/20 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim() || !hasLiveConnection || !answers}
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2361d8] text-white transition hover:bg-[#1d55c2] disabled:cursor-not-allowed disabled:bg-slate-300"
                    aria-label="Enviar mensaje"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <SendHorizonal className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-3 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {hasLiveConnection
                    ? `Ultima validacion ${formatDate(connectionState.lastValidatedAt)}`
                    : showConnectionWarmup
                      ? isCheckingConnection
                        ? 'Comprobando la conexion final de Holded'
                        : 'La verificacion de Holded sigue pendiente'
                      : 'Conecta Holded para usar datos reales'}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${hasLiveConnection ? 'bg-emerald-500' : showConnectionWarmup ? 'bg-sky-500' : 'bg-amber-500'}`}
                  />
                  {companyLabel || 'Espacio de trabajo'}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
