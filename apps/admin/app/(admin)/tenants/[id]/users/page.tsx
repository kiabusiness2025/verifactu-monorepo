'use client';

import { adminDelete, adminPatch, adminPost } from '@/lib/adminApi';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock, Loader2, MailPlus, ShieldCheck, Trash2, UserX, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type InviterInfo = { id: string; name: string | null; email: string };

type Member = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  status: 'active' | 'invited' | 'disabled';
  side: string | null;
  createdAt: string;
  confirmedAt: string | null;
  disabledAt: string | null;
  invitedBy: InviterInfo | null;
  inviteExpiresAt: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(v: string | null) {
  if (!v) return '—';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(v));
}

function initials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }
  return email[0].toUpperCase();
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    owner: 'bg-violet-50 text-violet-700 border-violet-200',
    admin: 'bg-blue-50 text-blue-700 border-blue-200',
    member: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  const labels: Record<string, string> = {
    owner: 'Propietario',
    admin: 'Admin',
    member: 'Miembro',
  };
  const cls = styles[role] ?? styles.member;
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {labels[role] ?? role}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === 'active')
    return <CheckCircle size={13} className="text-emerald-500" aria-label="Activo" />;
  if (status === 'invited')
    return <Clock size={13} className="text-amber-500" aria-label="Invitado" />;
  return <UserX size={13} className="text-slate-400" aria-label="Desactivado" />;
}

// ── Invite modal ──────────────────────────────────────────────────────────────

function InviteModal({
  tenantId,
  onDone,
  onClose,
}: {
  tenantId: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await adminPost(`/api/admin/tenants/${tenantId}/memberships`, { email, role });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar la invitación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <MailPlus size={16} className="text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">Invitar miembro</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Cerrar"
            aria-label="Cerrar modal"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="invite-role"
              className="mb-1.5 block text-xs font-medium text-slate-700"
            >
              Rol
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="member">Miembro — acceso estándar</option>
              <option value="admin">Admin — puede gestionar el equipo</option>
            </select>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              Enviar invitación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TenantUsersPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params?.id ?? '';

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await import('@/lib/adminApi').then((m) =>
        m.adminGet<{ members: Member[] }>(`/api/admin/tenants/${tenantId}/memberships`)
      );
      setMembers(data.members);
    } catch {
      setError('No se pudieron cargar los miembros.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const changeRole = async (membershipId: string, role: string) => {
    setActionLoading(membershipId + ':role');
    try {
      await adminPatch(`/api/admin/tenants/${tenantId}/memberships/${membershipId}`, { role });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar el rol.');
    } finally {
      setActionLoading(null);
    }
  };

  const revoke = async (membershipId: string, name: string | null, email: string) => {
    if (!confirm(`¿Revocar acceso de ${name ?? email}? Esta acción se puede revertir manualmente.`))
      return;
    setActionLoading(membershipId + ':revoke');
    try {
      await adminDelete(`/api/admin/tenants/${tenantId}/memberships/${membershipId}`);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al revocar acceso.');
    } finally {
      setActionLoading(null);
    }
  };

  const active = members.filter((m) => m.status === 'active');
  const invited = members.filter((m) => m.status === 'invited');
  const disabled = members.filter((m) => m.status === 'disabled');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Equipo</h2>
          <p className="text-xs text-slate-500">
            {active.length} activo{active.length !== 1 ? 's' : ''} · {invited.length} pendiente
            {invited.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
        >
          <MailPlus size={13} />
          Invitar miembro
        </button>
      </div>

      {/* Active members */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <ShieldCheck size={14} className="text-emerald-500" />
          <h3 className="text-xs font-semibold text-slate-700">Miembros activos</h3>
          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {active.length}
          </span>
        </div>
        {active.length === 0 ? (
          <p className="px-5 py-6 text-xs text-slate-400">Sin miembros activos.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {active.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                actionLoading={actionLoading}
                onChangeRole={changeRole}
                onRevoke={revoke}
              />
            ))}
          </div>
        )}
      </section>

      {/* Pending invites */}
      {invited.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/40 shadow-soft">
          <div className="flex items-center gap-2 border-b border-amber-100 px-5 py-3">
            <Clock size={14} className="text-amber-500" />
            <h3 className="text-xs font-semibold text-slate-700">Invitaciones pendientes</h3>
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
              {invited.length}
            </span>
          </div>
          <div className="divide-y divide-amber-100/60">
            {invited.map((m) => (
              <InviteRow key={m.id} member={m} actionLoading={actionLoading} onRevoke={revoke} />
            ))}
          </div>
        </section>
      )}

      {/* Disabled */}
      {disabled.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white shadow-soft">
          <summary className="flex cursor-pointer items-center gap-2 px-5 py-3 text-xs font-semibold text-slate-500 hover:text-slate-700">
            <UserX size={14} />
            Acceso revocado ({disabled.length})
          </summary>
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {disabled.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                actionLoading={actionLoading}
                onChangeRole={changeRole}
                onRevoke={revoke}
              />
            ))}
          </div>
        </details>
      )}

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          tenantId={tenantId}
          onDone={() => {
            setShowInvite(false);
            void reload();
          }}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}

// ── Member row ────────────────────────────────────────────────────────────────

function MemberRow({
  member: m,
  actionLoading,
  onChangeRole,
  onRevoke,
}: {
  member: Member;
  actionLoading: string | null;
  onChangeRole: (id: string, role: string) => void;
  onRevoke: (id: string, name: string | null, email: string) => void;
}) {
  const isOwner = m.role === 'owner';
  const isDisabled = m.status === 'disabled';
  const busy = actionLoading?.startsWith(m.id);

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
        {initials(m.name, m.email)}
      </div>

      {/* Name + email */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium ${isDisabled ? 'text-slate-400' : 'text-slate-900'}`}
          >
            {m.name ?? m.email}
          </span>
          <StatusDot status={m.status} />
        </div>
        <div className="text-[11px] text-slate-400">{m.email}</div>
      </div>

      {/* Role + date */}
      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <RoleBadge role={m.role} />
        <span className="text-[10px] text-slate-400">
          {m.confirmedAt ? `Confirmado ${fmtDate(m.confirmedAt)}` : fmtDate(m.createdAt)}
        </span>
      </div>

      {/* Actions */}
      <div className="ml-2 flex shrink-0 items-center gap-1">
        {!isOwner && !isDisabled && (
          <select
            disabled={busy}
            value={m.role}
            onChange={(e) => onChangeRole(m.id, e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:border-slate-300 focus:outline-none disabled:opacity-50"
            title="Cambiar rol"
          >
            <option value="admin">Admin</option>
            <option value="member">Miembro</option>
          </select>
        )}
        {!isOwner && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onRevoke(m.id, m.name, m.email)}
            title={isDisabled ? 'Ya revocado' : 'Revocar acceso'}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
          >
            {busy && actionLoading === m.id + ':revoke' ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Invite row ────────────────────────────────────────────────────────────────

function InviteRow({
  member: m,
  actionLoading,
  onRevoke,
}: {
  member: Member;
  actionLoading: string | null;
  onRevoke: (id: string, name: string | null, email: string) => void;
}) {
  const busy = actionLoading?.startsWith(m.id);
  const expired = m.inviteExpiresAt ? new Date(m.inviteExpiresAt) < new Date() : false;

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-600">
        {initials(m.name, m.email)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-700">{m.email}</span>
          {expired && (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
              Expirada
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400">
          {m.invitedBy
            ? `Invitado por ${m.invitedBy.name ?? m.invitedBy.email}`
            : 'Invitado desde admin'}{' '}
          · {fmtDate(m.createdAt)}
        </div>
      </div>

      <div className="shrink-0">
        <RoleBadge role={m.role} />
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => onRevoke(m.id, null, m.email)}
        title="Cancelar invitación"
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
      </button>
    </div>
  );
}
