"use client";

import { useEffect, useMemo, useState } from "react";
import { AccessibleButton } from "@/components/accessibility/AccessibleButton";
import { TableSkeleton } from "@/components/accessibility/LoadingSkeleton";
import { useToast } from "@/components/notifications/ToastNotifications";
import { adminGet, adminPost } from "@/lib/adminApi";
import { formatShortDate } from "@/src/lib/formatters";

type SupportSessionRow = {
  id: string;
  tenantId: string;
  userId: string;
  adminId: string;
  reason: string;
  startedAt: string;
  endedAt?: string | null;
  tenant?: { id: string; name: string; legalName?: string | null; nif?: string | null };
  user?: { id: string; email?: string | null; name?: string | null };
  admin?: { id: string; email?: string | null; name?: string | null };
};

export default function SupportSessionsPage() {
  const { success, error: showError } = useToast();
  const [items, setItems] = useState<SupportSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.verifactu.business";

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const tenantName = item.tenant?.legalName || item.tenant?.name || "";
      const userEmail = item.user?.email || "";
      const adminEmail = item.admin?.email || "";
      return (
        tenantName.toLowerCase().includes(q) ||
        userEmail.toLowerCase().includes(q) ||
        adminEmail.toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (status !== "all") query.set("status", status);
        const res = await adminGet<{ items: SupportSessionRow[] }>(
          `/api/admin/support-sessions?${query.toString()}`
        );
        if (mounted) setItems(res.items || []);
      } catch (err) {
        if (mounted) {
          showError(err instanceof Error ? err.message : "No se pudieron cargar sesiones");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [status, showError]);

  async function endSession(id: string) {
    try {
      await adminPost("/api/admin/support-sessions/stop", { id });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, endedAt: new Date().toISOString() } : item)));
      success("Sesión finalizada");
    } catch (err) {
      showError(err instanceof Error ? err.message : "No se pudo finalizar");
    }
  }

  async function startSupportSession(tenantId: string, userId: string) {
    try {
      const res = await adminPost<{ handoffToken: string }>("/api/admin/support-sessions/start", {
        tenantId,
        userId,
        reason: "support",
      });
      const url = `${appUrl}/support/handoff?token=${encodeURIComponent(res.handoffToken)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      success("Sesión de soporte iniciada");
    } catch (err) {
      showError(err instanceof Error ? err.message : "No se pudo iniciar soporte");
    }
  }

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Soporte</h1>
          <p className="text-sm text-slate-600">Sesiones de soporte activas y recientes</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="active">Activas</option>
            <option value="ended">Finalizadas</option>
            <option value="all">Todas</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por tenant o email"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </header>

      {loading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Inicio</th>
                <th className="px-4 py-3">Fin</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {item.tenant?.legalName || item.tenant?.name || "Tenant"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.user?.email || item.userId}</td>
                  <td className="px-4 py-3 text-slate-700">{item.admin?.email || item.adminId}</td>
                  <td className="px-4 py-3 text-slate-600">{item.reason || "support"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatShortDate(item.startedAt)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.endedAt ? formatShortDate(item.endedAt) : "Activa"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <AccessibleButton
                        variant="secondary"
                        size="sm"
                        onClick={() => startSupportSession(item.tenantId, item.userId)}
                        ariaLabel="Abrir sesión en cliente"
                      >
                        Abrir cliente
                      </AccessibleButton>
                      {!item.endedAt && (
                        <AccessibleButton
                          variant="secondary"
                          size="sm"
                          onClick={() => endSession(item.id)}
                          ariaLabel="Finalizar sesión de soporte"
                        >
                          Finalizar
                        </AccessibleButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={7}>
                    No hay sesiones con los filtros actuales.
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
