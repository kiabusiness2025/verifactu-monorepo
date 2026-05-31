'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CalendarClock,
  Check,
  ChevronRight,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';

// V2.0.1 — modelos AEAT seleccionables manualmente por el asesor.
const SELECTABLE_MODELOS: Array<{ code: string; label: string }> = [
  { code: '303', label: 'IVA trimestral (303 / 390)' },
  { code: '130', label: 'IRPF fraccionado autónomos (130)' },
  { code: '200', label: 'Impuesto sociedades (200)' },
  { code: '111', label: 'Retenciones trabajo (111 / 190)' },
  { code: '115', label: 'Retenciones alquiler (115 / 180)' },
];

type AdvisorClient = {
  id: string;
  alias: string;
  companyName: string | null;
  nif: string | null;
  holdedKeyMasked: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  modelos: string[];
};

type FormState = {
  alias: string;
  companyName: string;
  nif: string;
  holdedApiKey: string;
  notes: string;
  modelos: string[];
};

const EMPTY_FORM: FormState = {
  alias: '',
  companyName: '',
  nif: '',
  holdedApiKey: '',
  notes: '',
  modelos: [],
};

function ClientCard({
  client,
  onEdit,
  onDelete,
  onSwitch,
  onSaveNotes,
  switching,
}: {
  client: AdvisorClient;
  onEdit: (client: AdvisorClient) => void;
  onDelete: (id: string) => void;
  onSwitch: (id: string) => void;
  onSaveNotes: (id: string, notes: string) => Promise<void>;
  switching: string | null;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [draft, setDraft] = useState(client.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);

  const startEditNotes = () => {
    setDraft(client.notes ?? '');
    setEditingNotes(true);
  };
  const cancelEditNotes = () => {
    setDraft(client.notes ?? '');
    setEditingNotes(false);
  };
  const commitNotes = async () => {
    setSavingNotes(true);
    try {
      await onSaveNotes(client.id, draft.trim());
      setEditingNotes(false);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#2361d8]/40 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2361d8]/8 text-[#2361d8]">
            <Building2 size={16} />
          </div>
          <div>
            <div className="font-semibold text-[#011c67]">{client.alias}</div>
            {client.companyName && (
              <div className="text-xs text-slate-500">{client.companyName}</div>
            )}
            {client.nif && <div className="text-[11px] text-slate-400">NIF: {client.nif}</div>}
            {client.holdedKeyMasked && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
                <KeyRound size={11} />
                Holded: {client.holdedKeyMasked}
              </div>
            )}
            {client.modelos.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <CalendarClock size={10} className="text-slate-400" />
                {client.modelos.map((m) => (
                  <span
                    key={m}
                    className="rounded bg-slate-100 px-1.5 text-[9px] font-bold text-slate-600"
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <ChevronRight
          size={16}
          className="mt-1 shrink-0 text-slate-300 group-hover:text-[#2361d8]"
        />
      </div>

      {/* Notas inline (V2.0.2) */}
      <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/40 p-2">
        {editingNotes ? (
          <div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              rows={2}
              maxLength={2000}
              placeholder="Observaciones internas: ciclo de pago, contacto principal, recordatorios…"
              className="w-full resize-none rounded-md border border-amber-200 bg-white px-2 py-1 text-[12px] focus:border-amber-400 focus:outline-none"
            />
            <div className="mt-1 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={cancelEditNotes}
                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void commitNotes()}
                disabled={savingNotes}
                className="flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
              >
                {savingNotes ? (
                  <Loader2 size={9} className="animate-spin" />
                ) : (
                  <Check size={9} />
                )}
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditNotes}
            className="flex w-full items-start gap-1.5 text-left text-[11px] text-slate-600 hover:text-slate-900"
          >
            <StickyNote size={11} className="mt-0.5 shrink-0 text-amber-500" />
            {client.notes ? (
              <span className="whitespace-pre-wrap leading-snug">{client.notes}</span>
            ) : (
              <span className="italic text-slate-400">Añadir nota interna…</span>
            )}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSwitch(client.id)}
          disabled={switching === client.id}
          className="flex items-center gap-1.5 rounded-lg bg-[#2361d8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1d55c2] disabled:opacity-60"
        >
          {switching === client.id ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <UserCheck size={11} />
          )}
          Chat con este cliente
        </button>
        <button
          type="button"
          onClick={() => onEdit(client)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <Pencil size={11} />
          Editar
        </button>
        <button
          type="button"
          onClick={() => onDelete(client.id)}
          className="flex items-center gap-1.5 rounded-lg border border-rose-100 bg-white px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50"
        >
          <Trash2 size={11} />
          Eliminar
        </button>
      </div>
    </div>
  );
}

function ClientForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState;
  onSave: (form: FormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const aliasRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    aliasRef.current?.focus();
  }, []);

  const set =
    (field: 'alias' | 'companyName' | 'nif' | 'holdedApiKey' | 'notes') =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const toggleModelo = (code: string) =>
    setForm((f) => ({
      ...f,
      modelos: f.modelos.includes(code)
        ? f.modelos.filter((m) => m !== code)
        : [...f.modelos, code],
    }));

  return (
    <div className="rounded-2xl border border-[#2361d8]/20 bg-[#2361d8]/3 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">
            Alias <span className="text-rose-500">*</span>
          </label>
          <input
            ref={aliasRef}
            value={form.alias}
            onChange={set('alias')}
            placeholder="Ej: Fernández S.L."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-[#2361d8] focus:outline-none focus:ring-1 focus:ring-[#2361d8]/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">
            Razón social
          </label>
          <input
            value={form.companyName}
            onChange={set('companyName')}
            placeholder="Nombre legal de la empresa"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-[#2361d8] focus:outline-none focus:ring-1 focus:ring-[#2361d8]/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">NIF</label>
          <input
            value={form.nif}
            onChange={set('nif')}
            placeholder="B12345678"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-[#2361d8] focus:outline-none focus:ring-1 focus:ring-[#2361d8]/30"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">
            API Key de Holded
          </label>
          <input
            value={form.holdedApiKey}
            onChange={set('holdedApiKey')}
            type="password"
            placeholder="Deja vacío para no cambiar"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-[#2361d8] focus:outline-none focus:ring-1 focus:ring-[#2361d8]/30"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">Notas</label>
          <textarea
            value={form.notes}
            onChange={set('notes')}
            rows={2}
            placeholder="Observaciones internas (no visibles al cliente)"
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-[#2361d8] focus:outline-none focus:ring-1 focus:ring-[#2361d8]/30"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">
            Modelos AEAT que aplican a este cliente
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SELECTABLE_MODELOS.map((m) => {
              const on = form.modelos.includes(m.code);
              return (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => toggleModelo(m.code)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    on
                      ? 'border-[#2361d8] bg-[#2361d8] text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-[#2361d8]/40 hover:text-[#2361d8]'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[10px] text-slate-400">
            Sirve para filtrar los próximos vencimientos AEAT de este cliente.
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <X size={11} />
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={saving || !form.alias.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-[#2361d8] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1d55c2] disabled:opacity-60"
        >
          {saving && <Loader2 size={11} className="animate-spin" />}
          Guardar
        </button>
      </div>
    </div>
  );
}

export default function AdvisorDashboardClient() {
  const router = useRouter();
  const [clients, setClients] = useState<AdvisorClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<AdvisorClient | null>(null);
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadClients = () => {
    setLoading(true);
    fetch('/api/isaak/advisor/clients')
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleCreate = async (form: FormState) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/isaak/advisor/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? 'Error al crear el cliente');
        return;
      }
      const created = (await res.json()) as { client?: { id: string } };
      if (created.client?.id && form.modelos.length > 0) {
        await fetch(`/api/isaak/advisor/clients/${created.client.id}/fiscal-profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelos: form.modelos }),
        });
      }
      setShowForm(false);
      loadClients();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (form: FormState) => {
    if (!editingClient) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/isaak/advisor/clients/${editingClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? 'Error al actualizar');
        return;
      }
      await fetch(`/api/isaak/advisor/clients/${editingClient.id}/fiscal-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelos: form.modelos }),
      });
      setEditingClient(null);
      loadClients();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente? Esta acción es reversible contactando con soporte.'))
      return;
    await fetch(`/api/isaak/advisor/clients/${id}`, { method: 'DELETE' });
    loadClients();
  };

  const handleSwitch = async (id: string) => {
    setSwitching(id);
    try {
      const res = await fetch(`/api/isaak/advisor/clients/${id}/switch`, { method: 'POST' });
      if (res.ok) {
        router.push('/chat');
      }
    } finally {
      setSwitching(null);
    }
  };

  // V2.0.2 — guarda únicamente el campo notes (mucho más ligero que el
  // formulario completo de edición). Optimistic update.
  const handleSaveNotes = async (id: string, notes: string) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, notes: notes || null } : c)));
    try {
      await fetch(`/api/isaak/advisor/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
    } catch {
      loadClients();
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
        <span className="text-sm text-slate-600">
          <strong className="text-[#011c67]">{clients.length}</strong> cliente
          {clients.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setEditingClient(null);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-[#2361d8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1d55c2]"
        >
          <Plus size={12} />
          Nuevo cliente
        </button>
      </div>

      <div className="flex-1 space-y-3 p-5">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Create form */}
        {showForm && !editingClient && (
          <ClientForm
            initial={EMPTY_FORM}
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        )}

        {clients.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2361d8]/10">
              <Building2 size={24} className="text-[#2361d8]" />
            </div>
            <p className="text-[16px] font-semibold text-[#011c67]">Sin clientes todavía</p>
            <p className="max-w-xs text-[13px] leading-relaxed text-slate-500">
              Añade las empresas que gestionas como asesor. Cada cliente tiene su propia API Key de
              Holded y su historial separado.
            </p>
          </div>
        )}

        {clients.map((c) =>
          editingClient?.id === c.id ? (
            <ClientForm
              key={c.id}
              initial={{
                alias: c.alias,
                companyName: c.companyName ?? '',
                nif: c.nif ?? '',
                holdedApiKey: '',
                notes: c.notes ?? '',
                modelos: c.modelos,
              }}
              onSave={handleUpdate}
              onCancel={() => setEditingClient(null)}
              saving={saving}
            />
          ) : (
            <ClientCard
              key={c.id}
              client={c}
              onEdit={setEditingClient}
              onDelete={handleDelete}
              onSwitch={handleSwitch}
              onSaveNotes={handleSaveNotes}
              switching={switching}
            />
          )
        )}
      </div>
    </div>
  );
}
