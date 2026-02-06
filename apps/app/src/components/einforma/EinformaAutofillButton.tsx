'use client';

import { useState } from 'react';
import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { useToast } from '@/components/notifications/ToastNotifications';

type NormalizedCompany = {
  name?: string | null;
  legalName?: string | null;
  nif?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  website?: string | null;
  capitalSocial?: number | null;
};

type Meta = {
  cached?: boolean;
  cacheSource?: string | null;
  lastSyncAt?: string | null;
};

type Props = {
  taxIdValue: string;
  onApply: (normalized: NormalizedCompany, meta: Meta) => void;
  disabled?: boolean;
  className?: string;
  endpoint?: string;
  refreshable?: boolean;
  refreshLabel?: string;
  refreshParam?: string;
};

function normalizeTaxId(value: string) {
  return value.trim().toUpperCase();
}

function isValidTaxId(value: string) {
  return /^[A-Z0-9]{8,9}$/.test(value);
}

function normalizeCapitalSocial(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const normalized = value.replace(/\./g, '').replace(',', '.').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function EinformaAutofillButton({
  taxIdValue,
  onApply,
  disabled,
  className,
  endpoint = '/api/integrations/einforma/company',
  refreshable = false,
  refreshLabel = 'Actualizar (consume creditos)',
  refreshParam = 'refresh=1',
}: Props) {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);

  const normalizedTaxId = normalizeTaxId(taxIdValue);
  const canSearch = !!normalizedTaxId && isValidTaxId(normalizedTaxId) && !disabled;

  const buildUrl = (withRefresh: boolean) => {
    const sep = endpoint.includes('?') ? '&' : '?';
    const refreshSuffix = withRefresh ? `&${refreshParam}` : '';
    return `${endpoint}${sep}taxId=${encodeURIComponent(normalizedTaxId)}${refreshSuffix}`;
  };

  const handleClick = async (withRefresh = false) => {
    if (!canSearch || loading) return;
    try {
      setLoading(true);
      const res = await fetch(buildUrl(withRefresh));
      const data = await res.json();
      if (!res.ok || !data?.normalized) {
        showError('eInforma', data?.error ?? 'No se pudo completar la empresa');
        return;
      }

      const nextMeta: Meta = {
        cached: !!data.cached,
        cacheSource: data.cacheSource ?? null,
        lastSyncAt: data.lastSyncAt ?? null,
      };

      const normalizedCompany: NormalizedCompany = {
        ...(data.normalized ?? {}),
        capitalSocial: normalizeCapitalSocial(data?.normalized?.capitalSocial),
      };

      setMeta(nextMeta);
      onApply(normalizedCompany, nextMeta);
      success(
        'eInforma',
        data.cached ? 'Datos completados desde snapshot' : 'Datos completados desde eInforma'
      );
    } catch (err) {
      console.error('eInforma autofill error:', err);
      showError('eInforma', 'No se pudo completar la empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <AccessibleButton
          type="button"
          onClick={() => handleClick(false)}
          disabled={!canSearch || loading}
        >
          {loading ? 'Buscando...' : 'Autocompletar con eInforma'}
        </AccessibleButton>
        {refreshable ? (
          <AccessibleButton
            type="button"
            onClick={() => handleClick(true)}
            disabled={!canSearch || loading}
            variant="secondary"
          >
            {refreshLabel}
          </AccessibleButton>
        ) : null}
        {meta ? (
          <span className="rounded-full border px-2 py-1 text-[11px] text-slate-600">
            {meta.cached ? 'Snapshot (<=30 dias)' : 'eInforma (live)'}
          </span>
        ) : null}
        {meta?.lastSyncAt ? (
          <span className="text-[11px] text-slate-500">Actualizado: {meta.lastSyncAt}</span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Se consulta solo al pulsar el boton (ahorro de creditos).
      </p>
    </div>
  );
}
