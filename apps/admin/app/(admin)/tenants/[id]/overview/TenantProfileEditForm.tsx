'use client';

import { adminPatch, adminPost } from '@/lib/adminApi';
import { useState } from 'react';

type TenantData = {
  legalName: string;
  taxId: string;
  email?: string | null;
  phone?: string | null;
  representative?: string | null;
  representativeRole?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  cnae?: string | null;
  cnaeCode?: string | null;
  legalForm?: string | null;
  website?: string | null;
  taxRegime?: string | null;
  employees?: number | null;
};

type Props = {
  tenantId: string;
  tenant: TenantData;
  onSaved: (updated: Partial<TenantData>) => void;
  onCancel: () => void;
};

type FieldDef = {
  key: keyof TenantData;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'url';
};

const FIELDS: FieldDef[] = [
  { key: 'legalName', label: 'Razón social' },
  { key: 'taxId', label: 'CIF/NIF' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Teléfono', type: 'tel' },
  { key: 'representative', label: 'Representante' },
  { key: 'representativeRole', label: 'Cargo representante' },
  { key: 'address', label: 'Dirección' },
  { key: 'postalCode', label: 'Código postal' },
  { key: 'city', label: 'Ciudad' },
  { key: 'province', label: 'Provincia' },
  { key: 'country', label: 'País' },
  { key: 'cnae', label: 'CNAE' },
  { key: 'legalForm', label: 'Forma jurídica' },
  { key: 'website', label: 'Web', type: 'url' },
  { key: 'taxRegime', label: 'Régimen fiscal' },
  { key: 'employees', label: 'Empleados', type: 'number' },
];

export function TenantProfileEditForm({ tenantId, tenant, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = tenant[f.key];
      init[f.key] = v !== null && v !== undefined ? String(v) : '';
    }
    return init;
  });
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [error, setError] = useState('');

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, string | number | null> = {};
      for (const f of FIELDS) {
        const raw = form[f.key];
        if (raw === '') {
          payload[f.key] = null;
        } else if (f.type === 'number') {
          payload[f.key] = Number(raw);
        } else {
          payload[f.key] = raw;
        }
      }
      if (note.trim()) payload.adminNote = note.trim();
      await adminPatch(`/api/admin/tenants/${tenantId}/profile`, payload);
      onSaved(payload as Partial<TenantData>);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendEmail() {
    if (
      !confirm(
        'Se enviará un email a los usuarios de este tenant invitándoles a completar el perfil. ¿Continuar?'
      )
    )
      return;
    setEmailSending(true);
    setEmailMsg('');
    try {
      const res = await adminPost<{ sent: number; failed: number }>(
        `/api/admin/tenants/${tenantId}/profile-email`,
        { message: note.trim() }
      );
      setEmailMsg(`Email enviado a ${res.sent} usuario${res.sent !== 1 ? 's' : ''}.`);
    } catch (e) {
      setEmailMsg(e instanceof Error ? e.message : 'Error al enviar');
    } finally {
      setEmailSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {f.label}
            </label>
            <input
              type={f.type ?? 'text'}
              value={form[f.key] ?? ''}
              onChange={(e) => setField(f.key, e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2361d8] focus:outline-none"
              placeholder={`${f.label}…`}
            />
          </div>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Nota interna (opcional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Se guardará en el historial y se incluirá en el email si decides enviarlo…"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2361d8] focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {emailMsg && <p className="text-sm text-emerald-700">{emailMsg}</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-[#2361d8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e56c4] disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button
          type="button"
          onClick={handleSendEmail}
          disabled={emailSending}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {emailSending ? 'Enviando…' : 'Enviar email de perfil incompleto'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
