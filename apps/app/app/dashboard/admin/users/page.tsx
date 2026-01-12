"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Mail, Calendar, Building2 } from "lucide-react";

type User = {
  id: string;
  email: string;
  name: string;
  created_at: string;
  tenants: Array<{
    id: string;
    name: string;
    role: string;
  }>;
};

export default function UsersListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Usuarios</h1>
        <p className="text-sm text-gray-600">Total: {users.length} usuarios registrados</p>
      </div>

      {/* KPI */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Usuarios</p>
            <p className="text-3xl font-bold text-gray-900">{users.length}</p>
          </div>
          <Users className="h-12 w-12 text-blue-500" />
        </div>
      </div>

      {/* Búsqueda */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <input
          type="text"
          placeholder="Buscar por email o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Listado */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-8 rounded-lg border border-gray-200 bg-gray-50">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No hay usuarios que mostrar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  </div>

                  {user.name && (
                    <p className="text-sm text-gray-600 ml-6">{user.name}</p>
                  )}

                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 ml-6">
                    <Calendar className="h-3 w-3" />
                    Registrado: {new Date(user.created_at).toLocaleDateString("es-ES")}
                  </div>

                  {/* Empresas asociadas */}
                  {user.tenants.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium text-gray-600 ml-6">Empresas:</p>
                      <div className="ml-6 flex flex-wrap gap-2">
                        {user.tenants.map((tenant) => (
                          <span
                            key={tenant.id}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700"
                          >
                            <Building2 className="h-3 w-3" />
                            {tenant.name}
                            <span className="text-blue-600">({tenant.role})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
