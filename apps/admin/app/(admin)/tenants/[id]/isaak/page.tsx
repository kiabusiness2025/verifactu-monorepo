'use client';

import { adminGet, adminPatch } from '@/lib/adminApi';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type WhitelabelConfig = {
  enabled?: boolean;
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  faviconUrl?: string;
  supportEmail?: string;
  hidePoweredBy?: boolean;
};

const DEFAULT_COLOR = '#2361d8';

export default function TenantIsaakPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const [config, setConfig] = useState<WhitelabelConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void adminGet<{ config: WhitelabelConfig | null }>(`/api/admin/tenants/${id}/whitelabel`)
      .then((res) => setConfig(res.config ?? {}))
      .catch(() => setError('No se pudo cargar la configuración.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await adminPatch<{ ok: boolean; config: WhitelabelConfig }>(
        `/api/admin/tenants/${id}/whitelabel`,
        config
      );
      setConfig(res.config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-400">Cargando configuración…</div>;
  }

  return (
    <div className="space-y-6">
      {/* White-label */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">White-label de Isaak</h2>
            <p className="text-xs text-slate-500">
              Personaliza la marca de Isaak para este tenant. Logo, colores y nombre empresa.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
            <div
              role="switch"
              aria-checked={config.enabled ?? false}
              onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                config.enabled ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  config.enabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
            Activado
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Nombre empresa (sustituye &quot;Isaak&quot;)
            </label>
            <input
              type="text"
              value={config.companyName ?? ''}
              onChange={(e) =>
                setConfig((c) => ({ ...c, companyName: e.target.value || undefined }))
              }
              placeholder="Ej: Asesores García AI"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Color primario (hex)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.primaryColor ?? DEFAULT_COLOR}
                onChange={(e) => setConfig((c) => ({ ...c, primaryColor: e.target.value }))}
                className="h-9 w-9 cursor-pointer rounded-lg border border-slate-200 p-0.5"
              />
              <input
                type="text"
                value={config.primaryColor ?? DEFAULT_COLOR}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, primaryColor: e.target.value || undefined }))
                }
                placeholder="#2361d8"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              URL del logo (imagen)
            </label>
            <input
              type="url"
              value={config.logoUrl ?? ''}
              onChange={(e) => setConfig((c) => ({ ...c, logoUrl: e.target.value || undefined }))}
              placeholder="https://ejemplo.com/logo.png"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Email de soporte personalizado
            </label>
            <input
              type="email"
              value={config.supportEmail ?? ''}
              onChange={(e) =>
                setConfig((c) => ({ ...c, supportEmail: e.target.value || undefined }))
              }
              placeholder="soporte@miempresa.com"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              URL del favicon (opcional)
            </label>
            <input
              type="url"
              value={config.faviconUrl ?? ''}
              onChange={(e) =>
                setConfig((c) => ({ ...c, faviconUrl: e.target.value || undefined }))
              }
              placeholder="https://ejemplo.com/favicon.ico"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="flex items-center gap-3 pt-5">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={config.hidePoweredBy ?? false}
                onChange={(e) => setConfig((c) => ({ ...c, hidePoweredBy: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
              />
              Ocultar &quot;Powered by Verifactu&quot;
            </label>
          </div>
        </div>

        {/* Preview */}
        {config.enabled && (config.logoUrl || config.companyName || config.primaryColor) && (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 text-xs font-semibold text-slate-500">Vista previa sidebar</div>
            <div
              className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5"
              style={{ backgroundColor: (config.primaryColor ?? DEFAULT_COLOR) + '18' }}
            >
              {config.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={config.logoUrl} alt="logo" className="h-6 w-6 rounded object-contain" />
              )}
              <span
                className="text-sm font-semibold"
                style={{ color: config.primaryColor ?? DEFAULT_COLOR }}
              >
                {config.companyName || 'Isaak'}
              </span>
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        {saved && <p className="mt-3 text-xs text-emerald-600">Guardado correctamente.</p>}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </section>
    </div>
  );
}
