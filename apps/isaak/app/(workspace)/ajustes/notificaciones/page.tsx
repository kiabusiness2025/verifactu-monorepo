// V1.1 — Panel unificado de notificaciones (4 canales).
//
// Una pantalla con 4 tarjetas: Email · Push web · WhatsApp · Telegram.
// Cada tarjeta muestra estado de conexión + acciones para vincular o
// configurar. Re-utiliza los endpoints existentes:
//   - GET  /api/isaak/notifications/status       → estado consolidado
//   - POST /api/isaak/push/subscribe             → suscribir SW push
//   - POST /api/isaak/push/unsubscribe           → desuscribir
//   - GET  /api/isaak/push/preferences           → 3 sub-toggles push
//   - PATCH /api/isaak/push/preferences          → guardar toggle
//   - POST /api/isaak/telegram/link              → generar deep-link 24h
//
// El layout (workspace) ya valida sesión y aplica `force-dynamic`.

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '15559835009';
const WHATSAPP_DEEP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  'Hola Isaak, quiero vincular mi cuenta de WhatsApp.',
)}`;

type PushPrefs = {
  alertaFiscal: boolean;
  documentoSinConciliar: boolean;
  avisoProactivoIsaak: boolean;
};

type NotificationsStatus = {
  email: { address: string | null; enabled: boolean };
  push: { subscribed: boolean; preferences: PushPrefs };
  whatsapp: {
    linked: boolean;
    phone: string | null;
    lastActivityAt: string | null;
    consentAt: string | null;
  };
  telegram: {
    linked: boolean;
    chatId: number | null;
    username: string | null;
    firstName: string | null;
    lastActivityAt: string | null;
  };
};

const PUSH_PREF_LABELS: {
  key: keyof PushPrefs;
  label: string;
  description: string;
}[] = [
  {
    key: 'alertaFiscal',
    label: 'Alertas AEAT',
    description: 'D-15, D-7, D-3 y D-1 antes de cada vencimiento (303, 130, 111…).',
  },
  {
    key: 'documentoSinConciliar',
    label: 'Documentos sin conciliar',
    description: 'Facturas o movimientos pendientes que necesitan tu atención.',
  },
  {
    key: 'avisoProactivoIsaak',
    label: 'Avisos proactivos de Isaak',
    description: 'Cuando Isaak detecta algo relevante (margen, retraso de cobro, anomalía).',
  },
];

function formatDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export default function NotificationsPage() {
  const [status, setStatus] = useState<NotificationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushSupported, setPushSupported] = useState<boolean | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unknown'>(
    'unknown',
  );
  const [savingPref, setSavingPref] = useState<keyof PushPrefs | null>(null);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgDeepLink, setTgDeepLink] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/isaak/notifications/status', {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = (await res.json()) as NotificationsStatus;
      setStatus(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setPushSupported(supported);
    if (supported && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function handlePushSubscribe() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey || !('serviceWorker' in navigator)) return;
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });
      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      await fetch('/api/isaak/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      setPushPermission('granted');
      await loadStatus();
    } catch {
      setPushPermission('denied');
    } finally {
      setPushBusy(false);
    }
  }

  async function handlePushUnsubscribe() {
    setPushBusy(true);
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
      await loadStatus();
    } finally {
      setPushBusy(false);
    }
  }

  async function togglePref(key: keyof PushPrefs, value: boolean) {
    if (!status) return;
    setSavingPref(key);
    const optimistic = { ...status.push.preferences, [key]: value };
    setStatus({ ...status, push: { ...status.push, preferences: optimistic } });
    try {
      await fetch('/api/isaak/push/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } finally {
      setSavingPref(null);
    }
  }

  async function handleGenerateTelegramLink() {
    setTgLoading(true);
    try {
      const res = await fetch('/api/isaak/telegram/link', { method: 'POST' });
      if (!res.ok) return;
      const data = (await res.json()) as { deepLink: string };
      setTgDeepLink(data.deepLink);
      // abre en nueva pestaña automáticamente
      window.open(data.deepLink, '_blank', 'noopener,noreferrer');
    } finally {
      setTgLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#2361d8]" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-slate-500">
          No se pudo cargar el estado de notificaciones.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2361d8] text-white">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Notificaciones</h1>
          <p className="text-sm text-slate-500">
            Elige cómo quieres que Isaak te avise: email, push, WhatsApp o Telegram.
          </p>
        </div>
      </div>

      {/* Email */}
      <Card
        icon={<Mail className="h-5 w-5 text-slate-700" />}
        title="Email"
        subtitle={status.email.address ?? 'Email no disponible'}
        connected={status.email.enabled}
        connectedLabel="Activado"
      >
        <p className="text-xs leading-5 text-slate-500">
          Recibirás los emails operativos (alertas AEAT, recordatorios, facturas Stripe)
          en la dirección con la que iniciaste sesión. Para cambiarla, edita tu perfil.
        </p>
      </Card>

      {/* Push web / móvil */}
      <Card
        icon={<Smartphone className="h-5 w-5 text-slate-700" />}
        title="Notificaciones push (web y móvil)"
        subtitle={
          status.push.subscribed
            ? 'Recibirás avisos aunque tengas Isaak cerrado'
            : 'Activa los avisos en este dispositivo'
        }
        connected={status.push.subscribed}
        connectedLabel="Activadas"
      >
        {pushSupported === false ? (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Tu navegador no soporta notificaciones push. Prueba con Chrome, Edge o
            Safari (16.4+).
          </div>
        ) : pushPermission === 'denied' && !status.push.subscribed ? (
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
            Has bloqueado las notificaciones en este navegador. Cámbialo en los
            ajustes del sitio y vuelve a probar.
          </div>
        ) : !status.push.subscribed ? (
          <button
            onClick={handlePushSubscribe}
            disabled={pushBusy}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2361d8] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1f55c0] disabled:opacity-50"
          >
            {pushBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bell className="h-3.5 w-3.5" />
            )}
            Activar notificaciones
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">¿Qué quieres recibir?</p>
            <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              {PUSH_PREF_LABELS.map(({ key, label, description }) => {
                const checked = status.push.preferences[key];
                const saving = savingPref === key;
                return (
                  <label
                    key={key}
                    className="flex cursor-pointer items-start gap-3 rounded-lg p-2 transition hover:bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={saving}
                      onChange={(e) => void togglePref(key, e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#2361d8] focus:ring-[#2361d8]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-800">
                        {label}
                        {saving && (
                          <Loader2 className="ml-1.5 inline h-3 w-3 animate-spin text-slate-400" />
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] leading-4 text-slate-500">
                        {description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <button
              onClick={handlePushUnsubscribe}
              disabled={pushBusy}
              className="text-[11px] font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
            >
              {pushBusy ? 'Procesando…' : 'Desactivar en este dispositivo'}
            </button>
          </div>
        )}
      </Card>

      {/* WhatsApp */}
      <Card
        icon={<MessageCircle className="h-5 w-5 text-[#25D366]" />}
        title="WhatsApp"
        subtitle={
          status.whatsapp.linked
            ? `Vinculado · ${status.whatsapp.phone ?? 'número oculto'}`
            : 'Habla con Isaak desde WhatsApp 24/7'
        }
        connected={status.whatsapp.linked}
        connectedLabel="Vinculado"
      >
        {status.whatsapp.linked ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-800">
              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
              Tu cuenta está vinculada. Última actividad:{' '}
              {formatDate(status.whatsapp.lastActivityAt) ?? 'sin actividad reciente'}.
            </div>
            <a
              href={WHATSAPP_DEEP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-800"
            >
              Abrir conversación
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs leading-5 text-slate-500">
              Pulsa el botón para abrir WhatsApp y enviar un mensaje. Tu número quedará
              vinculado automáticamente cuando contestemos.
            </p>
            <a
              href={WHATSAPP_DEEP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1da851]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Abrir WhatsApp
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </Card>

      {/* Telegram */}
      <Card
        icon={<Send className="h-5 w-5 text-[#229ED9]" />}
        title="Telegram"
        subtitle={
          status.telegram.linked
            ? `Vinculado · ${status.telegram.username ? '@' + status.telegram.username : status.telegram.firstName ?? 'chat anónimo'}`
            : 'Bot @IsaakFiscalBot · /start para empezar'
        }
        connected={status.telegram.linked}
        connectedLabel="Vinculado"
      >
        {status.telegram.linked ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-800">
            <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
            Bot vinculado. Última actividad:{' '}
            {formatDate(status.telegram.lastActivityAt) ?? 'sin actividad reciente'}.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs leading-5 text-slate-500">
              Generamos un enlace único de 24h. Al pulsarlo, Telegram abrirá el chat con
              Isaak y tu cuenta quedará vinculada al instante.
            </p>
            <button
              onClick={handleGenerateTelegramLink}
              disabled={tgLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#229ED9] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1d8ec3] disabled:opacity-50"
            >
              {tgLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Vincular Telegram
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            {tgDeepLink && (
              <p className="text-[11px] text-slate-500">
                Si Telegram no se abre,{' '}
                <a
                  href={tgDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#229ED9] hover:underline"
                >
                  haz click aquí
                </a>
                .
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Footer privacidad */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">
        <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-slate-400" />
        Solo te enviamos lo que has activado. Puedes pausar cada canal cuando quieras
        desde esta misma pantalla.
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  subtitle,
  connected,
  connectedLabel,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  connected: boolean;
  connectedLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                connected
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {connected ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {connected ? connectedLabel : 'No activo'}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
