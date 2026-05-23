'use client';

import {
  AlertTriangle,
  Calculator,
  ExternalLink,
  Loader2,
  Lock,
  Plug,
  Printer,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type {
  Modelo303Result,
  Modelo130Result,
  Modelo390Result,
  Trimestre,
} from '@/app/lib/fiscal-models';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = '303' | '130' | '390';

type ApiError = 'plan_required' | 'no_holded' | 'generation_failed' | 'unknown';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function eur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
const TRIMESTRES: Trimestre[] = ['1T', '2T', '3T', '4T'];
const TRIMESTRE_LABEL: Record<Trimestre, string> = {
  '1T': '1.er trimestre (ene–mar)',
  '2T': '2.º trimestre (abr–jun)',
  '3T': '3.er trimestre (jul–sep)',
  '4T': '4.º trimestre (oct–dic)',
};

async function callModelos(body: object): Promise<{
  ok: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}> {
  const res = await fetch('/api/isaak/modelos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    data?: unknown;
    error?: string;
    message?: string;
  };
  return { ok: res.ok, ...json };
}

function classifyError(json: { error?: string; message?: string }): {
  type: ApiError;
  message: string;
} {
  if (json.error === 'plan_required') {
    return { type: 'plan_required', message: json.message ?? 'Plan Business requerido.' };
  }
  const msg = json.message ?? '';
  if (msg.includes('Holded') || json.error === 'no_holded') {
    return { type: 'no_holded', message: msg };
  }
  return { type: 'generation_failed', message: msg || 'Error calculando modelo.' };
}

// ─── Error banners ────────────────────────────────────────────────────────────

function PlanRequiredBanner() {
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 flex gap-4 items-start">
      <Lock size={20} className="shrink-0 text-violet-500 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-violet-900 text-sm">Función exclusiva del plan Business</p>
        <p className="text-xs text-violet-700 mt-1">
          Los modelos AEAT pre-rellenados requieren el plan Business (€149/mes). Incluye todos los
          modelos, multi-usuario y módulos avanzados.
        </p>
        <Link
          href="/pricing"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700"
        >
          Ver planes <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  );
}

function HoldedNotConnectedBanner() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-4 items-start">
      <Plug size={20} className="shrink-0 text-amber-500 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-amber-900 text-sm">Holded no conectado</p>
        <p className="text-xs text-amber-700 mt-1">
          Los modelos se calculan a partir de tus facturas en Holded. Conecta tu cuenta para
          continuar.
        </p>
        <Link
          href="/settings?section=integrations"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
        >
          Conectar Holded <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  );
}

function GenericErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex gap-2 items-start text-sm text-red-700">
      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function ErrorBanner({ type, message }: { type: ApiError; message: string }) {
  if (type === 'plan_required') return <PlanRequiredBanner />;
  if (type === 'no_holded') return <HoldedNotConnectedBanner />;
  return <GenericErrorBanner message={message} />;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Advertencias({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-1">
      {items.map((w, i) => (
        <div key={i} className="flex gap-2 text-sm text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{w}</span>
        </div>
      ))}
    </div>
  );
}

function CasillaRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex justify-between py-2 border-b border-slate-100 text-sm ${highlight ? 'font-semibold' : ''}`}
    >
      <span className="text-slate-600">{label}</span>
      <span className={highlight ? 'text-slate-900 text-base' : 'text-slate-800 font-mono'}>
        {value}
      </span>
    </div>
  );
}

function TramoTable({
  tramos,
  titulo,
}: {
  tramos: { tipo: number; base: number; cuota: number }[];
  titulo: string;
}) {
  if (!tramos.length) return <p className="text-sm text-slate-400 italic">{titulo}: sin datos</p>;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{titulo}</p>
      <div className="overflow-x-auto rounded border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-right px-3 py-2">Base imponible</th>
              <th className="text-right px-3 py-2">Cuota</th>
            </tr>
          </thead>
          <tbody>
            {tramos.map((t) => (
              <tr key={t.tipo} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{t.tipo}%</td>
                <td className="px-3 py-2 text-right font-mono">{eur(t.base)}</td>
                <td className="px-3 py-2 text-right font-mono">{eur(t.cuota)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultBadge({ value }: { value: number }) {
  const color =
    value > 0
      ? 'bg-red-50 text-red-700 border-red-200'
      : value < 0
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-slate-50 text-slate-700 border-slate-200';
  const label = value > 0 ? 'A ingresar' : value < 0 ? 'A devolver' : 'Resultado cero';
  return (
    <div className={`inline-flex flex-col items-center rounded-xl border px-6 py-3 ${color}`}>
      <span className="text-xs font-medium opacity-70">{label}</span>
      <span className="text-2xl font-bold">{eur(Math.abs(value))}</span>
    </div>
  );
}

function Disclaimer() {
  return (
    <p className="text-xs text-slate-400 text-center">
      Borrador estimado a partir de los datos de Holded · No es una declaración oficial · Verifica
      con tu asesor antes de presentar
    </p>
  );
}

// ─── Modelo 303 ───────────────────────────────────────────────────────────────

function Modelo303Panel() {
  const [ejercicio, setEjercicio] = useState(CURRENT_YEAR);
  const [periodo, setPeriodo] = useState<Trimestre>('1T');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Modelo303Result | null>(null);
  const [apiError, setApiError] = useState<{ type: ApiError; message: string } | null>(null);

  async function calcular() {
    setLoading(true);
    setApiError(null);
    setResult(null);
    try {
      const json = await callModelos({ modelo: '303', ejercicio, periodo });
      if (!json.ok) {
        setApiError(classifyError(json));
        return;
      }
      setResult(json.data as Modelo303Result);
    } catch {
      setApiError({ type: 'unknown', message: 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 print:hidden">
        <h2 className="font-semibold text-slate-800">
          Modelo 303 — Autoliquidación IVA trimestral
        </h2>
        <div className="flex flex-wrap gap-3">
          <select
            value={ejercicio}
            onChange={(e) => setEjercicio(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as Trimestre)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
          >
            {TRIMESTRES.map((t) => (
              <option key={t} value={t}>
                {TRIMESTRE_LABEL[t]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={calcular}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Calculator size={15} />}
            Calcular borrador
          </button>
        </div>
      </div>

      {apiError && <ErrorBanner type={apiError.type} message={apiError.message} />}

      {result && (
        <div className="space-y-5">
          <div className="hidden print:block mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Modelo 303 — IVA trimestral · {TRIMESTRE_LABEL[periodo]} {ejercicio}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Borrador estimado por Isaak · {new Date().toLocaleDateString('es-ES')}
            </p>
          </div>
          <Advertencias items={result.advertencias} />
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <TramoTable tramos={result.repercutido} titulo="IVA repercutido (ventas)" />
              <CasillaRow
                label="Total IVA devengado"
                value={eur(result.totalDevengado)}
                highlight
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <TramoTable tramos={result.soportado} titulo="IVA soportado (compras)" />
              <CasillaRow
                label="Total IVA soportado deducible"
                value={eur(result.totalSoportado)}
                highlight
              />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col items-center gap-3">
            <p className="text-sm text-slate-500">
              Resultado liquidación ({result.facturas} facturas · {result.compras} compras)
            </p>
            <ResultBadge value={result.resultado} />
          </div>
          <Disclaimer />
          <div className="flex justify-end print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Printer size={15} />
              Imprimir / Guardar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modelo 130 ───────────────────────────────────────────────────────────────

function Modelo130Panel() {
  const [ejercicio, setEjercicio] = useState(CURRENT_YEAR);
  const [periodo, setPeriodo] = useState<Trimestre>('1T');
  const [retenciones, setRetenciones] = useState('');
  const [previos, setPrevios] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Modelo130Result | null>(null);
  const [apiError, setApiError] = useState<{ type: ApiError; message: string } | null>(null);

  async function calcular() {
    setLoading(true);
    setApiError(null);
    setResult(null);
    try {
      const json = await callModelos({
        modelo: '130',
        ejercicio,
        periodo,
        retencionesAcumuladas: retenciones ? Number(retenciones) : 0,
        ingresosACuenta: previos ? Number(previos) : 0,
      });
      if (!json.ok) {
        setApiError(classifyError(json));
        return;
      }
      setResult(json.data as Modelo130Result);
    } catch {
      setApiError({ type: 'unknown', message: 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 print:hidden">
        <h2 className="font-semibold text-slate-800">
          Modelo 130 — Pago fraccionado IRPF (autónomos)
        </h2>
        <div className="flex flex-wrap gap-3">
          <select
            value={ejercicio}
            onChange={(e) => setEjercicio(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as Trimestre)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
          >
            {TRIMESTRES.map((t) => (
              <option key={t} value={t}>
                {TRIMESTRE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Retenciones acumuladas (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={retenciones}
              onChange={(e) => setRetenciones(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Pagos fraccionados previos del año (€)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={previos}
              onChange={(e) => setPrevios(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={calcular}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Calculator size={15} />}
          Calcular borrador
        </button>
      </div>

      {apiError && <ErrorBanner type={apiError.type} message={apiError.message} />}

      {result && (
        <div className="space-y-5">
          <div className="hidden print:block mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Modelo 130 — IRPF autónomos · {TRIMESTRE_LABEL[periodo]} {ejercicio}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Borrador estimado por Isaak · {new Date().toLocaleDateString('es-ES')}
            </p>
          </div>
          <Advertencias items={result.advertencias} />
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-1">
            <CasillaRow
              label={`Ingresos acumulados (1 ene – fin ${result.periodo})`}
              value={eur(result.ingresosAcumulados)}
            />
            <CasillaRow label="Gastos deducibles acumulados" value={eur(result.gastosAcumulados)} />
            <CasillaRow label="Rendimiento neto" value={eur(result.rendimientoNeto)} highlight />
            <CasillaRow label="Cuota (20% rendimiento neto)" value={eur(result.cuotaPrevia)} />
            <CasillaRow
              label="Retenciones acumuladas (−)"
              value={eur(result.retencionesAcumuladas)}
            />
            <CasillaRow
              label="Pagos fraccionados previos (−)"
              value={eur(result.ingresosACuenta)}
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col items-center gap-3">
            <p className="text-sm text-slate-500">Resultado a ingresar</p>
            <ResultBadge value={result.resultado} />
          </div>
          <Disclaimer />
          <div className="flex justify-end print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Printer size={15} />
              Imprimir / Guardar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modelo 390 ───────────────────────────────────────────────────────────────

function Modelo390Panel() {
  const [ejercicio, setEjercicio] = useState(CURRENT_YEAR - 1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Modelo390Result | null>(null);
  const [apiError, setApiError] = useState<{ type: ApiError; message: string } | null>(null);

  async function calcular() {
    setLoading(true);
    setApiError(null);
    setResult(null);
    try {
      const json = await callModelos({ modelo: '390', ejercicio });
      if (!json.ok) {
        setApiError(classifyError(json));
        return;
      }
      setResult(json.data as Modelo390Result);
    } catch {
      setApiError({ type: 'unknown', message: 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 print:hidden">
        <h2 className="font-semibold text-slate-800">Modelo 390 — Resumen anual IVA</h2>
        <div className="flex flex-wrap gap-3">
          <select
            title="Ejercicio fiscal"
            value={ejercicio}
            onChange={(e) => setEjercicio(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={calcular}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Calculator size={15} />}
            Calcular resumen anual
          </button>
        </div>
      </div>

      {apiError && <ErrorBanner type={apiError.type} message={apiError.message} />}

      {result && (
        <div className="space-y-5">
          <div className="hidden print:block mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Modelo 390 — IVA anual · Ejercicio {ejercicio}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Borrador estimado por Isaak · {new Date().toLocaleDateString('es-ES')}
            </p>
          </div>
          <Advertencias items={result.advertencias} />
          {result.trimestresDisponibles.length > 0 && (
            <p className="text-sm text-slate-500">
              Trimestres con datos: {result.trimestresDisponibles.join(', ')}
            </p>
          )}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <TramoTable tramos={result.tramos} titulo="IVA repercutido (ventas anuales)" />
              <CasillaRow
                label="Total IVA devengado"
                value={eur(result.totalDevengado)}
                highlight
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                IVA soportado (compras anuales)
              </p>
              <CasillaRow
                label="Total IVA soportado deducible"
                value={eur(result.totalSoportado)}
                highlight
              />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col items-center gap-3">
            <p className="text-sm text-slate-500">Resultado anual</p>
            <ResultBadge value={result.resultado} />
          </div>
          <Disclaimer />
          <div className="flex justify-end print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Printer size={15} />
              Imprimir / Guardar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TAB_LABEL: Record<ActiveTab, string> = {
  '303': 'Mod. 303 — IVA trimestral',
  '130': 'Mod. 130 — IRPF autónomos',
  '390': 'Mod. 390 — IVA anual',
};

export default function ModelosPage() {
  const [tab, setTab] = useState<ActiveTab>('303');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Modelos AEAT</h1>
        <p className="text-sm text-slate-500 mt-1">
          Borradores pre-rellenados con tus datos de Holded. Revisa y ajusta antes de presentar.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 print:hidden">
        {(['303', '130', '390'] as ActiveTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 px-3 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === '303' && <Modelo303Panel />}
      {tab === '130' && <Modelo130Panel />}
      {tab === '390' && <Modelo390Panel />}
    </div>
  );
}
