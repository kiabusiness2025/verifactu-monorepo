'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  Code2,
  CreditCard,
  Crown,
  ExternalLink,
  LifeBuoy,
  Loader2,
  Mail,
  MessageCircle,
  PlugZap,
  RefreshCcw,
  Send,
  Shield,
  Sparkles,
  Trash2,
  Unplug,
  UserCircle2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

type SettingsData = {
  profile: {
    photoUrl: string | null;
    firstName: string;
    email: string;
    phone: string | null;
    roleInCompany: string | null;
  };
  company: {
    tradeName: string;
    legalName: string;
    activityMain: string;
    sector: string;
    address: string;
    postalCode: string;
    city: string;
    province: string;
    country: string;
    taxId: string;
    representative: string;
    website: string;
    phone: string;
    teamSize: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
  connection: {
    status: string;
    tenantName: string | null;
    keyMasked: string | null;
    connectedAt: string | null;
    lastValidatedAt: string | null;
    validationSummary: string | null;
    supportedModules: string[];
  };
  isaak: {
    preferredName: string;
    communicationStyle: string;
    likelyKnowledgeLevel: string;
    mainGoals: string[];
    resetUrl: string;
  };
  billing: {
    name: string;
    code: string;
    status: string;
    stripeStatus: string | null;
    trialEndsAt: string | null;
    daysUntilTrialEnd: number | null;
    nextRenewalAt: string | null;
    cancelAtPeriodEnd: boolean;
    paymentMethodSummary: string | null;
    customerId: string | null;
    subscriptionId: string | null;
    portalAvailable: boolean;
    checkoutAvailable: boolean;
    cancelAvailable: boolean;
    invoices: Array<{
      id: string;
      number: string | null;
      status: string | null;
      amountDue: number | null;
      amountPaid: number | null;
      currency: string | null;
      hostedInvoiceUrl: string | null;
      invoicePdf: string | null;
      createdAt: string | null;
    }>;
  };
  team: {
    enabled: boolean;
    activeMembers: number;
    maxSeats: number;
    planCode: string;
    canManage: boolean;
    members: Array<{
      id: string;
      userId: string;
      name: string | null;
      email: string | null;
      image: string | null;
      role: string;
      status: string;
      createdAt: string;
      confirmedAt: string | null;
      isCurrentUser: boolean;
    }>;
    workspaces: Array<{
      tenantId: string;
      name: string;
      taxId: string | null;
      role: string;
      isCurrent: boolean;
    }>;
  };
};

const PLAN_TIERS = [
  {
    code: 'starter',
    name: 'Starter',
    price: 19,
    tagline: 'Para autónomos y freelancers',
    features: [
      '1 ERP conectado (Holded)',
      '100 preguntas al mes',
      'Chat con historial completo',
      'Dashboard KPI básico',
      'Soporte por email',
    ],
    cta: 'checkout' as const,
    highlight: false,
  },
  {
    code: 'pyme',
    name: 'Pyme',
    price: 49,
    tagline: 'El más popular para pymes',
    features: [
      '1 ERP conectado',
      'Preguntas ilimitadas',
      'Crear facturas Verifactu desde chat',
      'Integraciones Google (Calendar, Gmail)',
      'Carga de archivos + OCR',
      'Soporte prioritario',
    ],
    cta: 'contact' as const,
    highlight: true,
  },
  {
    code: 'empresa',
    name: 'Empresa',
    price: 149,
    tagline: 'Para equipos y despachos',
    features: [
      'Hasta 3 ERPs conectados',
      'Multi-usuario',
      'Notificaciones fiscales (push + email)',
      'Voz: entrada y salida',
      'API access',
      'Onboarding dedicado + SLA',
    ],
    cta: 'contact' as const,
    highlight: false,
  },
];

type SectionKey =
  | 'profile'
  | 'company'
  | 'connections'
  | 'isaak'
  | 'team'
  | 'billing'
  | 'notificaciones'
  | 'developer';

const TEAM_OPTIONS = ['Solo yo', '2-5 personas', '6-20 personas', 'Mas de 20'];
const GOAL_OPTIONS = [
  'Entender mi contabilidad',
  'Resolver dudas fiscales',
  'Emitir facturas facilmente',
  'Controlar ingresos y gastos',
  'Entender balances y resultados',
  'Llevar mejor la gestion diaria',
];
const sections: Array<{
  key: SectionKey;
  label: string;
  icon: typeof UserCircle2;
  external?: string;
}> = [
  { key: 'profile', label: 'Perfil', icon: UserCircle2 },
  { key: 'company', label: 'Empresa', icon: Building2 },
  { key: 'connections', label: 'Conexiones', icon: PlugZap, external: '/integrations' },
  { key: 'isaak', label: 'Isaak', icon: Sparkles },
  { key: 'team', label: 'Equipo', icon: Users },
  { key: 'billing', label: 'Facturación', icon: CreditCard },
  { key: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { key: 'developer', label: 'Developer', icon: Code2, external: '/integrations?tab=developer' },
];

function deriveInitial(name: string) {
  return (name.trim().charAt(0) || 'I').toUpperCase();
}

function formatRole(value: string | null) {
  if (!value) return 'Sin definir';
  switch (value) {
    case 'autonomo':
      return 'Autonomo';
    case 'administrador':
      return 'Administrador';
    case 'gerente':
      return 'Gerente';
    case 'financiero':
      return 'Financiero';
    default:
      return value;
  }
}

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

function formatMoney(amount: number | null, currency: string | null) {
  if (typeof amount !== 'number') return 'No disponible';
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: (currency || 'EUR').toUpperCase(),
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${(currency || 'EUR').toUpperCase()}`;
  }
}

function formatSupportedModule(value: string) {
  switch (value) {
    case 'invoicing':
      return 'Ventas, facturas y clientes';
    case 'accounting':
      return 'Contabilidad';
    case 'crm':
      return 'CRM';
    case 'projects':
      return 'Proyectos';
    case 'team':
      return 'Equipo';
    default:
      return value;
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.readAsDataURL(file);
  });
}

// ── PWA Install Card ──────────────────────────────────────────────────────────

function PwaInstallCard() {
  const [prompt, setPrompt] = useState<
    (Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> }) | null
  >(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ((window.navigator as Navigator & { standalone?: boolean }).standalone ?? false);
    if (standalone) {
      setInstalled(true);
      return;
    }

    const ua = window.navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const android = /Android/i.test(ua);
    setIsIos(ios);
    setIsAndroid(android);

    const savedDismiss = window.localStorage.getItem('isaak-install-dismissed');
    if (savedDismiss === 'true') {
      setDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as Event & { prompt?: () => Promise<void> });
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (installed || dismissed) return null;

  return (
    <div className="rounded-[1.6rem] border border-[#2361d8]/20 bg-gradient-to-br from-[#f0f5ff] to-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2361d8]/10">
            <Sparkles className="h-4 w-4 text-[#2361d8]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Instalar Isaak</div>
            <div className="text-xs text-slate-500">Accede desde tu pantalla de inicio</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            window.localStorage.setItem('isaak-install-dismissed', 'true');
          }}
          className="text-slate-400 hover:text-slate-600"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
      {prompt ? (
        <>
          <p className="mt-3 text-xs text-slate-600">
            Instala Isaak como app en tu móvil para acceso directo, sin necesidad de abrir el
            navegador.
          </p>
          <button
            type="button"
            onClick={async () => {
              if (prompt?.prompt) {
                await prompt.prompt();
                const choice = await prompt.userChoice;
                if (choice?.outcome === 'accepted') setInstalled(true);
                setPrompt(null);
              }
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#2361d8] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1d55c2]"
          >
            <Sparkles className="h-3 w-3" />
            Instalar ahora
          </button>
        </>
      ) : isIos ? (
        <p className="mt-3 text-xs text-slate-600">
          En iPhone: pulsa <span className="font-semibold">Compartir</span> en Safari y luego
          <span className="font-semibold"> Añadir a pantalla de inicio</span>.
        </p>
      ) : isAndroid ? (
        <p className="mt-3 text-xs text-slate-600">
          En Android: abre el menú de Chrome (⋮) y pulsa
          <span className="font-semibold"> Instalar app</span> o
          <span className="font-semibold"> Añadir a pantalla de inicio</span>.
        </p>
      ) : null}
    </div>
  );
}

// ── Push Notifications Card ────────────────────────────────────────────────────

type PushPrefs = {
  alertaFiscal: boolean;
  documentoSinConciliar: boolean;
  avisoProactivoIsaak: boolean;
};

const PUSH_EVENTS: Array<{ key: keyof PushPrefs; label: string; description: string }> = [
  {
    key: 'alertaFiscal',
    label: 'Alerta fiscal próxima',
    description: 'D-15, D-7, D-3 y D-1 antes de cada plazo trimestral',
  },
  {
    key: 'documentoSinConciliar',
    label: 'Documento pendiente',
    description: 'Facturas o movimientos sin conciliar que necesitan atención',
  },
  {
    key: 'avisoProactivoIsaak',
    label: 'Aviso proactivo de Isaak',
    description: 'Cuando Isaak detecta algo relevante en tu contabilidad',
  },
];

function PushNotificationsCard() {
  const [status, setStatus] = useState<'idle' | 'subscribed' | 'denied' | 'unsupported'>('idle');
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState<PushPrefs | null>(null);
  const [savingPref, setSavingPref] = useState<keyof PushPrefs | null>(null);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setStatus('unsupported');
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.pushManager
          .getSubscription()
          .then((sub) => {
            const newStatus = sub ? 'subscribed' : 'idle';
            setStatus(newStatus);
            if (newStatus === 'subscribed') {
              void fetch('/api/isaak/push/preferences')
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                  if (d) setPrefs(d as PushPrefs);
                });
            }
          })
          .catch(() => setStatus('idle'));
      })
      .catch(() => setStatus('unsupported'));
  }, []);

  async function subscribe() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey || !('serviceWorker' in navigator)) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await fetch('/api/isaak/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      setStatus('subscribed');
      // Load preferences after subscribing
      void fetch('/api/isaak/push/preferences')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) setPrefs(d as PushPrefs);
        });
    } catch {
      setStatus('denied');
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/isaak/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus('idle');
      setPrefs(null);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function togglePref(key: keyof PushPrefs, value: boolean) {
    setSavingPref(key);
    setPrefs((prev) => (prev ? { ...prev, [key]: value } : prev));
    try {
      const res = await fetch('/api/isaak/push/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) setPrefs((prev) => (prev ? { ...prev, [key]: !value } : prev));
    } catch {
      setPrefs((prev) => (prev ? { ...prev, [key]: !value } : prev));
    } finally {
      setSavingPref(null);
    }
  }

  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full ${status === 'subscribed' ? 'bg-blue-50' : 'bg-slate-100'}`}
          >
            <Bell
              className={`h-4 w-4 ${status === 'subscribed' ? 'text-[#2361d8]' : 'text-slate-400'}`}
            />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Notificaciones push</div>
            <div className="text-xs text-slate-500">Alertas en el navegador sin abrir Isaak</div>
          </div>
        </div>

        {status === 'unsupported' ? (
          <span className="text-xs text-slate-400">No soportado en este navegador</span>
        ) : status === 'subscribed' ? (
          <button
            type="button"
            onClick={() => void unsubscribe()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Unplug className="h-3 w-3" />
            )}
            Desactivar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void subscribe()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2361d8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1d55c2] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
            Activar
          </button>
        )}
      </div>

      {status === 'subscribed' && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Activas
            </span>
            <span className="text-xs text-slate-400">
              Recibirás alertas fiscales en este dispositivo
            </span>
          </div>

          {/* Event toggles */}
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-500">Qué quieres recibir</p>
            {PUSH_EVENTS.map((evt) => {
              const isOn = prefs ? prefs[evt.key] : true;
              const isSaving = savingPref === evt.key;
              return (
                <div key={evt.key} className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-800">{evt.label}</div>
                    <div className="text-xs text-slate-400">{evt.description}</div>
                  </div>
                  <button
                    type="button"
                    aria-label={isOn ? 'Desactivar' : 'Activar'}
                    disabled={isSaving || !prefs}
                    onClick={() => void togglePref(evt.key, !isOn)}
                    className={`relative mt-0.5 inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 ${isOn ? 'bg-[#2361d8]' : 'bg-slate-200'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${isOn ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {status === 'denied' && (
        <div className="mt-3 text-xs text-rose-600">
          El navegador ha bloqueado las notificaciones. Actívalas en la configuración del sitio.
        </div>
      )}
    </div>
  );
}

export default function IsaakSettingsClient({
  initialSection,
  settingsData,
}: {
  initialSection: string;
  settingsData: SettingsData;
}) {
  const activeSection = useMemo<SectionKey>(() => {
    if (initialSection === 'plan') return 'billing';
    const valid = new Set(sections.map((item) => item.key));
    return valid.has(initialSection as SectionKey) ? (initialSection as SectionKey) : 'profile';
  }, [initialSection]);

  const [profile, setProfile] = useState(settingsData.profile);
  const [company, setCompany] = useState(settingsData.company);
  const [connection, setConnection] = useState(settingsData.connection);
  const [isaak, setIsaak] = useState(settingsData.isaak);
  const [billing, setBilling] = useState(settingsData.billing);
  const [googleStatus, setGoogleStatus] = useState<{
    connected: boolean;
    email: string | null;
    googleConfigured: boolean;
  } | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleDisconnecting, setGoogleDisconnecting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<'success' | 'danger'>('success');
  const [error, setError] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<SectionKey | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCompanyLogo, setUploadingCompanyLogo] = useState(false);
  const [telegramDeepLink, setTelegramDeepLink] = useState<string | null>(null);
  const [telegramLinkLoading, setTelegramLinkLoading] = useState(false);

  // Team management state
  const [teamMembers, setTeamMembers] = useState(settingsData.team.members);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [switchingTenantId, setSwitchingTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (activeSection !== 'billing') return;
    if (billing.invoices.length > 0) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/settings/billing');
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok || cancelled) return;
        setBilling(data.data);
      } catch {
        // best effort lazy refresh
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSection, billing.invoices.length]);

  useEffect(() => {
    if (activeSection !== 'connections' || googleStatus) return;
    setGoogleLoading(true);
    void fetch('/api/isaak/google/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setGoogleStatus(d as typeof googleStatus);
      })
      .finally(() => setGoogleLoading(false));

    // Handle OAuth redirect notice
    const params = new URLSearchParams(window.location.search);
    const g = params.get('google');
    if (g === 'connected') {
      setNotice('Google Calendar conectado correctamente.');
      setNoticeTone('success');
    } else if (g === 'error') {
      setError('No se pudo conectar Google Calendar. Inténtalo de nuevo.');
    }
  }, [activeSection, googleStatus]);

  async function disconnectGoogle() {
    if (!confirm('¿Desconectar Google Calendar?')) return;
    setGoogleDisconnecting(true);
    try {
      await fetch('/api/isaak/google/disconnect', { method: 'DELETE' });
      setGoogleStatus((prev) => (prev ? { ...prev, connected: false, email: null } : null));
      setNotice('Google Calendar desconectado.');
      setNoticeTone('success');
    } finally {
      setGoogleDisconnecting(false);
    }
  }

  async function generateTelegramLink() {
    setTelegramLinkLoading(true);
    setTelegramDeepLink(null);
    try {
      const res = await fetch('/api/isaak/telegram/link', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setTelegramDeepLink(data.deepLink as string);
      }
    } catch {
      // silent
    } finally {
      setTelegramLinkLoading(false);
    }
  }

  async function requestJson<T>(section: SectionKey, url: string, init?: RequestInit): Promise<T> {
    setSavingSection(section);
    setNotice(null);
    setNoticeTone('success');
    setError(null);
    try {
      const res = await fetch(url, init);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'No hemos podido guardar los cambios.');
      }
      return data.data as T;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No hemos podido guardar los cambios.');
      throw err;
    } finally {
      setSavingSection(null);
    }
  }

  async function sendTeamInvite() {
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    setInviteSuccess(null);
    setInviteError(null);
    try {
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setInviteError(data?.error || 'No se pudo enviar la invitación.');
        return;
      }
      setInviteSuccess(`Invitación enviada a ${inviteEmail.trim()}.`);
      setInviteEmail('');
      // Optimistic: add invited member to list
      setTeamMembers((prev) => [
        ...prev,
        {
          id: data.membershipId as string,
          userId: '',
          name: null,
          email: inviteEmail.trim(),
          image: null,
          role: inviteRole,
          status: 'invited',
          createdAt: new Date().toISOString(),
          confirmedAt: null,
          isCurrentUser: false,
        },
      ]);
    } catch {
      setInviteError('No se pudo enviar la invitación.');
    } finally {
      setInviteSending(false);
    }
  }

  async function switchWorkspace(tenantId: string) {
    setSwitchingTenantId(tenantId);
    try {
      const res = await fetch('/api/team/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setInviteError(data?.error || 'No se pudo cambiar de espacio.');
        return;
      }
      // Hard reload to refresh server-side session resolution
      window.location.assign('/chat?workspaceSwitched=1');
    } catch {
      setInviteError('No se pudo cambiar de espacio.');
    } finally {
      setSwitchingTenantId(null);
    }
  }

  async function removeMember(membershipId: string) {
    if (!confirm('¿Eliminar este miembro del espacio de trabajo?')) return;
    setRemovingMemberId(membershipId);
    try {
      const res = await fetch(`/api/team/members/${membershipId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setInviteError(data?.error || 'No se pudo eliminar el miembro.');
        return;
      }
      setTeamMembers((prev) => prev.filter((m) => m.id !== membershipId));
    } catch {
      setInviteError('No se pudo eliminar el miembro.');
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function saveProfile() {
    try {
      const data = await requestJson<SettingsData['profile']>('profile', '/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: profile.firstName,
          phone: profile.phone,
        }),
      });
      setProfile(data);
      setNotice('Perfil guardado.');
      setNoticeTone('success');
    } catch {
      // handled in requestJson
    }
  }

  async function saveCompany() {
    try {
      const data = await requestJson<SettingsData['company']>('company', '/api/settings/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company),
      });
      setCompany({
        ...company,
        ...data,
        teamSize: company.teamSize,
      });
      setNotice('Empresa guardada.');
      setNoticeTone('success');
    } catch {
      // handled in requestJson
    }
  }

  async function uploadProfilePhoto(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Selecciona una imagen valida para el perfil.');
      return;
    }

    setUploadingAvatar(true);
    setError(null);
    try {
      const photoUrl = await fileToDataUrl(file);
      const res = await fetch('/api/settings/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'No se pudo actualizar la foto de perfil.');
      }

      setProfile((current) => ({ ...current, photoUrl: data.data?.photoUrl || photoUrl }));
      setNotice('Foto de perfil actualizada.');
      setNoticeTone('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la foto de perfil.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function uploadCompanyLogo(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Selecciona una imagen valida para el logo.');
      return;
    }

    setUploadingCompanyLogo(true);
    setError(null);
    try {
      const logoUrl = await fileToDataUrl(file);
      setCompany((current) => ({ ...current, logoUrl }));
      setNotice('Logo cargado. Pulsa Guardar empresa para confirmar.');
      setNoticeTone('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el logo.');
    } finally {
      setUploadingCompanyLogo(false);
    }
  }

  async function saveIsaak() {
    try {
      const data = await requestJson<SettingsData['isaak']>('isaak', '/api/settings/isaak', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredName: isaak.preferredName,
          communicationStyle: isaak.communicationStyle,
          likelyKnowledgeLevel: isaak.likelyKnowledgeLevel,
          mainGoals: isaak.mainGoals,
        }),
      });
      setIsaak(data);
      setNotice('Ajustes de Isaak guardados.');
      setNoticeTone('success');
    } catch {
      // handled in requestJson
    }
  }

  async function replaceHoldedApi() {
    if (!apiKeyDraft.trim()) {
      setError('Pega una API key valida de Holded.');
      return;
    }
    try {
      const data = await requestJson<SettingsData['connection']>(
        'connections',
        '/api/settings/connections/holded/replace',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: apiKeyDraft }),
        }
      );
      setConnection(data);
      setApiKeyDraft('');
      setNotice('Conexion Holded actualizada.');
      setNoticeTone('success');
    } catch {
      // handled in requestJson
    }
  }

  async function disconnectHolded() {
    const connectedCompany = connection.tenantName || company.tradeName || 'este espacio';
    const confirmed = window.confirm(
      `Vas a desconectar Holded de ${connectedCompany}.\n\nSi continuas, Isaak perdera acceso a los datos reales de la empresa, algunas respuestas quedaran limitadas y tendras que volver a conectar una API valida para reactivar el contexto.\n\nSolo continua si quieres cortar el acceso ahora.`
    );

    if (!confirmed) {
      return;
    }

    const typedConfirmation = window.prompt('Para confirmar la desconexion, escribe DESCONECTAR');

    if (typedConfirmation !== 'DESCONECTAR') {
      setError(
        'No se ha confirmado la desconexion. Escribe DESCONECTAR exactamente para continuar.'
      );
      return;
    }

    try {
      const data = await requestJson<SettingsData['connection']>(
        'connections',
        '/api/settings/connections/holded/disconnect',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            confirmDisconnect: true,
            confirmationPhrase: typedConfirmation,
          }),
        }
      );
      setConnection(data);
      setNotice(
        'Holded se ha desconectado. Isaak ya no puede acceder a los datos reales de la empresa hasta que vuelvas a conectar una API valida.'
      );
      setNoticeTone('danger');
    } catch {
      // handled in requestJson
    }
  }

  async function startPasswordReset() {
    setSavingSection('profile');
    setNotice(null);
    setError(null);
    try {
      const res = await fetch('/api/settings/profile/change-password', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      throw new Error(data?.error || 'No hemos podido preparar el cambio de contrasena.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No hemos podido preparar el cambio de contrasena.'
      );
    } finally {
      setSavingSection(null);
    }
  }

  async function openBillingAction(endpoint: string, loadingText: string) {
    setSavingSection('billing');
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || loadingText);
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      if (data?.data) {
        setBilling(data.data);
      }
      setNotice('Facturacion actualizada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : loadingText);
    } finally {
      setSavingSection(null);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f8faff] text-slate-900">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1480px] flex-col px-4 py-4 sm:px-6 lg:flex-row lg:gap-8 lg:px-8">
        <aside className="w-full shrink-0 lg:w-[280px]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.28)]">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al chat
            </Link>
            <div className="mt-6 flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                {profile.photoUrl ? (
                  <Image
                    src={profile.photoUrl}
                    alt={profile.firstName}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-700">
                    {deriveInitial(profile.firstName)}
                  </div>
                )}
              </div>
              <div>
                <div className="text-base font-semibold text-slate-950">
                  {profile.firstName || 'Isaak user'}
                </div>
                <div className="text-sm text-slate-500">
                  {connection.tenantName || company.tradeName || 'Tu espacio'}
                </div>
              </div>
            </div>
            <nav className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
              {sections.map((item) => {
                const Icon = item.icon;
                const href = item.external ?? `/settings?section=${item.key}`;
                const isActive = !item.external && item.key === activeSection;
                return (
                  <Link
                    key={item.key}
                    href={href}
                    className={`flex shrink-0 items-center justify-between rounded-2xl px-4 py-2.5 text-sm font-medium transition lg:shrink ${
                      isActive
                        ? 'bg-[#edf4ff] text-[#174db5]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {item.key === 'team' && settingsData.team.members.length > 1 ? (
                        <span className="rounded-full bg-[#2361d8]/10 px-2 py-0.5 text-[11px] font-medium text-[#2361d8]">
                          {settingsData.team.members.filter((m) => m.status === 'active').length}
                        </span>
                      ) : null}
                      {item.external ? <ExternalLink className="h-3 w-3 text-slate-400" /> : null}
                    </span>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Plan actual
              </div>
              <div className="mt-2 text-base font-semibold text-slate-950">
                {settingsData.billing.name}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Ideal para esta primera fase con Holded.
              </div>
              <Link
                href="/support?source=isaak_settings_plan"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2361d8] transition hover:text-[#174db5]"
              >
                Hablar sobre el plan
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </aside>

        <section className="mt-6 min-w-0 flex-1 lg:mt-0">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.28)] sm:p-8">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Ajustes
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Gestiona tu espacio en Isaak
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Separa lo personal, los datos de empresa y la conexion con Holded sin mezclarlo
                  con el chat.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {notice ? (
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      noticeTone === 'danger'
                        ? 'border border-rose-200 bg-rose-50 text-rose-800'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {notice}
                  </span>
                ) : null}
                {error ? (
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800">
                    {error}
                  </span>
                ) : null}
              </div>
            </div>

            {activeSection === 'profile' ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
                <section className="rounded-[1.6rem] border border-slate-200 p-5">
                  <div className="text-lg font-semibold text-slate-950">Mi perfil</div>
                  <div className="mt-5 grid gap-4">
                    <label className="grid gap-2 text-sm">
                      <span className="font-medium text-slate-700">Nombre de pila</span>
                      <input
                        value={profile.firstName}
                        onChange={(event) =>
                          setProfile((current) => ({ ...current, firstName: event.target.value }))
                        }
                        className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#2361d8]/35"
                      />
                    </label>
                    <label className="grid gap-2 text-sm">
                      <span className="font-medium text-slate-700">Email</span>
                      <input
                        value={profile.email}
                        disabled
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
                      />
                    </label>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700">Teléfono móvil</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <MessageCircle className="h-2.5 w-2.5" />
                          WhatsApp
                        </span>
                      </div>
                      <input
                        value={profile.phone ?? ''}
                        onChange={(event) =>
                          setProfile((current) => ({ ...current, phone: event.target.value }))
                        }
                        placeholder="+34 612 345 678"
                        className={`rounded-2xl border px-4 py-3 outline-none transition focus:border-[#2361d8]/35 ${
                          profile.phone && !/^\+\d{7,15}$/.test(profile.phone.replace(/\s/g, ''))
                            ? 'border-amber-300 bg-amber-50/40'
                            : 'border-slate-200'
                        }`}
                      />
                      {profile.phone && !/^\+\d{7,15}$/.test(profile.phone.replace(/\s/g, '')) ? (
                        <p className="text-[11px] text-amber-600">
                          Incluye el prefijo del país, ej. +34 para España.
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          Isaak te responderá en este número por WhatsApp. Formato: +34 612 345 678
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700">Telegram</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                          <Send className="h-2.5 w-2.5" />
                          Bot
                        </span>
                      </div>
                      {telegramDeepLink ? (
                        <div className="space-y-2">
                          <a
                            href={telegramDeepLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
                          >
                            <ExternalLink className="h-4 w-4 shrink-0" />
                            Abrir en Telegram
                          </a>
                          <p className="text-[11px] text-slate-400">
                            Enlace válido 24 h. Ábrelo desde el móvil para vincular la cuenta con
                            @IsaakFiscalBot.
                          </p>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void generateTelegramLink()}
                            disabled={telegramLinkLoading}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            {telegramLinkLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            Vincular Telegram
                          </button>
                          <p className="text-[11px] text-slate-400">
                            Genera un enlace de 24 h para conectar @IsaakFiscalBot a tu cuenta.
                          </p>
                        </>
                      )}
                    </div>
                    <label className="grid gap-2 text-sm">
                      <span className="font-medium text-slate-700">Rol actual en la empresa</span>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
                        {formatRole(profile.roleInCompany)}
                      </div>
                    </label>
                    <label className="grid gap-2 text-sm">
                      <span className="font-medium text-slate-700">Foto de perfil</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void uploadProfilePhoto(file);
                          }
                          event.currentTarget.value = '';
                        }}
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                      />
                      {uploadingAvatar ? (
                        <span className="text-xs text-slate-500">Subiendo foto...</span>
                      ) : null}
                    </label>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => void saveProfile()}
                        disabled={savingSection === 'profile'}
                        className="inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d55c2] disabled:opacity-60"
                      >
                        {savingSection === 'profile' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Guardar perfil
                      </button>
                      <button
                        type="button"
                        onClick={() => void startPasswordReset()}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cambiar contrasena
                      </button>
                    </div>
                  </div>
                </section>
                <section className="rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-5">
                  <div className="text-lg font-semibold text-slate-950">Resumen rapido</div>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <p>
                      Este bloque recoge lo personal. La empresa y las conexiones viven aparte para
                      que el chat no se convierta en un panel tecnico.
                    </p>
                    <p>
                      Puedes actualizar la foto desde aqui para que tu cuenta quede identificada en
                      todo el espacio de trabajo.
                    </p>
                  </div>
                </section>
              </div>
            ) : null}

            {activeSection === 'company' ? (
              <section className="mt-6 rounded-[1.6rem] border border-slate-200 p-5">
                <div className="text-lg font-semibold text-slate-950">Empresa</div>
                <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-sm font-semibold text-slate-900">Identidad visual</div>
                  <p className="mt-1 text-xs text-slate-500">
                    Define logo y colores corporativos para personalizar facturas y documentos.
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-[200px_1fr]">
                    <div>
                      <div className="flex h-28 w-44 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        {company.logoUrl ? (
                          <img
                            src={company.logoUrl}
                            alt="Logo empresa"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="px-4 text-center text-xs text-slate-400">
                            Sin logo cargado
                          </span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        aria-label="Subir logo de empresa"
                        title="Subir logo de empresa"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void uploadCompanyLogo(file);
                          }
                          event.currentTarget.value = '';
                        }}
                        className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs outline-none transition file:mr-2 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                      />
                      {uploadingCompanyLogo ? (
                        <span className="mt-1 block text-xs text-slate-500">Cargando logo...</span>
                      ) : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium text-slate-700">Color principal</span>
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                          <input
                            type="color"
                            value={company.primaryColor}
                            onChange={(event) =>
                              setCompany((current) => ({
                                ...current,
                                primaryColor: event.target.value,
                              }))
                            }
                            className="h-8 w-10 cursor-pointer rounded border border-slate-200"
                          />
                          <input
                            value={company.primaryColor}
                            onChange={(event) =>
                              setCompany((current) => ({
                                ...current,
                                primaryColor: event.target.value,
                              }))
                            }
                            placeholder="#2361D8"
                            aria-label="Color principal"
                            className="w-full bg-transparent text-sm outline-none"
                          />
                        </div>
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium text-slate-700">Color secundario</span>
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                          <input
                            type="color"
                            value={company.secondaryColor}
                            onChange={(event) =>
                              setCompany((current) => ({
                                ...current,
                                secondaryColor: event.target.value,
                              }))
                            }
                            className="h-8 w-10 cursor-pointer rounded border border-slate-200"
                          />
                          <input
                            value={company.secondaryColor}
                            onChange={(event) =>
                              setCompany((current) => ({
                                ...current,
                                secondaryColor: event.target.value,
                              }))
                            }
                            placeholder="#0F172A"
                            aria-label="Color secundario"
                            className="w-full bg-transparent text-sm outline-none"
                          />
                        </div>
                      </label>
                      <div className="md:col-span-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Vista previa de paleta
                          </div>
                          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                              Principal: {company.primaryColor}
                            </span>
                            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                              Secundario: {company.secondaryColor}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {[
                    ['Nombre comercial', 'tradeName'],
                    ['Razon social', 'legalName'],
                    ['Actividad principal', 'activityMain'],
                    ['Sector', 'sector'],
                    ['Direccion', 'address'],
                    ['Codigo postal', 'postalCode'],
                    ['Ciudad', 'city'],
                    ['Provincia', 'province'],
                    ['Pais', 'country'],
                    ['CIF / NIF', 'taxId'],
                    ['Representante o administrador', 'representative'],
                    ['Web', 'website'],
                    ['Telefono de empresa', 'phone'],
                  ].map(([label, key]) => (
                    <label
                      key={key}
                      className={`grid gap-2 text-sm ${key === 'address' ? 'md:col-span-2' : ''}`}
                    >
                      <span className="font-medium text-slate-700">{label}</span>
                      <input
                        value={company[key as keyof typeof company] as string}
                        onChange={(event) =>
                          setCompany((current) => ({ ...current, [key]: event.target.value }))
                        }
                        className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#2361d8]/35"
                      />
                    </label>
                  ))}
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-slate-700">Tamano del equipo</span>
                    <select
                      value={company.teamSize}
                      onChange={(event) =>
                        setCompany((current) => ({ ...current, teamSize: event.target.value }))
                      }
                      className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#2361d8]/35"
                    >
                      {TEAM_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => void saveCompany()}
                    disabled={savingSection === 'company'}
                    className="inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d55c2] disabled:opacity-60"
                  >
                    {savingSection === 'company' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Guardar empresa
                  </button>
                </div>
              </section>
            ) : null}

            {activeSection === 'connections' ? (
              <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
                <section className="rounded-[1.6rem] border border-slate-200 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-950">Conexiones</div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Mantén Holded al día y prepara espacio para nuevas integraciones más
                        adelante.
                      </p>
                    </div>
                    <div
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        connection.keyMasked
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                          : connection.status === 'disconnected'
                            ? 'border border-rose-200 bg-rose-50 text-rose-900'
                            : 'border border-amber-200 bg-amber-50 text-amber-900'
                      }`}
                    >
                      {connection.keyMasked ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <PlugZap className="h-3.5 w-3.5" />
                      )}
                      {connection.keyMasked ? 'Conectado' : 'Pendiente'}
                    </div>
                  </div>
                  <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
                    <div className="text-sm font-semibold text-slate-950">Holded</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {connection.tenantName || 'Cuenta no detectada todavia'}
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          API actual
                        </div>
                        <div className="mt-1 font-medium text-slate-900">
                          {connection.keyMasked || 'Sin API activa'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Ultima validacion
                        </div>
                        <div className="mt-1 font-medium text-slate-900">
                          {formatDate(connection.lastValidatedAt)}
                        </div>
                      </div>
                    </div>
                    {connection.validationSummary ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        {connection.validationSummary}
                      </div>
                    ) : null}
                    {connection.supportedModules.length > 0 ? (
                      <div className="mt-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Partes ya validadas
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {connection.supportedModules.map((module) => (
                            <span
                              key={module}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900"
                            >
                              {formatSupportedModule(module)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
                      <div className="font-semibold">Antes de desconectar Holded</div>
                      <div className="mt-2">
                        Si desconectas Holded, Isaak perdera acceso a ventas, gastos, facturas,
                        cobros y resto de datos reales de tu empresa. El chat seguira disponible,
                        pero con menos contexto y menos capacidad de ayudarte.
                      </div>
                      <div className="mt-2">
                        Tambien enviaremos un aviso por correo al usuario y al admin para dejar
                        constancia de la desconexion.
                      </div>
                      <div className="mt-2 font-medium">
                        Para ejecutarlo pediremos escribir{' '}
                        <span className="font-semibold">DESCONECTAR</span>.
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                      <input
                        value={apiKeyDraft}
                        onChange={(event) => setApiKeyDraft(event.target.value)}
                        placeholder="Sustituir API de Holded"
                        className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#2361d8]/35"
                      />
                      <button
                        type="button"
                        onClick={() => void replaceHoldedApi()}
                        disabled={savingSection === 'connections'}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d55c2] disabled:opacity-60"
                      >
                        {savingSection === 'connections' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCcw className="h-4 w-4" />
                        )}
                        Sustituir API
                      </button>
                      <button
                        type="button"
                        onClick={() => void disconnectHolded()}
                        disabled={savingSection === 'connections' || !connection.keyMasked}
                        className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        Desconectar
                      </button>
                    </div>
                  </div>
                </section>
                <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
                  <div className="text-lg font-semibold text-slate-950">Google Calendar</div>
                  <p className="mt-1 text-sm text-slate-500">
                    Sincroniza los plazos fiscales del año directamente en tu calendario.
                  </p>
                  <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
                          <Calendar className="h-4 w-4 text-red-500" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            Google Calendar
                          </div>
                          {googleLoading ? (
                            <div className="text-xs text-slate-400">Cargando...</div>
                          ) : googleStatus?.connected ? (
                            <div className="text-xs text-slate-500">{googleStatus.email}</div>
                          ) : (
                            <div className="text-xs text-slate-400">No conectado</div>
                          )}
                        </div>
                      </div>
                      {!googleLoading && (
                        <div className="flex items-center gap-2">
                          {googleStatus?.connected ? (
                            <>
                              <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                <CheckCircle2 className="h-3 w-3" />
                                Conectado
                              </span>
                              <button
                                type="button"
                                onClick={() => void disconnectGoogle()}
                                disabled={googleDisconnecting}
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
                              >
                                {googleDisconnecting ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Unplug className="h-3 w-3" />
                                )}
                                Desconectar
                              </button>
                            </>
                          ) : googleStatus?.googleConfigured ? (
                            <a
                              href="/api/isaak/google/auth"
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#2361d8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1d55c2]"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Conectar
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">Próximamente</span>
                          )}
                        </div>
                      )}
                    </div>
                    {googleStatus?.connected && (
                      <p className="mt-3 text-xs text-slate-500">
                        Ve a{' '}
                        <a href="/calendario" className="text-[#2361d8] underline">
                          Calendario Fiscal
                        </a>{' '}
                        para sincronizar los plazos tributarios del año.
                      </p>
                    )}
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-400">
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-2.5">
                      Google Drive · Próximamente
                    </div>
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-2.5">
                      Gmail · Próximamente
                    </div>
                  </div>
                </section>
              </div>
            ) : null}

            {activeSection === 'isaak' ? (
              <section className="mt-6 rounded-[1.6rem] border border-slate-200 p-5">
                <div className="text-lg font-semibold text-slate-950">Personalizacion de Isaak</div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-slate-700">Como quieres que te llame</span>
                    <input
                      value={isaak.preferredName}
                      onChange={(event) =>
                        setIsaak((current) => ({ ...current, preferredName: event.target.value }))
                      }
                      className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#2361d8]/35"
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-slate-700">Tono de respuesta</span>
                    <select
                      value={isaak.communicationStyle}
                      onChange={(event) =>
                        setIsaak((current) => ({
                          ...current,
                          communicationStyle: event.target.value,
                        }))
                      }
                      className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#2361d8]/35"
                    >
                      <option value="spanish_clear_non_technical">Claro y cercano</option>
                      <option value="spanish_direct_supportive">Directo y resolutivo</option>
                      <option value="spanish_executive_clear">Ejecutivo y breve</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-slate-700">Nivel de detalle</span>
                    <select
                      value={isaak.likelyKnowledgeLevel}
                      onChange={(event) =>
                        setIsaak((current) => ({
                          ...current,
                          likelyKnowledgeLevel: event.target.value,
                        }))
                      }
                      className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#2361d8]/35"
                    >
                      <option value="starter">Breve y guiado</option>
                      <option value="intermediate">Con algo mas de detalle</option>
                    </select>
                  </label>
                </div>
                <div className="mt-5">
                  <div className="text-sm font-medium text-slate-700">Objetivos principales</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {GOAL_OPTIONS.map((goal) => {
                      const selected = isaak.mainGoals.includes(goal);
                      return (
                        <button
                          key={goal}
                          type="button"
                          onClick={() =>
                            setIsaak((current) => ({
                              ...current,
                              mainGoals: selected
                                ? current.mainGoals.filter((item) => item !== goal)
                                : [...current.mainGoals, goal].slice(0, 3),
                            }))
                          }
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                            selected
                              ? 'border-[#2361d8]/20 bg-[#edf4ff] text-[#174db5]'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {goal}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {isaak.mainGoals.length}/3 seleccionadas
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void saveIsaak()}
                    disabled={savingSection === 'isaak'}
                    className="inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d55c2] disabled:opacity-60"
                  >
                    {savingSection === 'isaak' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Guardar ajustes de Isaak
                  </button>
                  <Link
                    href={isaak.resetUrl}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Rehacer personalizacion inicial
                  </Link>
                </div>
              </section>
            ) : null}

            {activeSection === 'team' ? (
              <section className="mt-6 space-y-4">
                {/* Workspaces switcher (if user has more than 1) */}
                {settingsData.team.workspaces.length > 1 && (
                  <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
                    <div className="text-sm font-semibold text-slate-950">Tus espacios</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      Cambia entre los workspaces a los que perteneces.
                    </div>
                    <ul className="mt-3 divide-y divide-slate-100">
                      {settingsData.team.workspaces.map((ws) => {
                        const isSwitching = switchingTenantId === ws.tenantId;
                        return (
                          <li key={ws.tenantId} className="flex items-center gap-3 py-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#2361d8]/10 text-sm font-semibold text-[#2361d8]">
                              {ws.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-slate-900">
                                {ws.name}
                              </div>
                              <div className="truncate text-xs text-slate-400">
                                {ws.taxId ?? `${ws.role}`}
                              </div>
                            </div>
                            {ws.isCurrent ? (
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                Activo
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isSwitching || switchingTenantId !== null}
                                onClick={() => void switchWorkspace(ws.tenantId)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-[#2361d8] hover:text-[#2361d8] disabled:opacity-50"
                              >
                                {isSwitching ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCcw className="h-3 w-3" />
                                )}
                                Cambiar
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Header */}
                <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold text-slate-950">Equipo</div>
                      <div className="mt-0.5 text-sm text-slate-500">
                        {teamMembers.filter((m) => m.status === 'active').length} de{' '}
                        {settingsData.team.maxSeats === -1
                          ? 'ilimitados'
                          : settingsData.team.maxSeats}{' '}
                        usuarios activos
                      </div>
                    </div>
                    {settingsData.team.maxSeats !== -1 && (
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[#2361d8] transition-all"
                          style={{
                            width: `${Math.min(100, (teamMembers.filter((m) => m.status === 'active').length / settingsData.team.maxSeats) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Invite form (admins only) */}
                {settingsData.team.canManage && (
                  <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
                    <div className="text-sm font-semibold text-slate-950">Invitar miembro</div>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          placeholder="email@empresa.com"
                          value={inviteEmail}
                          onChange={(e) => {
                            setInviteEmail(e.target.value);
                            setInviteError(null);
                            setInviteSuccess(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void sendTeamInvite();
                          }}
                          className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-[#2361d8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2361d8]"
                        />
                      </div>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                        className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 focus:border-[#2361d8] focus:outline-none"
                      >
                        <option value="member">Miembro</option>
                        <option value="admin">Administrador</option>
                      </select>
                      <button
                        type="button"
                        disabled={inviteSending || !inviteEmail.trim()}
                        onClick={() => void sendTeamInvite()}
                        className="inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1d55c2] disabled:opacity-60"
                      >
                        {inviteSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                        Invitar
                      </button>
                    </div>
                    {inviteSuccess && (
                      <div className="mt-2 flex items-center gap-1.5 text-sm text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        {inviteSuccess}
                      </div>
                    )}
                    {inviteError && <div className="mt-2 text-sm text-rose-600">{inviteError}</div>}
                  </div>
                )}

                {/* Member list */}
                <div className="rounded-[1.6rem] border border-slate-200 bg-white">
                  {teamMembers.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-slate-500">
                      Aún no hay miembros en este espacio.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {teamMembers.map((member, idx) => {
                        const initials = (
                          member.name?.charAt(0) ||
                          member.email?.charAt(0) ||
                          '?'
                        ).toUpperCase();
                        const isRemoving = removingMemberId === member.id;
                        const isPending = member.status === 'invited';
                        return (
                          <li
                            key={member.id}
                            className={`flex items-center gap-3 px-5 py-3.5 ${idx === 0 ? 'rounded-t-[1.6rem]' : ''} ${idx === teamMembers.length - 1 ? 'rounded-b-[1.6rem]' : ''}`}
                          >
                            {/* Avatar */}
                            {member.image ? (
                              <Image
                                src={member.image}
                                alt={member.name ?? ''}
                                width={36}
                                height={36}
                                className="h-9 w-9 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#2361d8]/10 text-sm font-semibold text-[#2361d8]">
                                {initials}
                              </div>
                            )}
                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="truncate text-sm font-semibold text-slate-900">
                                  {member.name ?? member.email ?? 'Desconocido'}
                                </span>
                                {member.isCurrentUser && (
                                  <span className="rounded-full bg-[#2361d8]/10 px-2 py-0.5 text-[11px] font-medium text-[#2361d8]">
                                    Tú
                                  </span>
                                )}
                                {isPending && (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                    Pendiente
                                  </span>
                                )}
                              </div>
                              {member.name && member.email ? (
                                <div className="truncate text-xs text-slate-400">
                                  {member.email}
                                </div>
                              ) : null}
                            </div>
                            {/* Role badge */}
                            <div className="flex shrink-0 items-center gap-1.5">
                              {member.role === 'owner' && (
                                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                                  <Crown className="h-3 w-3" />
                                  Propietario
                                </span>
                              )}
                              {(member.role === 'admin' || member.role === 'company_admin') && (
                                <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                                  <Shield className="h-3 w-3" />
                                  Admin
                                </span>
                              )}
                              {member.role === 'member' && (
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                                  Miembro
                                </span>
                              )}
                            </div>
                            {/* Remove action */}
                            {settingsData.team.canManage &&
                              !member.isCurrentUser &&
                              member.role !== 'owner' && (
                                <button
                                  type="button"
                                  disabled={isRemoving}
                                  onClick={() => void removeMember(member.id)}
                                  title="Eliminar del espacio"
                                  className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                                >
                                  {isRemoving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <UserMinus className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Upgrade CTA if at limit */}
                {settingsData.team.maxSeats !== -1 &&
                  teamMembers.filter((m) => m.status !== 'disabled').length >=
                    settingsData.team.maxSeats && (
                    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4">
                      <div className="text-sm font-semibold text-amber-900">
                        Límite de usuarios alcanzado
                      </div>
                      <div className="mt-1 text-sm text-amber-700">
                        Tu plan {settingsData.team.planCode} permite {settingsData.team.maxSeats}{' '}
                        usuarios. Actualiza para añadir más.
                      </div>
                      <a
                        href="/support?source=team_seats_limit"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                      >
                        <Users className="h-4 w-4" />
                        Ampliar equipo
                      </a>
                    </div>
                  )}

                {/* Unused icon imports (to avoid TS unused var errors) */}
                <span className="hidden">
                  <Trash2 className="h-0 w-0" />
                  <X className="h-0 w-0" />
                </span>
              </section>
            ) : null}

            {activeSection === 'billing' ? (
              <section className="mt-6 space-y-5">
                {/* Trial countdown banner */}
                {billing.status === 'trial' ? (
                  <div
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border px-5 py-4 ${
                      (billing.daysUntilTrialEnd ?? 30) <= 3
                        ? 'border-rose-200 bg-rose-50'
                        : (billing.daysUntilTrialEnd ?? 30) <= 7
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div>
                      <div
                        className={`text-sm font-semibold ${
                          (billing.daysUntilTrialEnd ?? 30) <= 3
                            ? 'text-rose-900'
                            : (billing.daysUntilTrialEnd ?? 30) <= 7
                              ? 'text-amber-900'
                              : 'text-blue-900'
                        }`}
                      >
                        {billing.daysUntilTrialEnd === 0
                          ? 'Tu prueba gratuita termina hoy'
                          : billing.daysUntilTrialEnd === 1
                            ? 'Tu prueba gratuita termina mañana'
                            : `Tu prueba gratuita termina en ${billing.daysUntilTrialEnd ?? '—'} días`}
                      </div>
                      <div
                        className={`mt-0.5 text-xs ${
                          (billing.daysUntilTrialEnd ?? 30) <= 3
                            ? 'text-rose-700'
                            : (billing.daysUntilTrialEnd ?? 30) <= 7
                              ? 'text-amber-700'
                              : 'text-blue-700'
                        }`}
                      >
                        Elige un plan para no perder el acceso a tus datos y conversaciones.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void openBillingAction(
                          '/api/settings/billing/checkout',
                          'No hemos podido abrir Stripe Checkout.'
                        )
                      }
                      disabled={savingSection === 'billing'}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#2361d8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d55c2] disabled:opacity-60"
                    >
                      {savingSection === 'billing' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Activar plan ahora
                    </button>
                  </div>
                ) : null}

                {/* Plan cards */}
                <div className="rounded-[1.6rem] border border-slate-200 p-5">
                  <div className="text-lg font-semibold text-slate-950">Planes disponibles</div>
                  <p className="mt-1 text-sm text-slate-500">
                    30 días de prueba gratuita en todos los planes. Sin tarjeta para empezar.
                  </p>
                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    {PLAN_TIERS.map((plan) => {
                      const isCurrent = billing.code === plan.code;
                      return (
                        <div
                          key={plan.code}
                          className={`relative rounded-[1.4rem] border p-5 ${
                            plan.highlight
                              ? 'border-[#2361d8]/30 bg-[#edf4ff]'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          {plan.highlight ? (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2361d8] px-3 py-0.5 text-[11px] font-semibold text-white">
                              Más popular
                            </div>
                          ) : null}
                          <div className="text-base font-bold text-slate-950">{plan.name}</div>
                          <div className="mt-0.5 text-[11px] text-slate-500">{plan.tagline}</div>
                          <div className="mt-3 flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-slate-950">{plan.price}€</span>
                            <span className="text-sm text-slate-500">/mes</span>
                          </div>
                          <ul className="mt-4 space-y-2">
                            {plan.features.map((feat) => (
                              <li
                                key={feat}
                                className="flex items-start gap-2 text-[13px] text-slate-700"
                              >
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                {feat}
                              </li>
                            ))}
                          </ul>
                          <div className="mt-5">
                            {isCurrent ? (
                              <div className="flex h-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">
                                Plan actual
                              </div>
                            ) : plan.cta === 'checkout' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void openBillingAction(
                                    '/api/settings/billing/checkout',
                                    'No hemos podido abrir Stripe Checkout.'
                                  )
                                }
                                disabled={savingSection === 'billing'}
                                className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#2361d8] text-sm font-semibold text-white transition hover:bg-[#1d55c2] disabled:opacity-60"
                              >
                                {savingSection === 'billing' ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : null}
                                Empezar prueba gratuita
                              </button>
                            ) : (
                              <Link
                                href="/support?source=isaak_billing_upgrade"
                                className="flex h-10 w-full items-center justify-center rounded-full border border-[#2361d8] text-sm font-semibold text-[#2361d8] transition hover:bg-[#edf4ff]"
                              >
                                Hablar con ventas
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Current subscription details */}
                <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
                  <div className="rounded-[1.6rem] border border-slate-200 p-5">
                    <div className="text-base font-semibold text-slate-950">Suscripción actual</div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Plan
                        </div>
                        <div className="mt-1.5 text-sm font-semibold text-slate-900">
                          {billing.name}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Estado
                        </div>
                        <div className="mt-1.5 text-sm font-semibold text-slate-900">
                          {billing.status === 'trial'
                            ? `Prueba gratuita (${billing.daysUntilTrialEnd ?? '—'} días)`
                            : billing.stripeStatus || billing.status}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Próxima renovación
                        </div>
                        <div className="mt-1.5 text-sm font-medium text-slate-900">
                          {formatDate(billing.nextRenewalAt)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Método de pago
                        </div>
                        <div className="mt-1.5 text-sm font-medium text-slate-900">
                          {billing.paymentMethodSummary || 'Se mostrará cuando Stripe lo confirme'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      {billing.portalAvailable ? (
                        <button
                          type="button"
                          onClick={() =>
                            void openBillingAction(
                              '/api/settings/billing/portal',
                              'No hemos podido abrir el portal de facturación.'
                            )
                          }
                          disabled={savingSection === 'billing'}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          {savingSection === 'billing' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : null}
                          Portal de facturación
                        </button>
                      ) : null}
                      {billing.cancelAvailable ? (
                        <button
                          type="button"
                          onClick={() =>
                            void openBillingAction(
                              '/api/settings/billing/cancel',
                              'No hemos podido preparar la cancelación.'
                            )
                          }
                          disabled={savingSection === 'billing'}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                        >
                          Cancelar al final del periodo
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Invoice history */}
                  <div className="rounded-[1.6rem] border border-slate-200 p-5">
                    <div className="text-base font-semibold text-slate-950">Facturas</div>
                    <div className="mt-3 space-y-2.5">
                      {billing.invoices.length ? (
                        billing.invoices.slice(0, 5).map((invoice) => (
                          <div
                            key={invoice.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                          >
                            <div>
                              <div className="text-sm font-semibold text-slate-950">
                                {invoice.number || 'Factura Stripe'}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-500">
                                {formatDate(invoice.createdAt)} · {invoice.status || 'pending'}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-semibold text-slate-900">
                                {formatMoney(
                                  invoice.amountPaid ?? invoice.amountDue,
                                  invoice.currency
                                )}
                              </div>
                              {invoice.hostedInvoiceUrl ? (
                                <a
                                  href={invoice.hostedInvoiceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-semibold text-[#2361d8] transition hover:text-[#174db5]"
                                >
                                  Ver
                                </a>
                              ) : null}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                          Sin facturas todavía. Aparecerán aquí cuando actives un plan de pago.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {activeSection === 'notificaciones' ? (
              <section className="mt-6 space-y-5">
                {/* Fiscal alerts */}
                <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                      <Bell className="h-4 w-4 text-[#2361d8]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Alertas de plazos fiscales
                      </div>
                      <div className="text-xs text-slate-500">
                        D-15, D-7, D-3 y D-1 antes de cada plazo
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <p>
                      Isaak te envía un email automático con antelación suficiente antes de cada
                      obligación fiscal trimestral (IVA, IRPF, IS y retenciones) para que puedas
                      prepararte a tiempo.
                    </p>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                      Las alertas se envían al email principal de tu cuenta. Para cambiar el email,
                      ve a{' '}
                      <button
                        type="button"
                        className="text-[#2361d8] underline"
                        onClick={() => {
                          const url = new URL(window.location.href);
                          url.searchParams.set('section', 'profile');
                          window.history.pushState({}, '', url.toString());
                          window.location.reload();
                        }}
                      >
                        Perfil
                      </button>
                      .
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Activadas
                    </span>
                    <span className="text-xs text-slate-400">
                      Se envían automáticamente a todos los tenants activos
                    </span>
                  </div>
                </div>

                {/* Trial expiry reminders */}
                <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50">
                      <Calendar className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Recordatorios de prueba gratuita
                      </div>
                      <div className="text-xs text-slate-500">D-7, D-3 y D-0</div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-slate-700">
                    <p>
                      Cuando tu prueba gratuita está próxima a vencer, Isaak te avisa por email para
                      que puedas activar un plan sin interrupciones.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Activadas
                    </span>
                  </div>
                </div>

                {/* Push notifications */}
                <PushNotificationsCard />

                {/* PWA install */}
                <PwaInstallCard />
              </section>
            ) : null}

            <div className="mt-8 border-t border-slate-200 pt-5">
              <Link
                href="/support"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <LifeBuoy className="h-4 w-4" />
                Ayuda
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
