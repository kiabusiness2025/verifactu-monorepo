"use client";

import { AccessibleButton } from "@/components/accessibility/AccessibleButton";
import { AccessibleInput } from "@/components/accessibility/AccessibleFormInputs";
import { TableSkeleton } from "@/components/accessibility/LoadingSkeleton";
import { adminGet, adminPatch, adminPost } from "@/lib/adminApi";
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
  email?: string;
  phone?: string;
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
  employees?: number | string;
  sales?: number | string;
  salesYear?: number | string;
  capitalSocial?: number | string;
  constitutionDate?: string;
  lastBalanceDate?: string;
  representatives?: Array<{ name: string; role?: string }>;
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

type EditHistoryEntry = {
  field: string;
  from: string;
  to: string;
  at: string;
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
  const [manualEditMode, setManualEditMode] = useState(false);
  const [editHistory, setEditHistory] = useState<EditHistoryEntry[]>([]);

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
    setManualEditMode(false);
    setEditHistory([]);
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
        const deduped: EinformaSearchItem[] = [];
        const seen = new Set<string>();
        for (const row of filtered) {
          const key = normalizeText(`${row.name ?? ""}|${row.nif ?? ""}|${row.province ?? ""}`);
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(row);
        }
        setSearchResults(deduped);
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
          province: profile.address?.province || item.province || null,
          country: profile.address?.country || 'ES',
          cnaeCode: null,
          cnaeText: null,
          postalCode: profile.address?.zip || null,
          city: profile.address?.city || null,
          sourceId: item.id || null,
        }
      );
      setSelectedNormalized((prev) =>
        prev
          ? {
              ...prev,
              province: prev.province || item.province || null,
            }
          : prev
      );
    } catch (err) {
      setSearchError("No se pudieron recuperar los datos de la empresa");
    } finally {
      setProfileLoading(false);
    }
  }

  function registerEdit(field: string, fromValue: unknown, toValue: unknown) {
    const from = String(fromValue ?? "").trim();
    const to = String(toValue ?? "").trim();
    if (from === to) return;
    setEditHistory((prev) => [...prev, { field, from, to, at: new Date().toISOString() }]);
  }

  function updateNormalizedField<K extends keyof EinformaNormalized>(
    field: K,
    value: EinformaNormalized[K]
  ) {
    setSelectedNormalized((prev) => {
      if (!prev) return prev;
      registerEdit(`normalized.${String(field)}`, prev[field], value);
      return { ...prev, [field]: value };
    });
  }

  function updateProfileField<K extends keyof EinformaCompanyProfile>(
    field: K,
    value: EinformaCompanyProfile[K]
  ) {
    setSelectedProfile((prev) => {
      if (!prev) return prev;
      registerEdit(`profile.${String(field)}`, prev[field], value);
      return { ...prev, [field]: value };
    });
  }

  function updateRepresentativeName(value: string) {
    setSelectedProfile((prev) => {
      if (!prev) return prev;
      const previousName = prev.representatives?.[0]?.name ?? "";
      registerEdit("profile.representative", previousName, value);
      const representatives = [...(prev.representatives ?? [])];
      if (representatives.length === 0) {
        representatives.push({ name: value });
      } else {
        representatives[0] = { ...representatives[0], name: value };
      }
      return { ...prev, representatives };
    });
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
      const adminEditHistory =
        editHistory.length > 0
          ? editHistory.map((entry) => ({ ...entry, source: "admin_companies_modal" }))
          : [];

      if (editing) {
        const res = await adminPatch<{ tenant: TenantRow }>(
          `/api/admin/tenants/${editing.id}`,
          {
            source: "einforma",
            normalized: selectedNormalized,
            profile: selectedProfile,
            adminEditHistory,
          }
        );
        setItems((prev) => prev.map((t) => (t.id === editing.id ? res.tenant : t)));
      } else {
        const res = await adminPost<{ tenant: TenantRow }>("/api/admin/tenants", {
          source: "einforma",
          normalized: selectedNormalized,
          profile: selectedProfile,
          adminEditHistory,
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

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-1">
        <AccessibleInput
          label="Buscar"
          showLabel={false}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por CIF o nombre"
        />
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={3} />
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">CIF</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{tenant.legalName}</td>
                  <td className="px-4 py-3 text-slate-600">{tenant.taxId}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/tenants/${tenant.id}/overview`}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Ver ficha
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={3}>
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
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
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
            <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
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
              <details open className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-slate-900">
                  <span>Datos básicos</span>
                  <span aria-hidden="true" className="text-xs text-slate-500">
                    ▾
                  </span>
                </summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-slate-500">Razón social</div>
                    {manualEditMode ? (
                      <input
                        type="text"
                        value={selectedNormalized?.legalName || selectedNormalized?.name || ""}
                        onChange={(e) => updateNormalizedField("legalName", e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">
                        {selectedNormalized?.legalName || selectedNormalized?.name || "--"}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">CIF/NIF</div>
                    {manualEditMode ? (
                      <input
                        type="text"
                        value={selectedNormalized?.nif || ""}
                        onChange={(e) => updateNormalizedField("nif", e.target.value.toUpperCase())}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">{selectedNormalized?.nif || "--"}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Dirección</div>
                    {manualEditMode ? (
                      <input
                        type="text"
                        value={selectedNormalized?.address || ""}
                        onChange={(e) => updateNormalizedField("address", e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">{selectedNormalized?.address || "--"}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Ciudad</div>
                    {manualEditMode ? (
                      <input
                        type="text"
                        value={selectedNormalized?.city || ""}
                        onChange={(e) => updateNormalizedField("city", e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">{selectedNormalized?.city || "--"}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Provincia</div>
                    {manualEditMode ? (
                      <input
                        type="text"
                        value={selectedNormalized?.province || ""}
                        onChange={(e) => updateNormalizedField("province", e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">{selectedNormalized?.province || "--"}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Código postal</div>
                    {manualEditMode ? (
                      <input
                        type="text"
                        value={selectedNormalized?.postalCode || ""}
                        onChange={(e) => updateNormalizedField("postalCode", e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">{selectedNormalized?.postalCode || "--"}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">CNAE</div>
                    {manualEditMode ? (
                      <input
                        type="text"
                        value={
                          selectedProfile?.cnae ||
                          [selectedNormalized?.cnaeCode, selectedNormalized?.cnaeText]
                            .filter(Boolean)
                            .join(" - ") ||
                          ""
                        }
                        onChange={(e) => updateProfileField("cnae", e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">
                        {selectedProfile?.cnae ||
                          [selectedNormalized?.cnaeCode, selectedNormalized?.cnaeText]
                            .filter(Boolean)
                            .join(" - ") ||
                          "--"}
                      </div>
                    )}
                  </div>
                </div>
              </details>
              <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-slate-900">
                  <span>Datos ampliados</span>
                  <span aria-hidden="true" className="text-xs text-slate-500">
                    ▾
                  </span>
                </summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-slate-500">Web</div>
                    <input
                      type="text"
                      value={selectedProfile?.website || ""}
                      onChange={(e) => updateProfileField("website", e.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Forma jurídica</div>
                    {manualEditMode ? (
                      <input
                        type="text"
                        value={selectedProfile?.legalForm || ""}
                        onChange={(e) => updateProfileField("legalForm", e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">{selectedProfile?.legalForm || "--"}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Estado</div>
                    {manualEditMode ? (
                      <input
                        type="text"
                        value={selectedProfile?.status || ""}
                        onChange={(e) => updateProfileField("status", e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">{selectedProfile?.status || "--"}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Capital social</div>
                    {manualEditMode ? (
                      <input
                        type="text"
                        value={selectedProfile?.capitalSocial != null ? String(selectedProfile.capitalSocial) : ""}
                        onChange={(e) => updateProfileField("capitalSocial", e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">
                        {selectedProfile?.capitalSocial ?? "--"}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Representante / administrador</div>
                    {manualEditMode ? (
                      <input
                        type="text"
                        value={selectedProfile?.representatives?.[0]?.name || ""}
                        onChange={(e) => updateRepresentativeName(e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">
                        {selectedProfile?.representatives?.[0]?.name || "--"}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Email</div>
                    {manualEditMode ? (
                      <input
                        type="text"
                        value={selectedProfile?.email || ""}
                        onChange={(e) => updateProfileField("email", e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">{selectedProfile?.email || "--"}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Teléfono</div>
                    {manualEditMode ? (
                      <input
                        type="text"
                        value={selectedProfile?.phone || ""}
                        onChange={(e) => updateProfileField("phone", e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">{selectedProfile?.phone || "--"}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Empleados</div>
                    {manualEditMode ? (
                      <input
                        type="number"
                        value={selectedProfile?.employees != null ? String(selectedProfile.employees) : ""}
                        onChange={(e) => updateProfileField("employees", e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">{selectedProfile?.employees ?? "--"}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Ventas</div>
                    {manualEditMode ? (
                      <input
                        type="number"
                        value={selectedProfile?.sales != null ? String(selectedProfile.sales) : ""}
                        onChange={(e) => updateProfileField("sales", e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">{selectedProfile?.sales ?? "--"}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Año de ventas</div>
                    {manualEditMode ? (
                      <input
                        type="number"
                        value={selectedProfile?.salesYear != null ? String(selectedProfile.salesYear) : ""}
                        onChange={(e) => updateProfileField("salesYear", e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">{selectedProfile?.salesYear ?? "--"}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Fecha constitución</div>
                    {manualEditMode ? (
                      <input
                        type="date"
                        value={selectedProfile?.constitutionDate || ""}
                        onChange={(e) => updateProfileField("constitutionDate", e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">{selectedProfile?.constitutionDate || "--"}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Fecha último balance</div>
                    {manualEditMode ? (
                      <input
                        type="date"
                        value={selectedProfile?.lastBalanceDate || ""}
                        onChange={(e) => updateProfileField("lastBalanceDate", e.target.value)}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      />
                    ) : (
                      <div className="text-slate-900">{selectedProfile?.lastBalanceDate || "--"}</div>
                    )}
                  </div>
                </div>
              </details>
              {!selectedNormalized && (
                  <div className="mt-3 text-xs text-slate-500">
                    Selecciona una empresa en el buscador para completar los datos.
                  </div>
              )}
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              )}
              <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3">
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
                  ariaLabel={editing ? "Guardar cambios de empresa" : "Guardar empresa"}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </AccessibleButton>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
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
              </div>
              <div className="border-t border-slate-200 p-4">
              <div className="flex flex-wrap gap-2">
                <AccessibleButton
                  type="button"
                  variant="secondary"
                  onClick={() => setManualEditMode((prev) => !prev)}
                  ariaLabel="Activar edición manual"
                >
                  {manualEditMode ? "Cerrar edición manual" : "Algunos datos son incorrectos"}
                </AccessibleButton>
              </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
