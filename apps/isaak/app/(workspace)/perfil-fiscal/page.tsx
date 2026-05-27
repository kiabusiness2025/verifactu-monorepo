'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Info,
  Loader2,
  MapPin,
  Receipt,
  Save,
  Sparkles,
} from 'lucide-react';

type TaxpayerType =
  | 'autonomo' | 'sl' | 'sa' | 'comunidad_bienes' | 'asociacion' | 'fundacion';
type Territory =
  | 'comun' | 'canarias' | 'pais_vasco' | 'navarra' | 'ceuta_melilla';
type VatRegime =
  | 'general' | 'recargo_equivalencia' | 'criterio_caja'
  | 'simplificado' | 'prorrata' | 'sii' | 'exento';

type TaxpayerProfile = {
  taxpayerType: TaxpayerType | null;
  territory: Territory | null;
  vatRegime: VatRegime | null;
  sector: string | null;
  corporateTaxSubject: boolean | null;
  hasEmployees: boolean | null;
  hasRentWithholding: boolean | null;
  hasProfessionalInvoices: boolean | null;
  hasIntraEUOperations: boolean | null;
  hasRelatedParties: boolean | null;
  usesBillingSoftware: boolean | null;
  annualTurnover: string | null;
  notes: string | null;
  prefilledFromCi?: boolean;
  confirmedByUser?: boolean;
};

type CIProfileSummary = {
  legalName?: string;
  nif?: string;
  legalForm?: string;
  taxResidence?: string;
};

const TAXPAYER_TYPE_LABELS: Record<TaxpayerType, string> = {
  autonomo: 'Autónomo (persona física)',
  sl: 'Sociedad Limitada (SL)',
  sa: 'Sociedad Anónima (SA)',
  comunidad_bienes: 'Comunidad de bienes / SCP',
  asociacion: 'Asociación / Cooperativa',
  fundacion: 'Fundación',
};

const TERRITORY_LABELS: Record<Territory, string> = {
  comun: 'Régimen común (peninsular + Baleares)',
  canarias: 'Canarias (IGIC en vez de IVA)',
  pais_vasco: 'País Vasco (foral, TicketBAI)',
  navarra: 'Navarra (foral)',
  ceuta_melilla: 'Ceuta / Melilla',
};

const VAT_REGIME_LABELS: Record<VatRegime, string> = {
  general: 'General',
  recargo_equivalencia: 'Recargo de equivalencia (comercio minorista persona física)',
  criterio_caja: 'Criterio de caja',
  simplificado: 'Simplificado (módulos)',
  prorrata: 'Prorrata (sujeto + exento)',
  sii: 'SII (Suministro Inmediato)',
  exento: 'Exento total',
};

const EMPTY_PROFILE: TaxpayerProfile = {
  taxpayerType: null,
  territory: null,
  vatRegime: null,
  sector: null,
  corporateTaxSubject: null,
  hasEmployees: null,
  hasRentWithholding: null,
  hasProfessionalInvoices: null,
  hasIntraEUOperations: null,
  hasRelatedParties: null,
  usesBillingSoftware: null,
  annualTurnover: null,
  notes: null,
};

export default function PerfilFiscalWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [profile, setProfile] = useState<TaxpayerProfile>(EMPTY_PROFILE);
  const [ciSummary, setCiSummary] = useState<CIProfileSummary | null>(null);
  const [prefilling, setPrefilling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefillError, setPrefillError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carga inicial: si ya hay perfil persistido, lo trae.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/isaak/profile/fiscal', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: { profile?: TaxpayerProfile | null }) => {
        if (cancelled) return;
        if (data.profile) {
          setProfile({ ...EMPTY_PROFILE, ...data.profile });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runPrefill = async () => {
    setPrefilling(true);
    setPrefillError(null);
    try {
      const res = await fetch('/api/isaak/profile/fiscal/prefill', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? data.error ?? 'Prefill no disponible');
      }
      const sug = data.suggestion as Partial<TaxpayerProfile>;
      setProfile((p) => ({ ...p, ...sug, prefilledFromCi: true }));
      setCiSummary({
        legalName: data.ciProfile?.identity?.legalName,
        nif: data.ciProfile?.identity?.nif,
        legalForm: data.ciProfile?.identity?.legalForm,
        taxResidence: data.ciProfile?.identity?.taxResidence,
      });
    } catch (err) {
      setPrefillError(err instanceof Error ? err.message : 'Error de prefill');
    } finally {
      setPrefilling(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    setSavedOk(false);
    try {
      const res = await fetch('/api/isaak/profile/fiscal', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          confirmedByUser: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message ?? data.error ?? 'No se ha podido guardar');
      }
      setSavedOk(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <Building2 className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-semibold text-slate-900">Perfil fiscal de tu empresa</h1>
        </div>
        <p className="text-slate-600">
          Este perfil (R000) le permite al Inspector AEAT silenciar avisos que no aplican a tu
          empresa y activar reglas específicas (Canarias IGIC, País Vasco TicketBAI, construcción
          ISP, etc.). Solo se rellena una vez; puedes actualizarlo cuando cambie algo.
        </p>
      </header>

      {/* Steps indicator */}
      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                step >= n ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {n}
            </span>
            <span className={`text-sm ${step === n ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
              {n === 1 ? 'Identidad' : n === 2 ? 'Dimensiones fiscales' : 'Contexto operativo'}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1 — Identity + Company Intelligence prefill */}
      {step === 1 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-3 text-slate-900">Identidad de la empresa</h2>
          <p className="text-sm text-slate-600 mb-4">
            Isaak puede consultar fuentes oficiales públicas (BORME, VIES, GLEIF, PLACSP) para
            rellenar automáticamente parte del perfil. Tú confirmas o corriges en los pasos
            siguientes.
          </p>
          <button
            onClick={runPrefill}
            disabled={prefilling}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {prefilling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Consultando fuentes oficiales…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Consultar Company Intelligence
              </>
            )}
          </button>
          {prefillError && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle className="mr-2 inline h-4 w-4" />
              {prefillError}
            </div>
          )}
          {ciSummary && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-900 mb-2">
                <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
                Datos encontrados:
              </p>
              <ul className="space-y-1 text-sm text-slate-700">
                {ciSummary.legalName && <li><b>Razón social:</b> {ciSummary.legalName}</li>}
                {ciSummary.nif && <li><b>NIF:</b> {ciSummary.nif}</li>}
                {ciSummary.legalForm && <li><b>Forma jurídica:</b> {ciSummary.legalForm}</li>}
                {ciSummary.taxResidence && <li><b>Territorio fiscal:</b> {ciSummary.taxResidence}</li>}
              </ul>
              <p className="mt-2 text-xs text-emerald-700">
                Puedes corregir cualquier dato en los siguientes pasos.
              </p>
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <span className="text-xs text-slate-500">
              <Info className="mr-1 inline h-3 w-3" />
              También puedes pasar directamente al paso 2 sin prefill.
            </span>
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Siguiente
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {/* Step 2 — Critical dimensions */}
      {step === 2 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">Dimensiones fiscales críticas</h2>
          <p className="text-sm text-slate-600">
            Las 3 piezas que más impactan al Inspector. Sin ellas, el motor aplica todas las
            reglas y pueden saltar avisos que no aplican a tu caso.
          </p>

          <fieldset>
            <legend className="text-sm font-medium text-slate-800 mb-2">Tipo de contribuyente</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(TAXPAYER_TYPE_LABELS) as TaxpayerType[]).map((t) => (
                <label
                  key={t}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition ${
                    profile.taxpayerType === t
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="taxpayerType"
                    value={t}
                    checked={profile.taxpayerType === t}
                    onChange={() => setProfile((p) => ({ ...p, taxpayerType: t }))}
                    className="text-blue-600"
                  />
                  {TAXPAYER_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-slate-800 mb-2 flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> Territorio fiscal
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(TERRITORY_LABELS) as Territory[]).map((t) => (
                <label
                  key={t}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition ${
                    profile.territory === t
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="territory"
                    value={t}
                    checked={profile.territory === t}
                    onChange={() => setProfile((p) => ({ ...p, territory: t }))}
                    className="text-blue-600"
                  />
                  {TERRITORY_LABELS[t]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-slate-800 mb-2 flex items-center gap-1.5">
              <Receipt className="h-4 w-4" /> Régimen de IVA
            </legend>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(VAT_REGIME_LABELS) as VatRegime[]).map((t) => (
                <label
                  key={t}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition ${
                    profile.vatRegime === t
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="vatRegime"
                    value={t}
                    checked={profile.vatRegime === t}
                    onChange={() => setProfile((p) => ({ ...p, vatRegime: t }))}
                    className="text-blue-600"
                  />
                  {VAT_REGIME_LABELS[t]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex justify-between pt-3">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!profile.taxpayerType || !profile.territory || !profile.vatRegime}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Siguiente
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {/* Step 3 — Optional context booleans + save */}
      {step === 3 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">Contexto operativo</h2>
          <p className="text-sm text-slate-600">
            Datos opcionales pero que ayudan al Inspector a personalizar las alertas. Marca lo
            que aplique a tu empresa.
          </p>

          <div className="space-y-2">
            {(
              [
                ['hasEmployees', 'Tengo empleados con nómina (activa modelo 111)'],
                ['hasRentWithholding', 'Pago alquileres a personas físicas con retención (modelo 115)'],
                ['hasProfessionalInvoices', 'Recibo facturas de profesionales con retención'],
                ['hasIntraEUOperations', 'Realizo operaciones intracomunitarias (modelo 349)'],
                ['hasRelatedParties', 'Opero con partes vinculadas (socios, administradores)'],
                ['corporateTaxSubject', 'Sujeto al Impuesto sobre Sociedades'],
                ['usesBillingSoftware', 'Uso software de facturación de terceros'],
              ] as Array<[keyof TaxpayerProfile, string]>
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm cursor-pointer hover:border-slate-300"
              >
                <input
                  type="checkbox"
                  checked={profile[key] === true}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, [key]: e.target.checked }))
                  }
                  className="h-4 w-4 text-blue-600"
                />
                <span className="text-slate-700">{label}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-800">Sector (opcional)</span>
              <input
                type="text"
                placeholder="ej. consultoria, hosteleria, ecommerce..."
                value={profile.sector ?? ''}
                onChange={(e) => setProfile((p) => ({ ...p, sector: e.target.value || null }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-800">Cifra de negocio anual (opcional)</span>
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="250000"
                value={profile.annualTurnover ?? ''}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    annualTurnover: e.target.value === '' ? null : e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-800">Notas internas (opcional)</span>
            <textarea
              rows={2}
              value={profile.notes ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, notes: e.target.value || null }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mr-2 inline h-4 w-4" />
              {saveError}
            </div>
          )}
          {savedOk && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="mr-2 inline h-4 w-4" />
              Perfil guardado. El Inspector AEAT aplicará el scope correspondiente en futuras auditorías.
            </div>
          )}

          <div className="flex justify-between pt-3">
            <button
              onClick={() => setStep(2)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Anterior
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar perfil
                </>
              )}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
