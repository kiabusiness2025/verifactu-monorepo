'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Database,
  FileText,
  Link2,
  RefreshCcw,
  ShieldCheck,
  Users,
} from 'lucide-react';

type IntegrationStatus = {
  provider: string;
  status: string;
  lastSyncAt: string | null;
  lastError: string | null;
  connected: boolean;
  plan?: string | null;
  canConnect?: boolean;
  canUseAccountingApiIntegration?: boolean;
};

const suggestedPrompts = [
  'Resume mis facturas de Holded y dime qué ingresos tengo pendientes.',
  'Busca el contacto de un cliente en Holded y prepara un borrador de factura.',
  'Explícame mis cuentas contables de Holded como si no fuera contable.',
  'Dime qué está desviado este mes entre ventas, gastos y beneficio.',
];

const capabilityCards = [
  {
    title: 'Lectura de facturas',
    description:
      'Isaak puede consultar facturas del tenant conectado en Holded para resumir actividad e identificar pendientes.',
    icon: FileText,
  },
  {
    title: 'Clientes y contactos',
    description:
      'Puede localizar contactos para preparar facturas o validar información antes de crear un borrador.',
    icon: Users,
  },
  {
    title: 'Cuentas contables',
    description:
      'Puede leer cuentas contables y traducirlas a lenguaje operativo para empresarios no expertos.',
    icon: Database,
  },
  {
    title: 'Borradores guiados',
    description:
      'Puede preparar borradores de factura en Holded, siempre con confirmación explícita antes de escribir.',
    icon: ShieldCheck,
  },
];

export default function IsaakForHoldedPage() {
  const [integration, setIntegration] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/accounting/status', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar el estado de Holded');
      setIntegration(data as IntegrationStatus);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo cargar Holded');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const disconnectIntegration = async () => {
    setWorking(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/accounting/disconnect', {
        method: 'POST',
        headers: { 'x-isaak-entry-channel': 'dashboard' },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo desconectar Holded');
      setMessage('Holded desconectado.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo desconectar Holded');
    } finally {
      setWorking(false);
    }
  };

  const connectionTone = integration?.connected
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-amber-200 bg-amber-50 text-amber-800';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/integrations"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Isaak for Holded</h1>
          <p className="mt-1 text-sm text-slate-600">
            Módulo para operar Holded desde el dashboard de Verifactu con ayuda guiada de Isaak.
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_55%,#ffffff_100%)] p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0b6cfb]/15 bg-[#0b6cfb]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#0b6cfb]">
              <Bot className="h-3.5 w-3.5" />
              Contable nativo
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
              Menos menús contables. Más decisiones claras.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Isaak usa la conexión activa de Holded para leer facturas, contactos y cuentas
              contables desde Verifactu. El objetivo no es replicar Holded: es traducir su
              complejidad a un flujo más claro para empresarios y equipos no contables.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard/isaak"
                className="inline-flex items-center justify-center rounded-full bg-[#0b6cfb] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#095edb]"
              >
                Abrir Isaak
              </Link>
              <button
                onClick={() => void load()}
                disabled={loading || working}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw className="h-4 w-4" />
                Actualizar estado
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">Conexión actual</div>
              <div
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${connectionTone}`}
              >
                {integration?.connected ? 'Conectado' : 'No conectado'}
              </div>
            </div>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Proveedor</dt>
                <dd className="font-semibold text-slate-900">
                  {integration?.provider || 'holded'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Plan</dt>
                <dd className="font-semibold text-slate-900">{integration?.plan || '—'}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Último sync</dt>
                <dd className="font-semibold text-slate-900">{integration?.lastSyncAt || '—'}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Último error</dt>
                <dd className="max-w-[14rem] text-right font-semibold text-slate-900">
                  {integration?.lastError || '—'}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/dashboard/integrations/isaak-for-holded/connect"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0b6cfb]/10 px-4 py-2 text-xs font-semibold text-[#0b6cfb] hover:bg-[#0b6cfb]/20"
              >
                <Link2 className="h-4 w-4" />
                Conectar Holded
              </Link>
              <button
                onClick={disconnectIntegration}
                disabled={working || !integration?.connected}
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Desconectar
              </button>
            </div>

            {integration?.canConnect === false ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Este tenant no tiene activa la integración API en su plan actual. Para usar Holded
                desde Isaak, necesitas plan Empresa o PRO.
              </div>
            ) : null}

            {message ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                {message}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {capabilityCards.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b6cfb]/10 text-[#0b6cfb]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Qué puede hacer ya Isaak
          </div>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>Leer facturas de Holded y resumir actividad, pendientes y señales de riesgo.</li>
            <li>Buscar contactos para preparar nuevas facturas o validar clientes existentes.</li>
            <li>Consultar cuentas contables y explicarlas en lenguaje operativo.</li>
            <li>Crear borradores en Holded solo cuando el usuario lo confirma explícitamente.</li>
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Prompts sugeridos para empezar</div>
          <div className="mt-4 space-y-3">
            {suggestedPrompts.map((prompt) => (
              <div key={prompt} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm text-slate-700">{prompt}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/dashboard/isaak"
              className="inline-flex items-center rounded-full bg-[#0b6cfb]/10 px-4 py-2 text-xs font-semibold text-[#0b6cfb] hover:bg-[#0b6cfb]/20"
            >
              Ir al historial de Isaak
            </Link>
            <Link
              href="/dashboard/integrations"
              className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver a integraciones
            </Link>
          </div>
        </article>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_45%,#eef4ff_100%)] p-6 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0b6cfb]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#0b6cfb]">
              <Bot className="h-3.5 w-3.5" />
              Experiencia completa
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
              Lleva Isaak más allá de Holded
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Si quieres usar Isaak con panel visual, histórico, trazabilidad, reglas fiscales y
              automatizaciones, puedes probar verifactu.business gratis durante 30 días.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              href="https://verifactu.business"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-[#0b6cfb] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#095edb]"
            >
              Probar Verifactu gratis 30 días
            </Link>
            <Link
              href="https://isaak.verifactu.business"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Descubrir a Isaak
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
