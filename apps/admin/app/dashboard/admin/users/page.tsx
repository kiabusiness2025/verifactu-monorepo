'use client';

import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { TableSkeleton } from '@/components/accessibility/LoadingSkeleton';
import { useToast } from '@/components/notifications/ToastNotifications';
import { adminGet, type UserRow } from '@/lib/adminApi';
import { Ban, Download, Edit, Eye, LogIn, Trash2, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type UsersResponse = {
  users: UserRow[];
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { success, error: showError, warning } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.verifactu.business';

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await adminGet<UsersResponse>('/api/admin/users');
        if (mounted) setUsers(data.users || []);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Error al cargar');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(term) || (u.displayName || '').toLowerCase().includes(term)
    );
  }, [users, search]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await fetch('/api/admin/users/export');
      if (!res.ok) throw new Error('Error al exportar');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usuarios-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      success('Exportación completada', `Archivo descargado: ${a.download}`);
    } catch (error) {
      console.error('Export error:', error);
      showError('Error al exportar', 'No se pudo exportar la lista de usuarios');
    } finally {
      setExporting(false);
    }
  };

  const handleImpersonate = async (userId: string, email: string, tenants: UserRow['tenants']) => {
    if (!confirm(`¿Abrir el panel de ${email}?`)) return;

    const primaryTenantId = tenants?.[0]?.tenantId;
    if (!primaryTenantId) {
      showError('Sin empresa', 'Este usuario no tiene empresas asignadas todavía');
      return;
    }

    try {
      const res = await fetch('/api/admin/support-sessions/start', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: primaryTenantId, userId, reason: 'support' }),
      });

      if (res.ok) {
        const result = await res.json();
        const token = result.handoffToken as string;
        const url = `${appUrl}/support/handoff?token=${encodeURIComponent(token)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        success('Acceso iniciado', `Panel abierto para ${email}`);
      } else {
        const errorData = await res.json().catch(() => ({}));
        showError(
          'Error de acceso',
          errorData.error || 'No se pudo abrir el panel de este usuario'
        );
      }
    } catch (error) {
      console.error('Support handoff error:', error);
      showError('Error de acceso', 'No se pudo abrir el panel de este usuario');
    }
  };

  const handleCreateUser = () => {
    // TODO: Implementar modal o página de creación
    warning('Función en desarrollo', 'Esta funcionalidad estará disponible próximamente');
  };

  const handleEditUser = (userId: string) => {
    // TODO: Implementar modal o página de edición
    warning('Función en desarrollo', 'La edición de usuarios estará disponible próximamente');
  };

  const handleBlockUser = async (userId: string, email: string) => {
    // TODO: Implementar API de bloqueo
    if (!confirm(`¿Bloquear temporalmente a ${email}?`)) return;
    warning('Función en desarrollo', 'El bloqueo de usuarios estará disponible próximamente');
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`⚠️ ¿ELIMINAR permanentemente a ${email}?\n\nEsta acción no se puede deshacer.`))
      return;
    // TODO: Implementar API de eliminación
    warning('Función en desarrollo', 'La eliminación de usuarios estará disponible próximamente');
  };

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-600">Total: {users.length} usuarios registrados</p>
        </div>

        <div className="flex items-center gap-2">
          <AccessibleButton
            onClick={handleCreateUser}
            variant="primary"
            icon={<UserPlus className="h-4 w-4" />}
            ariaLabel="Crear nuevo usuario"
          >
            Crear Usuario
          </AccessibleButton>
          <AccessibleButton
            onClick={handleExport}
            loading={exporting}
            disabled={exporting}
            variant="secondary"
            icon={<Download className="h-4 w-4" />}
            ariaLabel="Exportar lista de usuarios a CSV"
          >
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </AccessibleButton>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email o nombre..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <TableSkeleton rows={10} columns={5} />
      ) : error ? (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          role="alert"
        >
          {error}
        </div>
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {filtered.map((user) => (
              <div
                key={user.id}
                className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {user.displayName || 'Usuario'}
                    </div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-600">
                    {user.tenants[0]?.role || 'Sin rol'}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>Empresas: {user.tenants.length}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
                    className="flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    title="Ver ficha completa"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleEditUser(user.id)}
                    className="flex items-center justify-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    title="Editar usuario"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleBlockUser(user.id, user.email)}
                    className="flex items-center justify-center gap-1 rounded-lg border border-orange-300 bg-orange-50 px-2 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                    title="Bloquear temporalmente"
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id, user.email)}
                    className="flex items-center justify-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                    title="Eliminar permanentemente"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleImpersonate(user.id, user.email, user.tenants)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#0b6cfb] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0a5be0]"
                    title="Abrir panel"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    Abrir panel
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                No hay usuarios para la busqueda actual.
              </div>
            )}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Empresas</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{user.email}</td>
                    <td className="px-4 py-3 text-slate-600">{user.displayName || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{user.tenants.length}</td>
                    <td className="px-4 py-3 text-slate-600">{user.tenants[0]?.role || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
                          className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          title="Ver ficha completa"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleEditUser(user.id)}
                          className="flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          title="Editar usuario"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleBlockUser(user.id, user.email)}
                          className="flex items-center gap-1 rounded-lg border border-orange-300 bg-orange-50 px-2 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                          title="Bloquear temporalmente"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                          title="Eliminar permanentemente"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleImpersonate(user.id, user.email, user.tenants)}
                          className="flex items-center gap-1 rounded-lg bg-[#0b6cfb] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0a5be0]"
                          title="Abrir panel"
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          Abrir panel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                      No hay usuarios para la busqueda actual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
