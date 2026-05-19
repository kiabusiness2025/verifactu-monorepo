'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Palette,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { PREDEFINED_TEMPLATES, type PredefinedTemplate } from '@/app/lib/invoice-templates';

// ── Types ─────────────────────────────────────────────────────────────────────

type CertMeta = {
  id: string;
  certType: string;
  nif: string;
  commonName: string;
  issuer: string | null;
  validFrom: string;
  validTo: string;
  createdAt: string;
};

type CustomTemplate = {
  id: string;
  name: string;
  isDefault: boolean;
  sourceType: string;
  predefinedSlug: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
};

type Tab = 'plantillas' | 'certificado';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function isExpiringSoon(iso: string) {
  const days = (new Date(iso).getTime() - Date.now()) / 86400000;
  return days < 30;
}

// ── Template Card ─────────────────────────────────────────────────────────────

function TemplateColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-4 w-4 rounded-full border border-black/10"
      style={{ backgroundColor: color }}
    />
  );
}

function PredefinedCard({
  tpl,
  onApply,
  applying,
}: {
  tpl: PredefinedTemplate;
  onApply: (tpl: PredefinedTemplate) => void;
  applying: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex gap-1 pt-0.5">
          <TemplateColorDot color={tpl.config.primaryColor} />
          <TemplateColorDot color={tpl.config.secondaryColor} />
          <TemplateColorDot color={tpl.config.accentColor} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-slate-800">{tpl.name}</p>
          <p className="text-[11px] text-slate-400">{tpl.description}</p>
        </div>
      </div>
      <button
        onClick={() => onApply(tpl)}
        disabled={applying}
        className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Usar'}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('plantillas');

  // Templates state
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [applyingSlug, setApplyingSlug] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedColors, setExtractedColors] = useState<{
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  } | null>(null);
  const [savingCustom, setSavingCustom] = useState(false);
  const [customName, setCustomName] = useState('Mi plantilla');
  const [customPrimary, setCustomPrimary] = useState('#2361d8');
  const [customSecondary, setCustomSecondary] = useState('#0f172a');
  const [customAccent, setCustomAccent] = useState('#3b82f6');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const templateSuccess = useRef<string | null>(null);

  // Certificate state
  const [certs, setCerts] = useState<CertMeta[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [uploadingCert, setUploadingCert] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);
  const [certSuccess, setCertSuccess] = useState(false);
  const certFileRef = useRef<HTMLInputElement>(null);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/isaak/templates');
      if (res.ok) {
        const data = (await res.json()) as { custom: CustomTemplate[] };
        setCustomTemplates(data.custom ?? []);
      }
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const loadCerts = useCallback(async () => {
    setLoadingCerts(true);
    try {
      const res = await fetch('/api/isaak/certificates');
      if (res.ok) {
        const data = (await res.json()) as { certs: CertMeta[] };
        setCerts(data.certs ?? []);
      }
    } finally {
      setLoadingCerts(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
    void loadCerts();
  }, [loadTemplates, loadCerts]);

  async function applyPredefined(tpl: PredefinedTemplate) {
    setApplyingSlug(tpl.slug);
    try {
      await fetch('/api/isaak/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tpl.name,
          sourceType: 'predefined',
          predefinedSlug: tpl.slug,
          primaryColor: tpl.config.primaryColor,
          secondaryColor: tpl.config.secondaryColor,
          accentColor: tpl.config.accentColor,
          fontFamily: tpl.config.fontFamily,
          layoutConfig: tpl.config.layoutConfig,
          setAsDefault: true,
        }),
      });
      await loadTemplates();
    } finally {
      setApplyingSlug(null);
    }
  }

  async function extractFromInvoice(file: File) {
    setExtracting(true);
    setExtractedColors(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/isaak/templates', { method: 'POST', body: form });
      if (res.ok) {
        const data = (await res.json()) as { extracted: typeof extractedColors };
        if (data.extracted) {
          setExtractedColors(data.extracted);
          if (data.extracted.primaryColor) setCustomPrimary(data.extracted.primaryColor);
          if (data.extracted.secondaryColor) setCustomSecondary(data.extracted.secondaryColor);
          if (data.extracted.accentColor) setCustomAccent(data.extracted.accentColor);
        }
      }
    } finally {
      setExtracting(false);
    }
  }

  async function saveCustomTemplate() {
    setSavingCustom(true);
    try {
      let logoUrl: string | undefined;
      if (logoFile) {
        // Convert logo to data URL for storage
        logoUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });
      }
      await fetch('/api/isaak/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customName,
          sourceType: extractedColors ? 'ai_generated' : 'custom',
          primaryColor: customPrimary,
          secondaryColor: customSecondary,
          accentColor: customAccent,
          logoUrl,
          setAsDefault: true,
        }),
      });
      await loadTemplates();
      templateSuccess.current = customName;
    } finally {
      setSavingCustom(false);
    }
  }

  async function deleteTemplate(id: string) {
    await fetch(`/api/isaak/templates/${id}`, { method: 'DELETE' });
    await loadTemplates();
  }

  async function uploadCert() {
    if (!certFile) return;
    setUploadingCert(true);
    setCertError(null);
    setCertSuccess(false);
    try {
      const form = new FormData();
      form.append('file', certFile);
      form.append('password', certPassword);
      const res = await fetch('/api/isaak/certificates', { method: 'POST', body: form });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setCertError(data.error ?? 'Error al subir el certificado');
      } else {
        setCertSuccess(true);
        setCertFile(null);
        setCertPassword('');
        if (certFileRef.current) certFileRef.current.value = '';
        await loadCerts();
      }
    } finally {
      setUploadingCert(false);
    }
  }

  async function deleteCert(id: string) {
    await fetch(`/api/isaak/certificates/${id}`, { method: 'DELETE' });
    await loadCerts();
  }

  const defaultTemplate = customTemplates.find((t) => t.isDefault);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <h1 className="text-[16px] font-semibold text-[#011c67]">Ajustes</h1>
        <p className="text-[12px] text-slate-500">Plantillas de factura y certificado digital</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-100 px-5 pt-3">
        {(['plantillas', 'certificado'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-[12px] font-semibold capitalize transition ${
              tab === t
                ? 'border-b-2 border-[#2361d8] text-[#2361d8]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'plantillas' ? <Palette size={13} /> : <ShieldCheck size={13} />}
            {t === 'plantillas' ? 'Plantillas' : 'Certificado Digital'}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-5 p-5">
        {/* ── TEMPLATES TAB ── */}
        {tab === 'plantillas' && (
          <>
            {defaultTemplate && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                <p className="text-[12px] font-medium text-emerald-800">
                  Plantilla activa: <span className="font-bold">{defaultTemplate.name}</span>
                </p>
              </div>
            )}

            {/* Predefined templates */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-slate-500" />
                  <span className="text-[12px] font-semibold text-slate-700">
                    Plantillas predefinidas
                  </span>
                </div>
              </div>
              <div className="divide-y divide-slate-50 p-3 space-y-2">
                {PREDEFINED_TEMPLATES.map((tpl) => (
                  <PredefinedCard
                    key={tpl.slug}
                    tpl={tpl}
                    onApply={applyPredefined}
                    applying={applyingSlug === tpl.slug}
                  />
                ))}
              </div>
            </div>

            {/* Custom template builder */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <div className="flex items-center gap-2">
                  <Palette size={13} className="text-slate-500" />
                  <span className="text-[12px] font-semibold text-slate-700">
                    Crear plantilla personalizada
                  </span>
                </div>
              </div>
              <div className="space-y-4 p-5">
                {/* Extract from invoice */}
                <div>
                  <p className="mb-1.5 text-[12px] font-semibold text-slate-700">
                    Extraer estilo de una factura existente (IA)
                  </p>
                  <p className="mb-2 text-[11px] text-slate-400">
                    Sube una factura tuya en PDF o imagen — Isaak detectará tus colores corporativos
                    automáticamente.
                  </p>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 hover:bg-slate-50">
                    {extracting ? (
                      <Loader2 size={14} className="animate-spin text-slate-400" />
                    ) : (
                      <Upload size={14} className="text-slate-400" />
                    )}
                    <span className="text-[12px] text-slate-500">
                      {extracting ? 'Analizando…' : 'Subir factura modelo (PDF, JPG, PNG)'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void extractFromInvoice(f);
                      }}
                    />
                  </label>
                  {extractedColors && (
                    <p className="mt-1.5 text-[11px] text-emerald-600">
                      ✓ Colores detectados — ajústalos abajo si lo necesitas
                    </p>
                  )}
                </div>

                {/* Logo upload */}
                <div>
                  <p className="mb-1.5 text-[12px] font-semibold text-slate-700">Logotipo</p>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 hover:bg-slate-50">
                    <Upload size={14} className="text-slate-400" />
                    <span className="text-[12px] text-slate-500">
                      {logoFile ? logoFile.name : 'Subir logo (PNG, JPG — máx 2 MB)'}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setLogoFile(f);
                        const reader = new FileReader();
                        reader.onload = () => setLogoPreview(reader.result as string);
                        reader.readAsDataURL(f);
                      }}
                    />
                  </label>
                  {logoPreview && (
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-10 object-contain rounded border border-slate-200"
                      />
                      <button
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreview(null);
                        }}
                        className="text-[11px] text-slate-400 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Colors */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Color principal', value: customPrimary, set: setCustomPrimary },
                    { label: 'Color texto', value: customSecondary, set: setCustomSecondary },
                    { label: 'Color acento', value: customAccent, set: setCustomAccent },
                  ].map(({ label, value, set }) => (
                    <div key={label}>
                      <p className="mb-1 text-[11px] font-medium text-slate-600">{label}</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={value}
                          onChange={(e) => set(e.target.value)}
                          className="h-8 w-8 cursor-pointer rounded border border-slate-200"
                        />
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => set(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-mono"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Name + save */}
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <p className="mb-1 text-[11px] font-medium text-slate-600">
                      Nombre de la plantilla
                    </p>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px]"
                    />
                  </div>
                  <button
                    onClick={() => void saveCustomTemplate()}
                    disabled={savingCustom || !customName}
                    className="flex items-center gap-1.5 rounded-lg bg-[#2361d8] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1f55c0] disabled:opacity-50"
                  >
                    {savingCustom ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                    Guardar y activar
                  </button>
                </div>
              </div>
            </div>

            {/* Saved custom templates */}
            {customTemplates.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-3">
                  <span className="text-[12px] font-semibold text-slate-700">
                    Mis plantillas guardadas
                  </span>
                </div>
                <ul className="divide-y divide-slate-50">
                  {customTemplates.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex gap-1">
                        {[t.primaryColor, t.secondaryColor, t.accentColor].map(
                          (c) => c && <TemplateColorDot key={c} color={c} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-slate-800 truncate">{t.name}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{t.sourceType}</p>
                      </div>
                      {t.isDefault && (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
                          Activa
                        </span>
                      )}
                      <button
                        onClick={() => void deleteTemplate(t.id)}
                        className="shrink-0 text-slate-300 hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {loadingTemplates && (
              <div className="flex justify-center py-4">
                <Loader2 size={18} className="animate-spin text-slate-300" />
              </div>
            )}
          </>
        )}

        {/* ── CERTIFICATE TAB ── */}
        {tab === 'certificado' && (
          <>
            <div className="rounded-xl border border-[#2361d8]/20 bg-[#2361d8]/5 px-4 py-3 text-[12px] text-slate-700">
              <p className="font-semibold text-[#011c67]">
                ¿Para qué sirve el certificado digital?
              </p>
              <p className="mt-1 text-slate-500">
                Permite acceder a la Sede Electrónica de la AEAT — consultar notificaciones,
                expedientes y datos censales directamente desde Isaak. Autónomo: certificado de
                persona física FNMT. Empresa: certificado de representante de entidad.
              </p>
            </div>

            {/* Existing certs */}
            {loadingCerts ? (
              <div className="flex justify-center py-4">
                <Loader2 size={18} className="animate-spin text-slate-300" />
              </div>
            ) : certs.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-3">
                  <span className="text-[12px] font-semibold text-slate-700">
                    Certificados conectados
                  </span>
                </div>
                <ul className="divide-y divide-slate-50">
                  {certs.map((c) => {
                    const expiring = isExpiringSoon(c.validTo);
                    return (
                      <li key={c.id} className="flex items-start gap-3 px-5 py-3">
                        <ShieldCheck
                          size={16}
                          className={`mt-0.5 shrink-0 ${expiring ? 'text-amber-500' : 'text-emerald-500'}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-slate-800 truncate">
                            {c.commonName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            NIF: {c.nif} · {c.certType === 'entidad' ? 'Entidad' : 'Persona física'}
                            {c.issuer ? ` · ${c.issuer}` : ''}
                          </p>
                          <p
                            className={`text-[10px] ${expiring ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}
                          >
                            {expiring && <AlertTriangle size={10} className="inline mr-0.5" />}
                            Válido hasta {fmtDate(c.validTo)}
                            {expiring && ' — ¡expira pronto!'}
                          </p>
                        </div>
                        <button
                          onClick={() => void deleteCert(c.id)}
                          className="shrink-0 text-slate-300 hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {/* Upload form */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <span className="text-[12px] font-semibold text-slate-700">
                  {certs.length > 0 ? 'Actualizar certificado' : 'Conectar certificado digital'}
                </span>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <p className="mb-1 text-[11px] font-medium text-slate-600">Archivo .p12 o .pfx</p>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 hover:bg-slate-50">
                    <Upload size={14} className="text-slate-400" />
                    <span className="text-[12px] text-slate-500">
                      {certFile ? certFile.name : 'Seleccionar certificado (.p12 / .pfx)'}
                    </span>
                    <input
                      ref={certFileRef}
                      type="file"
                      accept=".p12,.pfx"
                      className="hidden"
                      onChange={(e) => {
                        setCertFile(e.target.files?.[0] ?? null);
                        setCertError(null);
                        setCertSuccess(false);
                      }}
                    />
                  </label>
                </div>

                <div>
                  <p className="mb-1 text-[11px] font-medium text-slate-600">
                    Contraseña del certificado
                  </p>
                  <input
                    type="password"
                    value={certPassword}
                    onChange={(e) => setCertPassword(e.target.value)}
                    placeholder="Contraseña de exportación del P12"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px]"
                  />
                </div>

                {certError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    {certError}
                  </div>
                )}
                {certSuccess && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
                    <CheckCircle2 size={13} />
                    Certificado conectado correctamente
                  </div>
                )}

                <button
                  onClick={() => void uploadCert()}
                  disabled={!certFile || uploadingCert}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2361d8] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#1f55c0] disabled:opacity-50"
                >
                  {uploadingCert ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={14} />
                  )}
                  {uploadingCert ? 'Verificando…' : 'Conectar certificado'}
                </button>

                <p className="text-center text-[10px] text-slate-400">
                  El certificado se almacena cifrado con AES-256. Nunca se envía a terceros.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
