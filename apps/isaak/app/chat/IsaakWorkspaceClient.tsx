'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  'Saber que impuestos pagar',
  'Emitir facturas facilmente',
  'Resolver dudas fiscales',
  'Controlar ingresos y gastos',
  'Llevar la gestion completa',
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

export default function IsaakWorkspaceClient({ session }: { session: SessionInfo }) {
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
  const [answers, setAnswers] = useState<OnboardingAnswers | null>(null);
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

  const isConnected = Boolean(connectionState.keyMasked);
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
  }, [session.tenantId]);

  useEffect(() => {
    let cancelled = false;

    const loadConnectionState = async () => {
      try {
        const res = await fetch('/api/holded/status', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || cancelled) return;

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
      } catch {
        // keep session state
      }
    };

    void loadConnectionState();
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!trimmed || loading || !isConnected || !answers) return;

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

  const onboardingDone = Boolean(answers);
  const selectedGoalCount = selectedGoals.length;
  const companyLabel = answers?.companyName || companyOptions[0] || null;

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

    if (!isConnected) {
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

    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="flex justify-center lg:justify-start">
            <div className="isaak-avatar-float relative h-[300px] w-[240px] sm:h-[360px] sm:w-[280px]">
              <Image
                src="/Personalidad/Isaak%20medio%20cuerpo.png"
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
                  {buildWelcomeContext(isConnected, companyLabel)}
                </p>
              </div>
            ) : null}

            {introReady && isConnected && !onboardingDone ? (
              <div className="isaak-fade-up rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.4)]">
                {step === 0 ? (
                  <>
                    <div className="text-sm font-semibold text-slate-900">
                      Como prefieres que te llame?
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleNameChoice(defaultName)}
                        className="rounded-full border border-slate-200 bg-[#fff7f7] px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-[#ff5460]/30"
                      >
                        {defaultName}
                      </button>
                      {alternateNames.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleNameChoice(option)}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                        >
                          {option === 'Lo decidire despues' ? 'Otro nombre' : option}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}

                {step === 1 ? (
                  <>
                    <div className="text-sm font-semibold text-slate-900">
                      Nombre de tu empresa?
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      He detectado estos nombres desde Holded. Elige el que quieras usar dentro de
                      Isaak.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {(companyOptions.length > 0 ? companyOptions : ['Tu empresa']).map(
                        (option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleCompanyChoice(option)}
                            className="rounded-full border border-slate-200 bg-[#fff7f7] px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-[#ff5460]/30"
                          >
                            {option}
                          </button>
                        )
                      )}
                    </div>
                  </>
                ) : null}

                {step === 2 ? (
                  <>
                    <div className="text-sm font-semibold text-slate-900">
                      Cual es tu papel dentro de la empresa?
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Asi adapto mejor el tono y el tipo de ayuda que te voy a dar.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {ROLE_OPTIONS.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => handleRoleChoice(role)}
                          className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                            selectedRole === role
                              ? 'border-[#ff5460]/30 bg-[#fff1f2] text-[#b42332]'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}

                {step === 3 ? (
                  <>
                    <div className="text-sm font-semibold text-slate-900">
                      Cuentame un poco mas de tu empresa
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Con esto preparo mejor tu contexto inicial. Solo necesito lo minimo.
                    </p>

                    <div className="mt-4">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Telefono de contacto
                      </label>
                      <input
                        value={selectedPhone}
                        onChange={(event) => setSelectedPhone(event.target.value)}
                        placeholder="Ej. 600 123 123"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                      />
                    </div>

                    <div className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Sector
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {SECTOR_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setSelectedSector(option)}
                          className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                            selectedSector === option
                              ? 'border-[#ff5460]/30 bg-[#fff1f2] text-[#b42332]'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    <div className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Pagina web
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {WEBSITE_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setSelectedWebsite(option)}
                          className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                            selectedWebsite === option
                              ? 'border-[#ff5460]/30 bg-[#fff1f2] text-[#b42332]'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    <div className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Equipo
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {EMPLOYEE_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setSelectedEmployees(option)}
                          className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                            selectedEmployees === option
                              ? 'border-[#ff5460]/30 bg-[#fff1f2] text-[#b42332]'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    <div className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      En que quieres que te ayude principalmente
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {GOAL_OPTIONS.map((goal) => {
                        const selected = selectedGoals.includes(goal);
                        return (
                          <button
                            key={goal}
                            type="button"
                            onClick={() => toggleGoal(goal)}
                            className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                              selected
                                ? 'border-[#ff5460]/30 bg-[#fff1f2] text-[#b42332]'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {goal}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-4">
                      <div className="text-xs font-medium text-slate-500">
                        {selectedGoalCount}/3 seleccionadas
                      </div>
                      <button
                        type="button"
                        onClick={finishOnboarding}
                        disabled={selectedGoalCount === 0}
                        className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        Continuar
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            {onboardingDone ? (
              <div className="space-y-4">
                <div className="isaak-fade-up rounded-[2rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                    <CheckCircle2 className="h-4 w-4" />
                    Perfecto, lo tengo
                  </div>
                  <p className="mt-3 text-sm leading-7 text-emerald-950">
                    A partir de ahora voy a centrarme en ayudarte con:
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-emerald-950">
                    {answers?.goals.slice(0, 3).map((goal) => (
                      <li key={goal}>- {goal}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm leading-7 text-emerald-950">
                    Puedes empezar preguntandome lo que necesites.
                  </p>
                  <div className="mt-4 grid gap-2 text-sm text-emerald-950 sm:grid-cols-2">
                    <div>Empresa: {answers?.companyName}</div>
                    <div>Rol: {answers?.roleInCompany}</div>
                    <div>Sector: {answers?.businessSector}</div>
                    <div>Equipo: {answers?.employeeRange}</div>
                  </div>
                </div>

                <div className="isaak-fade-up rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">Por ejemplo</div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {QUICK_START_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendMessage(prompt)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#ff5460]/30 hover:bg-[#fff7f7]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void sendMessage('Quiero ver un resumen de este mes')}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f55c0]"
                  >
                    Ver resumen
                    <ChevronRight className="h-4 w-4" />
                  </button>
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
                src="/Personalidad/Isaak%20avatar%202.png"
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
              <div>
                <div className="text-sm font-semibold text-slate-950">Holded</div>
                <div className="mt-1 text-xs text-slate-500">
                  {isConnected ? 'Conectado' : 'Pendiente de conexion'}
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
                  {QUICK_START_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#ff5460]/30 hover:bg-[#fff7f7]"
                    >
                      {prompt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => void sendMessage('Quiero ver un resumen de este mes')}
                    className="rounded-full border border-[#2361d8]/20 bg-[#eef4ff] px-4 py-2.5 text-sm font-semibold text-[#2361d8] shadow-sm transition hover:bg-[#dfeaff]"
                  >
                    Ver resumen
                  </button>
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
                      isConnected && onboardingDone
                        ? 'Preguntame por ventas, gastos, cobros o facturas'
                        : 'Termina el arranque de Isaak para activar el chat'
                    }
                    rows={3}
                    className="min-h-[92px] flex-1 resize-none rounded-[1.5rem] border-0 bg-transparent px-3 py-3 text-[15px] leading-7 text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim() || !isConnected || !onboardingDone}
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
                  {isConnected
                    ? `Holded conectado - Ultima validacion ${formatDate(connectionState.lastValidatedAt)}`
                    : 'Conecta Holded para usar datos reales'}
                </div>
                <div className="flex items-center gap-3">
                  <span>Integraciones disponibles</span>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
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
