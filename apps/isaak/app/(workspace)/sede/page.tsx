'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Building,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

type CertMeta = {
  id: string;
  nif: string;
  commonName: string;
  certType: string;
  validTo: string;
};

type Notification = {
  id: string;
  title: string;
  emisor: string;
  fecha: string;
  estado: 'pendiente' | 'leida' | 'expirada';
  tipo: string;
};

type CensusData = {
  nif: string;
  nombre: string;
  domicilioFiscal?: string;
  municipio?: string;
  provincia?: string;
  epigrafesIAE?: string[];
  situacionCensal?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function estadoBadge(estado: Notification['estado']) {
  if (estado === 'pendiente')
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        Pendiente
      </span>
    );
  if (estado === 'expirada')
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
        Expirada
      </span>
    );
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
      Leída
    </span>
  );
}

// ── No-cert CTA ──────────────────────────────────────────────────────────────

function NoCertCard() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
      <p className="mb-1 text-[15px] font-semibold text-slate-700">
        Certificado digital no configurado
      </p>
      <p className="mb-4 text-[13px] text-slate-400">
        Sube tu certificado digital FNMT (P12/PFX) para acceder a la Sede Electrónica de la AEAT.
      </p>
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700"
      >
        <ShieldCheck size={14} />
        Configurar certificado
      </Link>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SedeElectronicaPage() {
  const [cert, setCert] = useState<CertMeta | null | undefined>(undefined);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [census, setCensus] = useState<CensusData | null>(null);
  const [censusError, setCensusError] = useState<string | null>(null);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [loadingCensus, setLoadingCensus] = useState(false);

  const loadCert = useCallback(async () => {
    const res = await fetch('/api/isaak/certificates').catch(() => null);
    if (!res?.ok) {
      setCert(null);
      return;
    }
    const data = (await res.json()) as { certs: CertMeta[] };
    setCert(data.certs?.[0] ?? null);
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoadingNotif(true);
    setNotifError(null);
    try {
      const res = await fetch('/api/isaak/sede/notifications');
      const data = (await res.json()) as { notifications?: Notification[]; error?: string };
      if (data.error === 'no_cert') {
        setNotifications([]);
        return;
      }
      if (!res.ok || data.error) {
        setNotifError(data.error ?? 'Error al conectar con la AEAT');
        setNotifications([]);
        return;
      }
      setNotifications(data.notifications ?? []);
    } finally {
      setLoadingNotif(false);
    }
  }, []);

  const loadCensus = useCallback(async () => {
    setLoadingCensus(true);
    setCensusError(null);
    try {
      const res = await fetch('/api/isaak/sede/census');
      const data = (await res.json()) as { data?: CensusData; error?: string };
      if (data.error === 'no_cert') return;
      if (!res.ok || data.error) {
        setCensusError(data.error ?? 'Error al consultar datos censales');
        return;
      }
      setCensus(data.data ?? null);
    } finally {
      setLoadingCensus(false);
    }
  }, []);

  useEffect(() => {
    void loadCert();
  }, [loadCert]);

  useEffect(() => {
    if (cert) {
      void loadNotifications();
      void loadCensus();
    }
  }, [cert, loadNotifications, loadCensus]);

  const certDays = cert ? daysUntil(cert.validTo) : null;
  const pendingCount = notifications?.filter((n) => n.estado === 'pendiente').length ?? 0;

  // ── Loading state ───────────────────────────────────────────────────────────
  if (cert === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">Sede Electrónica AEAT</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Consulta notificaciones y datos censales directamente desde la AEAT.
          </p>
        </div>
        <a
          href="https://sede.agenciatributaria.gob.es"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
        >
          <ExternalLink size={13} />
          Abrir Sede AEAT
        </a>
      </div>

      {/* No cert */}
      {!cert && <NoCertCard />}

      {cert && (
        <div className="space-y-5">
          {/* Cert card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-slate-900">{cert.commonName}</p>
                  <p className="text-[12px] text-slate-500">NIF: {cert.nif}</p>
                  <p className="mt-1 text-[12px] text-slate-400">
                    {cert.certType === 'entidad' ? 'Persona jurídica (entidad)' : 'Persona física'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {certDays !== null && certDays < 30 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    <AlertTriangle size={10} />
                    Caduca en {certDays}d
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                    <ShieldCheck size={10} />
                    Válido
                  </span>
                )}
                <p className="mt-1 text-[11px] text-slate-400">
                  Válido hasta {cert ? fmtDate(cert.validTo) : ''}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Link href="/settings" className="text-[11px] text-blue-600 hover:underline">
                Gestionar certificados →
              </Link>
            </div>
          </div>

          {/* AEAT quick links */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: 'Mis notificaciones',
                url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC02.shtml',
                icon: Bell,
                color: 'bg-amber-50 text-amber-600',
              },
              {
                label: 'Datos censales',
                url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G322.shtml',
                icon: Building,
                color: 'bg-blue-50 text-blue-600',
              },
              {
                label: 'Expedientes',
                url: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G320.shtml',
                icon: ShieldCheck,
                color: 'bg-purple-50 text-purple-600',
              },
            ].map(({ label, url, icon: Icon, color }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm hover:bg-slate-50"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                  <Icon size={18} />
                </span>
                <span className="text-[11px] font-medium text-slate-700 leading-tight">
                  {label}
                </span>
                <ExternalLink size={10} className="text-slate-300" />
              </a>
            ))}
          </div>

          {/* Notifications */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-slate-500" />
                <span className="text-[13px] font-semibold text-slate-800">
                  Notificaciones AEAT
                </span>
                {pendingCount > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => void loadNotifications()}
                disabled={loadingNotif}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 disabled:opacity-50"
              >
                <RefreshCw size={12} className={loadingNotif ? 'animate-spin' : ''} />
                Actualizar
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {loadingNotif && notifications === null && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              )}
              {notifError && (
                <div className="flex items-start gap-2 px-5 py-4 text-[12px] text-slate-500">
                  <XCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
                  <span>
                    No se han podido cargar las notificaciones. Asegúrate de que tu certificado está
                    activo y tiene acceso a la Sede Electrónica.
                    <br />
                    <span className="font-mono text-[10px] text-slate-400">{notifError}</span>
                  </span>
                </div>
              )}
              {!loadingNotif && !notifError && notifications?.length === 0 && (
                <div className="px-5 py-6 text-center text-[13px] text-slate-400">
                  No hay notificaciones pendientes.
                </div>
              )}
              {notifications?.map((n) => (
                <div key={n.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-medium text-slate-800">{n.title}</p>
                      {estadoBadge(n.estado)}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {n.emisor} · {n.fecha ? fmtDate(n.fecha) : ''} · {n.tipo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Census data */}
          {(census || censusError || loadingCensus) && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                <Building size={15} className="text-slate-500" />
                <span className="text-[13px] font-semibold text-slate-800">Datos Censales</span>
              </div>
              <div className="px-5 py-4">
                {loadingCensus && !census && (
                  <div className="flex items-center gap-2 text-[12px] text-slate-400">
                    <Loader2 size={13} className="animate-spin" /> Consultando...
                  </div>
                )}
                {censusError && (
                  <p className="text-[12px] text-slate-400">
                    No se pudieron obtener los datos censales.{' '}
                    <a
                      href="https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G322.shtml"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Consultar en Sede AEAT →
                    </a>
                  </p>
                )}
                {census && (
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12px]">
                    {[
                      { label: 'Nombre/Razón social', value: census.nombre },
                      { label: 'NIF', value: census.nif },
                      { label: 'Domicilio fiscal', value: census.domicilioFiscal },
                      { label: 'Municipio', value: census.municipio },
                      { label: 'Provincia', value: census.provincia },
                      { label: 'Situación censal', value: census.situacionCensal },
                    ]
                      .filter((r) => r.value)
                      .map(({ label, value }) => (
                        <div key={label}>
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            {label}
                          </dt>
                          <dd className="mt-0.5 font-medium text-slate-800">{value}</dd>
                        </div>
                      ))}
                    {(census.epigrafesIAE?.length ?? 0) > 0 && (
                      <div className="col-span-2">
                        <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Epígrafes IAE
                        </dt>
                        <dd className="mt-0.5 font-medium text-slate-800">
                          {census.epigrafesIAE!.join(', ')}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            </div>
          )}

          {/* C-A2 — Cambios censales detectados por el cron diario */}
          <CensusChangesPanel />
        </div>
      )}
    </div>
  );
}

// ─── Panel de cambios censales recientes ────────────────────────────────

type CensusChangeRow = {
  id: string;
  field: string;
  changeType: 'added' | 'removed' | 'modified';
  oldValue: string | null;
  newValue: string | null;
  alertSent: boolean;
  detectedAt: string;
};

function fmtField(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function CensusChangesPanel() {
  const [changes, setChanges] = useState<CensusChangeRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<30 | 90 | 365>(90);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/isaak/sede/census-changes?days=${days}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { changes: [] }))
      .then((data: { changes?: CensusChangeRow[] }) => {
        if (!cancelled) setChanges(data.changes ?? []);
      })
      .catch(() => {
        if (!cancelled) setChanges([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-blue-600" />
          <h3 className="text-[13px] font-semibold text-slate-800">
            Cambios censales detectados
          </h3>
        </div>
        <div className="flex gap-1 text-[11px]">
          {[30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d as 30 | 90 | 365)}
              className={`rounded px-2 py-0.5 ${
                days === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d === 30 ? '30d' : d === 90 ? '90d' : '1 año'}
            </button>
          ))}
        </div>
      </div>
      {loading && (
        <p className="flex items-center gap-2 text-[12px] text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Cargando cambios…
        </p>
      )}
      {!loading && changes !== null && changes.length === 0 && (
        <p className="text-[12px] text-slate-500">
          No se han detectado cambios censales en los últimos {days === 365 ? '12 meses' : `${days} días`}.
        </p>
      )}
      {!loading && changes && changes.length > 0 && (
        <ul className="space-y-2">
          {changes.map((c) => {
            const color =
              c.changeType === 'added'
                ? 'border-emerald-200 bg-emerald-50'
                : c.changeType === 'removed'
                  ? 'border-rose-200 bg-rose-50'
                  : 'border-amber-200 bg-amber-50';
            const symbol =
              c.changeType === 'added' ? '+' : c.changeType === 'removed' ? '−' : '~';
            return (
              <li key={c.id} className={`rounded-lg border p-3 text-[12px] ${color}`}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    {symbol} {fmtField(c.field)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(c.detectedAt).toLocaleDateString('es-ES')}
                  </span>
                </div>
                {c.changeType === 'modified' ? (
                  <p className="text-slate-700">
                    <span className="line-through text-slate-400">{c.oldValue ?? '—'}</span>
                    {' → '}
                    <span className="font-medium">{c.newValue ?? '—'}</span>
                  </p>
                ) : c.changeType === 'added' ? (
                  <p className="text-slate-700">añadido: <span className="font-medium">{c.newValue ?? '—'}</span></p>
                ) : (
                  <p className="text-slate-700">eliminado: <span className="font-medium">{c.oldValue ?? '—'}</span></p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
