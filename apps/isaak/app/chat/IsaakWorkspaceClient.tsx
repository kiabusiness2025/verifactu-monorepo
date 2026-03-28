'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { IsaakInstructionProfile, IsaakOnboardingProfile } from '@verifactu/integrations';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MessageSquarePlus,
  SendHorizonal,
  Settings2,
  Sparkles,
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

type OnboardingAnswers = {
  preferredName: string;
  companyName: string;
  roleInCompany: string;
  phone: string;
  businessSector: string;
  websiteState: string;
  employeeRange: string;
  goals: string[];
};

const STORAGE_VERSION = 'v2';

const GOAL_OPTIONS = [
  'Entender mi contabilidad',
  'Resolver dudas fiscales',
  'Emitir facturas facilmente',
  'Controlar ingresos y gastos',
  'Entender balances y resultados',
  'Llevar mejor la gestion diaria',
];

const QUICK_START_PROMPTS = [
  'Cuanto he vendido este mes?',
  'Que gastos tengo pendientes?',
  'Hazme una factura',
];

const ROLE_OPTIONS = [
  'Autonoma o fundador',
  'Direccion',
  'Finanzas o administracion',
  'Asesoria interna',
];
const SECTOR_OPTIONS = [
  'Servicios',
  'Comercio',
  'Tecnologia',
  'Construccion',
  'Hosteleria',
  'Salud',
  'Otro',
];
const WEBSITE_OPTIONS = ['Ya tenemos web', 'Aun no tenemos web'];
const EMPLOYEE_OPTIONS = ['Solo yo', '2-5 empleados', '6-20 empleados', 'Mas de 20'];

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

function deriveName(session: SessionInfo) {
  const raw =
    session.name?.trim() ||
    session.representative?.trim() ||
    session.email?.split('@')[0] ||
    'hola';
  return (
    raw
      .split(' ')[0]
      ?.replace(/[._-]+/g, ' ')
      .trim() || 'hola'
  );
}

function deriveAlternateNames(session: SessionInfo) {
  const suggestions = new Set<string>();
  const fullName = session.name?.trim();
  const representative = session.representative?.trim();
  const emailPrefix = session.email
    ?.split('@')[0]
    ?.replace(/[._-]+/g, ' ')
    .trim();

  if (fullName && fullName !== deriveName(session)) suggestions.add(fullName);
  if (representative && representative !== deriveName(session)) suggestions.add(representative);
  if (emailPrefix && emailPrefix !== deriveName(session)) suggestions.add(emailPrefix);
  suggestions.add('Lo decidire despues');
  return Array.from(suggestions).slice(0, 2);
}

function storageKey(tenantId: string | null) {
  return `isaak-chat-onboarding:${tenantId || 'anonymous'}:${STORAGE_VERSION}`;
}

function buildWelcomeContext(isConnected: boolean, companyName: string | null) {
  if (!isConnected) {
    return 'Antes de empezar, necesito que conectes Holded para trabajar con tus datos reales.';
  }

  if (companyName) {
    return `Ya tengo acceso a ${companyName} en Holded. Puedo ayudarte a entender tus numeros, crear facturas o resolver dudas en segundos.`;
  }

  return 'Ya tengo acceso a tu cuenta de Holded. Puedo ayudarte a entender tus numeros, crear facturas o resolver dudas en segundos.';
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

export default function IsaakWorkspaceClient({
  session,
  onboardingProfile,
  instructionProfile,
  connectionPending = false,
  quickPrompts,
}: {
  session: SessionInfo;
  onboardingProfile?: IsaakOnboardingProfile | null;
  instructionProfile?: IsaakInstructionProfile | null;
  connectionPending?: boolean;
  quickPrompts?: string[];
}) {
  const [connectionState, setConnectionState] = useState(session);
  const [recentConversations, setRecentConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [introReady, setIntroReady] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(
    connectionPending && !session.keyMasked
  );
  const [connectionCheckAttempts, setConnectionCheckAttempts] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers | null>(
    onboardingProfile
      ? {
          preferredName: onboardingProfile.preferredName,
          companyName: onboardingProfile.companyName,
          roleInCompany: onboardingProfile.roleInCompanyOther || onboardingProfile.roleInCompany,
          phone: onboardingProfile.phone || '',
          businessSector: onboardingProfile.businessSector,
          websiteState: onboardingProfile.website || '',
          employeeRange: onboardingProfile.teamSize || '',
          goals: onboardingProfile.mainGoals,
        }
      : null
  );
  const [step, setStep] = useState(0);
  const [selectedName, setSelectedName] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedPhone, setSelectedPhone] = useState(session.phone || '');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedWebsite, setSelectedWebsite] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const hasLiveConnection = Boolean(connectionState.keyMasked);
  const onboardingDone = Boolean(answers);
  const isConnected = hasLiveConnection || (connectionPending && onboardingDone);
  const showConnectionWarmup = connectionPending && !hasLiveConnection;
  const connectionVerificationStalled =
    showConnectionWarmup && !isCheckingConnection && connectionCheckAttempts >= 8;
  const greeting = getSpanishGreeting();
  const defaultName = useMemo(() => deriveName(connectionState), [connectionState]);
  const alternateNames = useMemo(() => deriveAlternateNames(connectionState), [connectionState]);
  const companyOptions = useMemo(() => {
    const values = [connectionState.tenantName, connectionState.legalName]
      .map((value) => value?.trim())
      .filter(Boolean) as string[];
    return Array.from(new Set(values));
  }, [connectionState.legalName, connectionState.tenantName]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroReady(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (onboardingProfile) return;
    try {
      const raw = window.localStorage.getItem(storageKey(session.tenantId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as OnboardingAnswers;
      if (
        parsed?.preferredName &&
        parsed?.companyName &&
        parsed?.roleInCompany &&
        parsed?.businessSector &&
        parsed?.websiteState &&
        parsed?.employeeRange &&
        Array.isArray(parsed?.goals)
      ) {
        setAnswers(parsed);
        setSelectedName(parsed.preferredName);
        setSelectedCompany(parsed.companyName);
        setSelectedRole(parsed.roleInCompany);
        setSelectedPhone(parsed.phone || '');
        setSelectedSector(parsed.businessSector);
        setSelectedWebsite(parsed.websiteState);
        setSelectedEmployees(parsed.employeeRange);
        setSelectedGoals(parsed.goals);
        setStep(4);
      }
    } catch {
      // ignore bad local onboarding state
    }
  }, [onboardingProfile, session.tenantId]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    let attempts = 0;

    const syncConnectionState = async () => {
      try {
        const res = await fetch('/api/holded/status', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || cancelled) return false;

        const hasResolvedConnection = Boolean(data.keyMasked);

        setConnectionState((current) => ({
          ...current,
          tenantName: data.tenantName ?? current.tenantName,
          legalName: data.legalName ?? current.legalName,
          taxId: data.taxId ?? current.taxId,
          keyMasked: data.keyMasked ?? current.keyMasked,
          connectedAt: data.connectedAt ?? current.connectedAt,
          lastValidatedAt: data.lastValidatedAt ?? current.lastValidatedAt,
          supportedModules: Array.isArray(data.supportedModules)
            ? data.supportedModules
            : current.supportedModules,
          validationSummary: data.validationSummary ?? current.validationSummary,
        }));

        return hasResolvedConnection;
      } catch {
        return false;
      }
    };

    const pollConnection = async () => {
      const resolved = await syncConnectionState();
      if (cancelled) return;

      if (resolved) {
        setIsCheckingConnection(false);
        setConnectionCheckAttempts(0);
        return;
      }

      if (!connectionPending) {
        setIsCheckingConnection(false);
        return;
      }

      attempts += 1;
      setConnectionCheckAttempts(attempts);

      if (attempts >= 8) {
        setIsCheckingConnection(false);
        return;
      }

      setIsCheckingConnection(true);
      timeoutId = window.setTimeout(() => {
        void pollConnection();
      }, 2200);
    };

    setIsCheckingConnection(connectionPending && !hasLiveConnection);
    void pollConnection();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [connectionPending, hasLiveConnection]);

  useEffect(() => {
    let cancelled = false;

    const loadLatestConversation = async () => {
      setLoadingConversation(true);

      try {
        const listRes = await fetch('/api/holded/conversations');
        const listData = await listRes.json().catch(() => null);
        if (!listRes.ok || !listData?.ok) {
          throw new Error('No hemos podido cargar tus chats.');
        }

        const conversations = Array.isArray(listData.conversations) ? listData.conversations : [];
        if (!cancelled) {
          setRecentConversations(conversations);
        }

        const latestId = conversations[0]?.id;
        if (!latestId) return;

        const detailRes = await fetch(`/api/holded/conversations/${latestId}`);
        const detailData = await detailRes.json().catch(() => null);
        if (!detailRes.ok || !detailData?.ok || !detailData?.conversation) {
          throw new Error('No hemos podido recuperar el chat mas reciente.');
        }

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
        if (!cancelled) {
          setLoadingConversation(false);
        }
      }
    };

    void loadLatestConversation();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, introReady, step]);

  const persistOnboarding = (nextAnswers: OnboardingAnswers) => {
    setAnswers(nextAnswers);
    window.localStorage.setItem(storageKey(session.tenantId), JSON.stringify(nextAnswers));
  };

  const saveProfile = async (nextAnswers: OnboardingAnswers) => {
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nextAnswers.preferredName,
          companyName: nextAnswers.companyName,
          phone: nextAnswers.phone,
        }),
      });
    } catch {
      // keep local onboarding state even if persistence fails
    }
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setChatError(null);
  };

  const openConversation = async (id: string) => {
    setLoadingConversation(true);
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
      setChatError(null);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'No hemos podido abrir ese chat.');
    } finally {
      setLoadingConversation(false);
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || !hasLiveConnection || !answers) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setLoading(true);
    setChatError(null);

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
          return next.slice(0, 16);
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

  const selectedGoalCount = selectedGoals.length;
  const companyLabel = answers?.companyName || companyOptions[0] || null;
  const effectiveQuickPrompts = quickPrompts?.length ? quickPrompts : QUICK_START_PROMPTS;
  const hasConversationHistory = recentConversations.length > 0;
  const hasFewBusinessData =
    hasLiveConnection &&
    (!companyLabel ||
      !connectionState.validationSummary ||
      connectionState.supportedModules.length < 2);
  const canShowSummaryCTA =
    hasLiveConnection &&
    (connectionState.supportedModules.length > 0 ||
      Boolean(connectionState.validationSummary) ||
      Boolean(connectionState.lastValidatedAt));
  const welcomeGoals = answers?.goals?.slice(0, 2).join(' y ');
  const assistantLeadMessage = useMemo(() => {
    const person = answers?.preferredName || selectedName || defaultName;
    const role = formatRoleLabel(answers?.roleInCompany);
    const company = companyLabel || 'tu empresa';

    if (!hasLiveConnection) {
      if (connectionPending) {
        return `${greeting}, ${person}. Estoy terminando de enlazar tu espacio de ${company}. En unos segundos deberia quedar listo para trabajar con tus datos reales.`;
      }
      return `Hola, ${person}. En cuanto conectemos Holded podre ayudarte con datos reales de ${company}.`;
    }

    if (hasConversationHistory) {
      return `${greeting}, ${person}. Ya tengo a mano tu contexto de ${company} y podemos seguir donde lo dejaste o ir directos a una tarea concreta.`;
    }

    if (hasFewBusinessData) {
      return `${greeting}, ${person}. Ya tengo acceso a tu cuenta de Holded y he preparado todo para ayudarte con tu negocio en ${company}.`;
    }

    return `${greeting}, ${person}. Ya tengo acceso a tu cuenta de Holded y he preparado todo para ayudarte con tu negocio en ${company}.`;
  }, [
    answers?.goals,
    answers?.preferredName,
    answers?.roleInCompany,
    companyLabel,
    defaultName,
    greeting,
    hasConversationHistory,
    hasFewBusinessData,
    isConnected,
    selectedName,
  ]);
  const assistantSupportMessage = useMemo(() => {
    if (!hasLiveConnection) {
      if (connectionPending) {
        return 'Ya tengo tu contexto inicial y estoy esperando la confirmacion final de Holded para activar respuestas con datos reales.';
      }
      return 'Conecta Holded y entrare con tus facturas, gastos y validaciones disponibles.';
    }

    if (hasFewBusinessData) {
      return `Puedo empezar a ayudarte como ${formatRoleLabel(answers?.roleInCompany)} con una lectura clara de tu negocio y seguir afinando el contexto a medida que trabajamos.`;
    }

    const modules =
      connectionState.supportedModules.length > 0
        ? connectionState.supportedModules.slice(0, 4).join(', ')
        : null;

    if (modules) {
      return `Puedo ayudarte a entender tus numeros, resolver dudas o hacer tareas en segundos. Ya veo informacion util de Holded en ${modules}.`;
    }

    return 'Puedo ayudarte a entender tus numeros, revisar tus pendientes y convertir dudas contables en respuestas claras y accionables.';
  }, [
    answers?.roleInCompany,
    connectionPending,
    connectionState.supportedModules,
    greeting,
    hasFewBusinessData,
    hasLiveConnection,
  ]);

  const handleNameChoice = (value: string) => {
    setSelectedName(value === 'Lo decidire despues' ? defaultName : value);
    setStep(1);
  };

  const handleCompanyChoice = (value: string) => {
    setSelectedCompany(value);
    setStep(2);
  };

  const handleRoleChoice = (value: string) => {
    setSelectedRole(value);
    setStep(3);
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals((current) => {
      if (current.includes(goal)) {
        return current.filter((item) => item !== goal);
      }
      if (current.length >= 3) return current;
      return [...current, goal];
    });
  };

  const finishOnboarding = () => {
    const nextAnswers = {
      preferredName: selectedName || defaultName,
      companyName: selectedCompany || companyLabel || 'tu empresa',
      roleInCompany: selectedRole || ROLE_OPTIONS[0],
      phone: selectedPhone.trim(),
      businessSector: selectedSector || SECTOR_OPTIONS[0],
      websiteState: selectedWebsite || WEBSITE_OPTIONS[0],
      employeeRange: selectedEmployees || EMPLOYEE_OPTIONS[0],
      goals: selectedGoals.length > 0 ? selectedGoals : [GOAL_OPTIONS[0]],
    };
    persistOnboarding(nextAnswers);
    void saveProfile(nextAnswers);
    setStep(4);
  };

  const renderWelcome = () => {
    if (loadingConversation) {
      return (
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 text-sm text-slate-600 shadow-sm">
          Cargando tu espacio...
        </div>
      );
    }

    if (!hasLiveConnection && !onboardingDone) {
      if (showConnectionWarmup) {
        return (
          <div className="rounded-[2rem] border border-sky-200 bg-sky-50 p-6 text-left shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-sky-900">
              <Loader2 className="h-4 w-4 animate-spin" />
              Estoy terminando de preparar la conexion de Holded
            </div>
            <p className="mt-3 text-sm leading-7 text-sky-950">
              Ya he recibido tu configuracion inicial. En cuanto termine la verificacion final,
              activare el chat con tus datos reales sin devolverte al onboarding.
            </p>
          </div>
        );
      }

      return (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-left shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertCircle className="h-4 w-4" />
            Falta conectar Holded
          </div>
          <p className="mt-3 text-sm leading-7 text-amber-950">
            Para que Isaak trabaje con tus datos reales, primero necesitamos tu conexion con Holded.
          </p>
          <Link
            href="/onboarding/holded"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Conectar Holded
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      );
    }

    if (messages.length > 0) return null;

    const roleLabel = formatRoleLabel(answers?.roleInCompany);
    const holdedStatusLabel = hasLiveConnection
      ? connectionState.supportedModules.length > 0
        ? 'Datos listos'
        : 'Conexion inicial'
      : connectionVerificationStalled
        ? 'Revision manual recomendada'
        : 'Verificacion final en curso';
    const validationHint = hasLiveConnection
      ? connectionState.validationSummary || assistantSupportMessage
      : connectionVerificationStalled
        ? 'Todavia no he podido confirmar la conexion real de Holded. Puedes revisar la integracion sin perder tu contexto.'
        : 'Ya tengo tu configuracion inicial y estoy terminando la comprobacion final de Holded.';

    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="flex justify-center lg:justify-start">
            <div className="isaak-avatar-float relative h-[300px] w-[240px] sm:h-[360px] sm:w-[280px]">
              <Image
                src="/Personalidad/isaak-medio-cuerpo-verifactu.png"
                alt="Isaak"
                fill
                sizes="(max-width: 1024px) 280px, 320px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="space-y-5">
            <div className="isaak-fade-up rounded-[2rem] border border-slate-200 bg-white/92 p-5 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.4)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Tu asistente fiscal y contable
              </div>
              {!introReady ? (
                <div className="isaak-typing-dots mt-4 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3">
                  <span />
                  <span />
                  <span />
                </div>
              ) : (
                <>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    {greeting}, {answers?.preferredName || selectedName || defaultName}
                  </h1>
                  <p className="mt-3 text-base leading-8 text-slate-600">
                    Soy Isaak. Voy a ayudarte a gestionar tu empresa de forma mas simple.
                  </p>
                </>
              )}
            </div>

            {introReady ? (
              <div className="isaak-fade-up rounded-[2rem] border border-slate-200 bg-white/92 p-5 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.4)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Bot className="h-4 w-4 text-[#2361d8]" />
                  Contexto inmediato
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {showConnectionWarmup
                    ? `Ya tengo tu contexto inicial para ${companyLabel || 'tu empresa'}. Estoy terminando la ultima verificacion con Holded para activar respuestas con datos reales.`
                    : buildWelcomeContext(isConnected, companyLabel)}
                </p>
                {showConnectionWarmup ? (
                  <div className="mt-4 flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {isCheckingConnection
                      ? 'Comprobando la conexion en tiempo real'
                      : 'La comprobacion esta tardando mas de lo normal'}
                  </div>
                ) : null}
              </div>
            ) : null}

            {introReady && !onboardingDone ? (
              <div className="isaak-fade-up rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.4)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Loader2 className="h-4 w-4 animate-spin text-[#2361d8]" />
                  Estoy terminando de preparar tu espacio
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  En cuanto termine el arranque inicial te llevare directamente al chat con todo
                  listo.
                </p>
              </div>
            ) : null}

            {introReady && onboardingDone ? (
              <div className="space-y-4">
                <div className="isaak-fade-up rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 overflow-hidden rounded-full border border-slate-200 bg-[#fff4f5]">
                      <Image
                        src="/Personalidad/isaak-avatar-verifactu.png"
                        alt="Isaak"
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Isaak</div>
                      <div className="text-xs text-slate-500">
                        {hasConversationHistory
                          ? 'Listo para retomar contigo'
                          : 'Listo para empezar contigo'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[1.6rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-700">
                    <p>{assistantLeadMessage}</p>
                    <p className="mt-3">{assistantSupportMessage}</p>
                    <p className="mt-3 text-slate-600">
                      Puedes preguntarme lo que necesites. Yo me adapto a como quieres gestionar tu
                      negocio.
                    </p>
                    {instructionProfile?.businessContextSummary ? (
                      <p className="mt-3 text-slate-600">
                        {instructionProfile.businessContextSummary}
                      </p>
                    ) : null}
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                      {validationHint}
                    </div>
                    {showConnectionWarmup ? (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-900">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {isCheckingConnection
                          ? 'Estoy activando Holded con tus datos reales'
                          : 'La activacion sigue pendiente; puedes revisar la integracion'}
                      </div>
                    ) : hasFewBusinessData ? (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Tengo pocos datos todavia, pero ya puedo ayudarte con contexto inicial
                      </div>
                    ) : (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Holded ya esta listo para responder con contexto real
                      </div>
                    )}
                    <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <div>Empresa: {answers?.companyName || companyLabel || 'Tu empresa'}</div>
                      <div>Rol: {roleLabel}</div>
                      <div>Sector: {answers?.businessSector || 'Pendiente'}</div>
                      <div>Holded: {holdedStatusLabel}</div>
                    </div>
                    {connectionState.lastValidatedAt ? (
                      <div className="mt-3 text-xs text-slate-500">
                        Ultima actualizacion: {formatDate(connectionState.lastValidatedAt)}
                      </div>
                    ) : null}
                    {connectionVerificationStalled ? (
                      <div className="mt-4">
                        <Link
                          href="/onboarding/holded"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Revisar conexion Holded
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="isaak-fade-up rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">
                    {hasConversationHistory ? 'Puedes retomar con algo como esto' : 'Por ejemplo'}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-slate-600">
                    {hasConversationHistory
                      ? 'He recuperado tu contexto. Si quieres, seguimos con una pregunta concreta o vamos a un resumen rapido.'
                      : `Voy a centrarme en ayudarte con ${welcomeGoals || 'la gestion diaria de tu negocio'}. Puedes empezar cuando quieras.`}
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                      {effectiveQuickPrompts.slice(0, 4).map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => void sendMessage(prompt)}
                          disabled={!hasLiveConnection}
                          className="block text-left font-medium transition hover:text-[#b42332] disabled:cursor-not-allowed disabled:text-slate-400"
                        >
                          - {prompt}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {effectiveQuickPrompts.slice(0, 4).map((prompt) => (
                        <button
                          key={`${prompt}-chip`}
                          type="button"
                          onClick={() => void sendMessage(prompt)}
                          disabled={!hasLiveConnection}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#ff5460]/30 hover:bg-[#fff7f7] disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                  {canShowSummaryCTA ? (
                    <button
                      type="button"
                      onClick={() => void sendMessage('Quiero ver un resumen del negocio')}
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f55c0]"
                    >
                      Ver resumen del negocio
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff8f3_0%,#fffdf8_38%,#ffffff_72%)] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200/80 bg-white/85 px-4 py-5 backdrop-blur lg:border-b-0 lg:border-r lg:px-5">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
              <Image
                src="/Personalidad/isaak-avatar-verifactu.png"
                alt="Isaak"
                fill
                sizes="48px"
                className="object-cover"
                priority
              />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Tu asistente fiscal y contable
              </div>
              <div className="mt-1 text-base font-semibold text-slate-950">Isaak</div>
            </div>
          </div>
          <button
            type="button"
            onClick={startNewChat}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Nuevo chat
          </button>

          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Plan actual
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">Plan gratuito</div>
                <div className="mt-1 text-sm text-slate-500">Ideal para empezar con Holded</div>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Actualizar
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Integraciones
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm">
                  <Image
                    src="/brand/holded/holded-diamond-logo.png"
                    alt="Holded"
                    fill
                    sizes="40px"
                    className="object-contain p-2"
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-950">Holded</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {hasLiveConnection
                      ? 'Conectado'
                      : showConnectionWarmup
                        ? 'Verificando'
                        : 'Pendiente de conexion'}
                  </div>
                </div>
              </div>
              <Link
                href="/onboarding/holded"
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {isConnected ? 'Revisar' : 'Conectar'}
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Historial
            </div>
            <div className="mt-3 space-y-2">
              {recentConversations.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 px-4 py-5 text-sm leading-6 text-slate-500">
                  Tus chats apareceran aqui.
                </div>
              ) : null}
              {recentConversations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openConversation(item.id)}
                  className={`w-full rounded-[1.25rem] border px-4 py-3 text-left transition ${
                    conversationId === item.id
                      ? 'border-slate-900 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`truncate text-sm font-semibold ${
                      conversationId === item.id ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {item.title || 'Chat con Isaak'}
                  </div>
                  <div
                    className={`mt-1 text-xs ${
                      conversationId === item.id ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {formatDate(item.lastActivity)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="relative flex min-h-screen flex-col px-4 py-5 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Producto principal
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {companyLabel ? `Conectado a ${companyLabel}` : 'Asistente conectado a Holded'}
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#2361d8]" />
              Plan gratuito - Actualizar
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col" ref={chatRef}>
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col justify-center py-10">{renderWelcome()}</div>
            ) : (
              <div className="flex flex-1 flex-col justify-end pt-8">
                <div className="mx-auto w-full max-w-3xl space-y-5 pb-6">
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
              </div>
            )}

            <div className="mx-auto w-full max-w-3xl pb-6">
              {chatError ? (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {chatError}
                </div>
              ) : null}

              {messages.length > 0 && isConnected ? (
                <div className="mb-4 flex flex-wrap gap-3">
                  {effectiveQuickPrompts.slice(0, 4).map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#ff5460]/30 hover:bg-[#fff7f7]"
                    >
                      {prompt}
                    </button>
                  ))}
                  {canShowSummaryCTA ? (
                    <button
                      type="button"
                      onClick={() => void sendMessage('Quiero ver un resumen del negocio')}
                      className="rounded-full border border-[#2361d8]/20 bg-[#eef4ff] px-4 py-2.5 text-sm font-semibold text-[#2361d8] shadow-sm transition hover:bg-[#dfeaff]"
                    >
                      Ver resumen del negocio
                    </button>
                  ) : null}
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
                      hasLiveConnection && onboardingDone
                        ? 'Preguntame por ventas, gastos, cobros o facturas'
                        : showConnectionWarmup && onboardingDone
                          ? 'Estoy activando Holded con tus datos reales...'
                          : 'Termina el arranque de Isaak para activar el chat'
                    }
                    rows={3}
                    className="min-h-[92px] flex-1 resize-none rounded-[1.5rem] border-0 bg-transparent px-3 py-3 text-[15px] leading-7 text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim() || !hasLiveConnection || !onboardingDone}
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
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

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  {hasLiveConnection
                    ? `Holded conectado - Ultima validacion ${formatDate(connectionState.lastValidatedAt)}`
                    : showConnectionWarmup
                      ? isCheckingConnection
                        ? 'Verificando la conexion final de Holded'
                        : 'La verificacion de Holded sigue pendiente'
                      : 'Conecta Holded para usar datos reales'}
                </div>
                <div className="flex items-center gap-3">
                  <span>Integraciones disponibles</span>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700">
                    <div className="relative h-4 w-4 overflow-hidden rounded-full">
                      <Image
                        src="/brand/holded/holded-diamond-logo.png"
                        alt="Holded"
                        fill
                        sizes="16px"
                        className="object-contain"
                      />
                    </div>
                    Holded
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="fixed bottom-5 right-5 z-40">
            <div className="relative">
              {showSettings ? (
                <div className="absolute bottom-14 right-0 w-64 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.45)]">
                  <div className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Ajustes rapidos
                  </div>
                  <Link
                    href="/onboarding/holded"
                    className="flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Revisar conexion Holded
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/support"
                    className="flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Abrir soporte
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <div className="rounded-2xl px-3 py-3 text-sm text-slate-500">
                    Perfil y facturacion iran aqui en la siguiente iteracion.
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setShowSettings((current) => !current)}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.5)] transition hover:bg-slate-50"
                aria-label="Abrir ajustes"
              >
                <Settings2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
