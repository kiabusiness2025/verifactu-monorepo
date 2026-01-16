"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminGet, type UserRow } from "@/lib/adminApi";
import { Eye, Download, LogIn } from "lucide-react";

type UsersResponse = {
  users: UserRow[];
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await adminGet<UsersResponse>("/api/admin/users");
        if (mounted) setUsers(data.users || []);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Error al cargar");
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
        u.email.toLowerCase().includes(term) ||
        (u.displayName || "").toLowerCase().includes(term)
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
    } catch (error) {
      console.error('Export error:', error);
      alert('Error al exportar usuarios');
    } finally {
      setExporting(false);
    }
  };

  const handleImpersonate = async (userId: string, email: string) => {
    if (!confirm(`¿Entrar al dashboard como ${email}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/impersonate`, {
        method: 'POST'
      });
      
      if (res.ok) {
        window.location.href = '/dashboard';
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Impersonation error:', error);
      alert('Error al intentar entrar como usuario');
    }
  };

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-600">
            Total: {users.length} usuarios registrados
          </p>
        </div>
        
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-green-400"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exportando...' : 'Exportar a Excel'}
        </button>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email o nombre..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Cargando usuarios...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                  <td className="px-4 py-3 text-slate-600">
                    {user.displayName || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {user.tenants.length}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {user.tenants[0]?.role || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
                        className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        title="Ver ficha completa"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </button>
                      <button
                        onClick={() => handleImpersonate(user.id, user.email)}
                        className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        title="Entrar como usuario"
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        Entrar
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
      )}
    </main>
  );
}
