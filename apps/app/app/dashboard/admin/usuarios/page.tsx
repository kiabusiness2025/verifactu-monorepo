"use client";

import { useState, useEffect } from "react";
import { Users, Search, Shield, Ban, CheckCircle } from "lucide-react";
import { formatShortDate } from "@/src/lib/formatters";

type User = {
  id: string;
  email: string;
  name: string;
  created_at: string;
  tenants: { id: string; name: string; role: string }[];
};

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-600">
            Total: {users.length} usuarios registrados
          </p>
        </div>
      </header>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por email o nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {/* Lista de usuarios */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando usuarios...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No se encontraron usuarios</div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Registrado: {formatShortDate(user.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    title="Ver detalles"
                  >
                    <Shield className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Tenants del usuario */}
              {user.tenants && user.tenants.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Empresas:</p>
                  <div className="flex flex-wrap gap-2">
                    {user.tenants.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                      >
                        {t.name}
                        <span className="text-blue-500">({t.role})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
