"use client";

import { AccessibleButton } from "@/components/accessibility/AccessibleButton";
import { AccessibleInput } from "@/components/accessibility/AccessibleFormInputs";
import { TableSkeleton } from "@/components/accessibility/LoadingSkeleton";
import { useToast } from "@/components/notifications/ToastNotifications";
import { adminGet, adminPatch, adminPost } from "@/lib/adminApi";
import { formatCurrency, formatShortDate } from "@/src/lib/formatters";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
  legalForm?: string;
  status?: string;
  website?: string;
  capitalSocial?: number | string;
  constitutionDate?: string;
  raw?: unknown;
};

type EinformaNormalized = {
  name?: string | null;
  legalName?: string | null;
  nif?: string | null;
  address?: string | null;
  province?: string | null;
  country?: string | null;
  cnaeCode?: string | null;
  cnaeText?: string | null;
  postalCode?: string | null;
  city?: string | null;
  sourceId?: string | null;
};

function normalizeText(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function queryTokens(query: string) {
  return normalizeText(query)
    .split(/[\s_]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function matchesAllTokensInOrder(target: string, tokens: string[]) {
  let cursor = 0;
  for (const token of tokens) {
    const idx = target.indexOf(token, cursor);
    if (idx === -1) return false;
    cursor = idx + token.length;
  }
  return true;
}

function matchesAllTokens(name: string, nif: string, tokens: string[]) {
  return tokens.every((token) => name.includes(token) || (nif && nif.includes(token)));
}

function searchScore(item: EinformaSearchItem, query: string) {
  const q = normalizeText(query);
  const tokens = queryTokens(query);
  const name = normalizeText(item.name);
  const nif = normalizeText(item.nif);
  if (!q) return 999;
  if (tokens.length >= 2) {
    if (name === q) return 0;
    if (name.startsWith(q)) return 1;
    if (name.includes(q)) return 2;
    if (matchesAllTokensInOrder(name, tokens)) return 3;
    if (matchesAllTokens(name, nif, tokens)) return 4;
    return 999;
  }
  if (nif && nif === q) return 0;
  if (name === q) return 1;
  if (name.startsWith(q)) return 2;
  if (name.includes(` ${q}`)) return 3;
  if (name.includes(q)) return 4;
  if (nif && nif.startsWith(q)) return 5;
  return 999;
}

export default function AdminTenantsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { success, error: showError } = useToast();
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
  const [selectedProfile, setSelectedProfile] = useState<EinformaCompanyProfile | null>(null);
  const [selectedNormalized, setSelectedNormalized] = useState<EinformaNormalized | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EinformaSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const skipNextSearchRef = useRef(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.verifactu.business";

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
    setSelectedProfile(null);
    setSelectedNormalized(null);
  }

  function readCurrentParams() {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }

  function replaceWithParams(params: URLSearchParams) {
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await adminGet<TenantsResponse>(`/api/admin/tenants?${queryString}`);
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
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
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
        const res = await fetch(`/api/admin/einforma/search?q=${encodeURIComponent(query)}`);
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error("No se pudo realizar la búsqueda");
        }
        const items = Array.isArray(data?.items) ? data.items : [];
        const sorted = [...items]
          .map((item, index) => ({ item, index }))
          .sort((a, b) => {
            const byScore = searchScore(a.item, query) - searchScore(b.item, query);
            if (byScore !== 0) return byScore;
            return a.index - b.index;
          })
          .map(({ item }) => item);
        const tokens = queryTokens(query);
        const strict = tokens.length >= 2;
        const filtered = strict
          ? sorted.filter((item) =>
              matchesAllTokens(normalizeText(item.name), normalizeText(item.nif), tokens)
            )
          : sorted;
        setSearchResults(filtered);
      } catch (err) {
        setSearchResults([]);
        setSearchError("No se pudo realizar la búsqueda");
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchQuery, showModal]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shouldOpenCreate = new URLSearchParams(window.location.search).get("create") === "1";
    if (!shouldOpenCreate || showModal) return;
    setEditing(null);
    setError("");
    resetEinforma();
    setShowModal(true);
  }, [showModal]);

  async function applyEinformaProfile(item: EinformaSearchItem) {
    setSearchError("");
    setSearchResults([]);
    skipNextSearchRef.current = true;
    setSearchQuery(item.name || item.nif || "");
    const candidateKeys = [item?.nif, item?.id]
      .map((value) => String(value ?? "").trim())
      .filter((value, index, arr) => value.length > 0 && arr.indexOf(value) === index);
    if (candidateKeys.length === 0) {
      setSelectedProfile({ name: item?.name || "", nif: "" });
      setSelectedNormalized({
        name: item?.name || null,
        legalName: item?.name || null,
        nif: null,
      });
      return;
    }

    setProfileLoading(true);
    try {
      let data: any = null;
      let fetched = false;
      for (const key of candidateKeys) {
        const res = await fetch(`/api/admin/einforma/profile?nif=${encodeURIComponent(key)}`);
        const json = await res.json().catch(() => null);
        if (res.ok && json?.profile) {
          data = json;
          fetched = true;
          break;
        }
      }
      if (!fetched) throw new Error("No se pudo cargar la empresa seleccionada");

      const profile: EinformaCompanyProfile | undefined = data?.profile;
      const normalized: EinformaNormalized | undefined = data?.normalized;
      if (!profile) {
        throw new Error("No se pudo cargar la empresa seleccionada");
      }

      setSelectedProfile(profile);
      setSelectedNormalized(
        normalized || {
          name: profile.legalName || profile.name || null,
          legalName: profile.legalName || null,
          nif: (profile.nif || item.nif || "").toUpperCase(),
          address: profile.address?.street || null,
          province: profile.address?.province || null,
          country: profile.address?.country || 'ES',
          cnaeCode: null,
          cnaeText: null,
          postalCode: profile.address?.zip || null,
          city: profile.address?.city || null,
          sourceId: item.id || null,
        }
      );
    } catch (err) {
      setSearchError("No se pudieron recuperar los datos de la empresa");
    } finally {
      setProfileLoading(false);
    }
  }

  function openIsaakAssistance() {
    const context = [
      "Ayuda con búsqueda de empresa en Admin > Empresas.",
      `Consulta: ${searchQuery || "(vacía)"}`,
      `Razón social: ${selectedNormalized?.legalName || selectedNormalized?.name || "(sin selección)"}`,
      `CIF/NIF: ${selectedNormalized?.nif || "(no disponible)"}`,
      `sourceId: ${selectedNormalized?.sourceId || "(no disponible)"}`,
    ].join(" | ");
    router.push(`/dashboard/admin/chat?context=${encodeURIComponent(context)}`);
  }

  function openCreate() {
    setEditing(null);
    setError("");
    resetEinforma();
    setShowModal(true);
    const params = readCurrentParams();
    params.set("create", "1");
    replaceWithParams(params);
  }

  function openEdit(tenant: TenantRow) {
    setEditing(tenant);
    setError("");
    resetEinforma();
    setShowModal(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedNormalized) {
      setError("Selecciona una empresa en el buscador para continuar.");
      return;
    }
    if (!selectedNormalized.nif) {
      setError("La empresa seleccionada no tiene CIF/NIF válido.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editing) {
        const res = await adminPatch<{ tenant: TenantRow }>(
          `/api/admin/tenants/${editing.id}`,
          {
            source: "einforma",
            normalized: selectedNormalized,
            profile: selectedProfile,
          }
        );
        setItems((prev) => prev.map((t) => (t.id === editing.id ? res.tenant : t)));
      } else {
        const res = await adminPost<{ tenant: TenantRow }>("/api/admin/tenants", {
          source: "einforma",
          normalized: selectedNormalized,
          profile: selectedProfile,
        });
        setItems((prev) => [res.tenant, ...prev]);
      }
      setShowModal(false);
      const params = readCurrentParams();
      params.delete("create");
      replaceWithParams(params);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function setActiveTenant(tenantId: string) {
    try {
      await adminPost(`/api/admin/tenants/${tenantId}/set-active`, {});
      success("Empresa activada correctamente");
    } catch (err) {
      showError(err instanceof Error ? err.message : "No se pudo activar");
    }
  }

  async function toggleTenantStatus(tenant: TenantRow) {
    const isSuspended = (tenant.status || "").toLowerCase() === "suspended";
    const endpoint = isSuspended
      ? `/api/admin/tenants/${tenant.id}/unsuspend`
      : `/api/admin/tenants/${tenant.id}/suspend`;
    try {
      await adminPost(endpoint, {});
      success(isSuspended ? "Empresa activada" : "Empresa suspendida");
      setItems((prev) =>
        prev.map((item) =>
          item.id === tenant.id
            ? { ...item, status: isSuspended ? "active" : "suspended" }
            : item
        )
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    }
  }

  async function startSupportSession(tenant: TenantRow) {
    try {
      const res = await adminPost<{
        handoffToken: string;
        tenantId?: string;
      }>("/api/admin/support-sessions/start", {
        tenantId: tenant.id,
        reason: "support",
      });
      const token = res.handoffToken;
      const url = `${appUrl}/support/handoff?token=${encodeURIComponent(token)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      success("Sesion de soporte iniciada");
    } catch (err) {
      showError(err instanceof Error ? err.message : "No se pudo iniciar soporte");
    }
  }

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Empresas</h1>
          <p className="text-sm text-slate-600">{items.length} empresas en la vista actual</p>
        </div>
        <AccessibleButton onClick={openCreate} ariaLabel="Crear nueva empresa">
          + Crear empresa
        </AccessibleButton>
      </header>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4">
        <AccessibleInput
          label="Buscar"
          showLabel={false}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por CIF o nombre"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">Estado: todos</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <AccessibleInput
          label="Fecha desde"
          showLabel={false}
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <AccessibleInput
          label="Fecha hasta"
          showLabel={false}
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={8} />
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
                <th className="px-4 py-3 text-right">Alta</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{tenant.legalName}</td>
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
                    {formatCurrency(tenant.revenueThisMonth)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{tenant.membersCount}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {tenant.createdAt ? formatShortDate(tenant.createdAt) : "--"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/tenants/${tenant.id}/overview`}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Ver detalle
                      </Link>
                      <AccessibleButton
                        variant="secondary"
                        size="sm"
                        onClick={() => startSupportSession(tenant)}
                        ariaLabel={`Entrar como ${tenant.legalName}`}
                      >
                        Entrar como
                      </AccessibleButton>
                      <AccessibleButton
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveTenant(tenant.id)}
                        ariaLabel={`Seleccionar empresa ${tenant.legalName}`}
                      >
                        Seleccionar
                      </AccessibleButton>
                      <AccessibleButton
                        variant="secondary"
                        size="sm"
                        onClick={() => openEdit(tenant)}
                        ariaLabel={`Editar empresa ${tenant.legalName}`}
                      >
                        Editar
                      </AccessibleButton>
                      <AccessibleButton
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleTenantStatus(tenant)}
                        ariaLabel={`Cambiar estado de ${tenant.legalName}`}
                      >
                        {(tenant.status || "").toLowerCase() === "suspended"
                          ? "Activar"
                          : "Suspender"}
                      </AccessibleButton>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={8}>
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
              <AccessibleButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowModal(false);
                  const params = readCurrentParams();
                  params.delete("create");
                  replaceWithParams(params);
                }}
                ariaLabel="Cerrar modal"
              >
                X
              </AccessibleButton>
            </div>
            <form onSubmit={onSubmit} className="space-y-4 p-4">
              <div className="space-y-2">
                <label className="block text-sm text-slate-700">
                  Buscar empresa (nombre o CIF)
                  <AccessibleInput
                    label="Buscar empresa (nombre o CIF)"
                    showLabel={false}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Minimo 3 caracteres"
                    helperText={searchLoading ? "Buscando..." : undefined}
                    error={searchError || undefined}
                  />
                </label>
                <p className="text-[11px] text-slate-500">
                  Puedes buscar con 1 palabra. Si hay muchos resultados, afina con 2+ palabras o
                  CIF exacto.
                </p>
                {searchResults.length > 0 && (
                  <div className="max-h-48 overflow-auto rounded-lg border border-slate-200 text-sm">
                    {searchResults.map((item) => (
                      <button
                        key={`${item.nif || item.id || item.name}`}
                        type="button"
                        onClick={() => applyEinformaProfile(item)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <span className="font-medium text-slate-900">{item.name}</span>
                        <span className="text-xs text-slate-500">
                          {item.nif || item.province || "Sin CIF"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {profileLoading && (
                  <div className="text-xs text-slate-500">Cargando datos de empresa...</div>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="font-semibold text-slate-900">Datos de empresa</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-slate-500">Razón social</div>
                    <div className="text-slate-900">
                      {selectedNormalized?.legalName || selectedNormalized?.name || "--"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">CIF/NIF</div>
                    <div className="text-slate-900">{selectedNormalized?.nif || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Dirección</div>
                    <div className="text-slate-900">{selectedNormalized?.address || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Ciudad</div>
                    <div className="text-slate-900">{selectedNormalized?.city || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Provincia</div>
                    <div className="text-slate-900">{selectedNormalized?.province || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Código postal</div>
                    <div className="text-slate-900">{selectedNormalized?.postalCode || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">CNAE</div>
                    <div className="text-slate-900">
                      {selectedProfile?.cnae ||
                        [selectedNormalized?.cnaeCode, selectedNormalized?.cnaeText]
                          .filter(Boolean)
                          .join(" - ") ||
                        "--"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Web</div>
                    <div className="text-slate-900">{selectedProfile?.website || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Forma jurídica</div>
                    <div className="text-slate-900">{selectedProfile?.legalForm || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Estado</div>
                    <div className="text-slate-900">{selectedProfile?.status || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Capital social</div>
                    <div className="text-slate-900">
                      {selectedProfile?.capitalSocial ?? "--"}
                    </div>
                  </div>
                </div>
                {!selectedNormalized && (
                  <div className="mt-3 text-xs text-slate-500">
                    Selecciona una empresa en el buscador para completar los datos.
                  </div>
                )}
              </div>
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              )}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">Información sobre herramienta</p>
                <p className="mt-1 text-xs text-slate-600">
                  La búsqueda funciona por nombre o CIF/NIF. Si hay muchos resultados, añade más
                  palabras o usa el CIF/NIF exacto para afinar.
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Los datos mostrados provienen de información pública del Registro Mercantil y se
                  muestran con carácter informativo.
                </p>
                <button
                  type="button"
                  onClick={openIsaakAssistance}
                  className="mt-2 text-xs font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800"
                >
                  No aparece tu empresa en el listado, pulsa aquí
                </button>
                <p className="mt-1 text-[11px] text-slate-500">
                  Isaak te ayudará a localizar la empresa manualmente y, si no se resuelve, se
                  abrirá incidencia de soporte para escalar el caso.
                </p>
              </div>
              <div className="flex gap-2">
                <AccessibleButton
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false);
                    const params = readCurrentParams();
                    params.delete("create");
                    replaceWithParams(params);
                  }}
                  ariaLabel="Cancelar"
                >
                  Cancelar
                </AccessibleButton>
                <AccessibleButton
                  type="submit"
                  loading={saving}
                  disabled={saving}
                  ariaLabel={editing ? "Guardar cambios de empresa" : "Crear empresa"}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </AccessibleButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
