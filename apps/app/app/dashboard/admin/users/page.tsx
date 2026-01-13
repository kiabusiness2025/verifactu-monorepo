"use client";

import { useEffect, useMemo, useState } from "react";
import { adminGet, type UserRow } from "@/lib/adminApi";

type UsersResponse = {
  users: UserRow[];
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

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

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Usuarios</h1>
        <p className="text-sm text-slate-600">
          Total: {users.length} usuarios registrados
        </p>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((user) => (
                <tr key={user.id}>
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
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
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
