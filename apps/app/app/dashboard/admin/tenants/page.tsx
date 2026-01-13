"use client";

import { useEffect, useMemo, useState } from "react";
import { adminGet, adminPost, adminPatch } from "@/lib/adminApi";

type TenantRow = {
  id: string;
  legalName: string;
  taxId: string;
  status: string;
  membersCount: number;
  invoicesThisMonth: number;
  revenueThisMonth: number;
  createdAt?: string;
};

type TenantsResponse = {
  items: TenantRow[];
  page: number;
  pageSize: number;
  total: number;
};

type TenantForm = {
  legalName: string;
  taxId: string;
  address?: string;
  cnae?: string;
};

type EinformaSearchItem = {
  name: string;
  nif?: string;
  province?: string;
  id?: string;
};

type EinformaCompanyProfile = {
  name: string;
  legalName?: string;
  nif?: string;
  cnae?: string;
  address?: {
    street?: string;
    zip?: string;
    city?: string;
    province?: string;
    country?: string;
  };
};

export default function AdminTenantsPage() {
  const [items, setItems] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<TenantRow | null>(null);
  const [form, setForm] = useState<TenantForm>({
    legalName: "",
    taxId: "",
    address: "",
    cnae: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EinformaSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params.toString();
  }, [search, statusFilter, from, to]);

  function resetEinforma() {
    setSearchQuery("");
    setSearchResults([]);
    setSearchLoading(false);
    setSearchError("");
    setProfileLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await adminGet<TenantsResponse>(
          `/api/admin/tenants?${queryString}`
        );
        if (mounted) setItems(data.items || []);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error al cargar");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [queryString]);

  useEffect(() => {
    if (!showModal) return;
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError("");
      return;
    }

    setSearchLoading(true);
    setSearchError("");
    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/einforma/search?q=${encodeURIComponent(query)}`
        );
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || "Error en la busqueda");
        }
        setSearchResults(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        setSearchResults([]);
        setSearchError(err instanceof Error ? err.message : "Error al buscar");
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchQuery, showModal]);

  function buildAddress(profile: EinformaCompanyProfile) {
    const address = profile.address || {};
    const parts = [
      address.street,
      address.zip,
      address.city,
      address.province,
    ].filter(Boolean);
    return parts.join(", ");
  }

  async function applyEinformaProfile(item: EinformaSearchItem) {
    setSearchError("");
    setSearchResults([]);
    setSearchQuery(item.name || item.nif || "");
    if (!item?.nif) {
      setForm((prev) => ({
        ...prev,
        legalName: item?.name || prev.legalName,
        taxId: "",
      }));
      return;
    }

    setProfileLoading(true);
    try {
      const res = await fetch(
        `/api/admin/einforma/profile?nif=${encodeURIComponent(
          item.nif.toUpperCase()
        )}`
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo cargar la empresa");
      }

      const profile: EinformaCompanyProfile | undefined = data?.profile;
      if (!profile) {
        throw new Error("No se pudo cargar la empresa");
      }

      setForm((prev) => ({
        ...prev,
        legalName: profile.legalName || profile.name || prev.legalName,
        taxId: (profile.nif || item.nif || prev.taxId || "").toUpperCase(),
        address: buildAddress(profile) || prev.address || "",
        cnae: profile.cnae || prev.cnae || "",
      }));
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setProfileLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ legalName: "", taxId: "", address: "", cnae: "" });
    setError("");
    resetEinforma();
    setShowModal(true);
  }

  function openEdit(tenant: TenantRow) {
    setEditing(tenant);
    setForm({
      legalName: tenant.legalName || "",
      taxId: tenant.taxId || "",
      address: "",
      cnae: "",
    });
    setError("");
    resetEinforma();
    setShowModal(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        const res = await adminPatch<{ tenant: TenantRow }>(
          `/api/admin/tenants/${editing.id}`,
          form
        );
        setItems((prev) =>
          prev.map((t) => (t.id === editing.id ? res.tenant : t))
        );
      } else {
        const res = await adminPost<{ tenant: TenantRow }>(
          "/api/admin/tenants",
          form
        );
        setItems((prev) => [res.tenant, ...prev]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function setActiveTenant(tenantId: string) {
    try {
      await adminPost(`/api/admin/tenants/${tenantId}/set-active`, {});
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo activar");
    }
  }

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Empresas</h1>
          <p className="text-sm text-slate-600">
            {items.length} empresas en la vista actual
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          + Crear empresa
        </button>
      </header>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por CIF o nombre"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">Estado: todos</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Cargando empresas...
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
                <th className="px-4 py-3">Razon social</th>
                <th className="px-4 py-3">CIF</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Facturas mes</th>
                <th className="px-4 py-3 text-right">Ingresos mes</th>
                <th className="px-4 py-3 text-right">Miembros</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {tenant.legalName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{tenant.taxId}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {tenant.status || "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {tenant.invoicesThisMonth}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {tenant.revenueThisMonth.toLocaleString()} EUR
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {tenant.membersCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setActiveTenant(tenant.id)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Activar
                      </button>
                      <button
                        onClick={() => openEdit(tenant)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={7}>
                    No hay empresas para los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editing ? "Editar empresa" : "Crear empresa"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                X
              </button>
            </div>
            <form onSubmit={onSubmit} className="space-y-4 p-4">
              <div className="space-y-2">
                <label className="block text-sm text-slate-700">
                  Buscar empresa (nombre o CIF)
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Minimo 3 caracteres"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                {searchLoading && (
                  <div className="text-xs text-slate-500">Buscando...</div>
                )}
                {searchError && (
                  <div className="text-xs text-rose-600">{searchError}</div>
                )}
                {searchResults.length > 0 && (
                  <div className="max-h-48 overflow-auto rounded-lg border border-slate-200 text-sm">
                    {searchResults.map((item) => (
                      <button
                        key={`${item.nif || item.id || item.name}`}
                        type="button"
                        onClick={() => applyEinformaProfile(item)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <span className="font-medium text-slate-900">
                          {item.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {item.nif || item.province || "Sin CIF"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {profileLoading && (
                  <div className="text-xs text-slate-500">
                    Cargando datos de empresa...
                  </div>
                )}
              </div>
              <label className="block text-sm text-slate-700">
                Razon social *
                <input
                  required
                  value={form.legalName}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, legalName: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-slate-700">
                CIF *
                <input
                  required
                  value={form.taxId}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, taxId: e.target.value.toUpperCase() }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-slate-700">
                Direccion
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, address: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-slate-700">
                CNAE
                <input
                  value={form.cnae}
                  onChange={(e) => setForm((v) => ({ ...v, cnae: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
