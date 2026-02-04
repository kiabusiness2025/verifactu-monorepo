"use client";

import { AccessibleButton } from "@/components/accessibility/AccessibleButton";
import { TableSkeleton } from "@/components/accessibility/LoadingSkeleton";
import { useToast } from "@/components/notifications/ToastNotifications";
import { adminGet, adminPost } from "@/lib/adminApi";
import { formatShortDate } from "@/src/lib/formatters";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type TenantData = {
  id: string;
  legalName: string;
  taxId: string;
  address?: string | null;
  cnae?: string | null;
  createdAt?: string;
  status?: string;
};

export default function TenantOverviewPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const { success, error: showError } = useToast();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.verifactu.business";

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await adminGet<{ tenant: TenantData }>(`/api/admin/tenants/${tenantId}`);
        if (mounted) {
          setTenant(data.tenant);
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : "No se pudo cargar el tenant");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [tenantId, showError]);

  async function setActiveTenant() {
    try {
      await adminPost(`/api/admin/tenants/${tenantId}/set-active`, {});
      success("Tenant seleccionado");
    } catch (err) {
      showError(err instanceof Error ? err.message : "No se pudo seleccionar");
    }
  }

  async function startSupportSession() {
    try {
      const res = await adminPost<{ handoffToken: string }>(
        "/api/admin/support-sessions/start",
        {
          tenantId,
          reason: "support",
        }
      );
      const url = `${appUrl}/support/handoff?token=${encodeURIComponent(res.handoffToken)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      success("Sesion de soporte iniciada");
    } catch (err) {
      showError(err instanceof Error ? err.message : "No se pudo iniciar soporte");
    }
  }

  if (loading) {
    return <TableSkeleton rows={4} columns={3} />;
  }

  if (!tenant) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Tenant no encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{tenant.legalName || "Tenant"}</h1>
            <div className="text-xs text-slate-500">{tenant.taxId || "Sin CIF"}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <AccessibleButton variant="secondary" size="sm" onClick={setActiveTenant}>
              Seleccionar
            </AccessibleButton>
            <AccessibleButton variant="secondary" size="sm" onClick={startSupportSession}>
              Entrar como
            </AccessibleButton>
            <Link
              href={`/tenants/${tenantId}/billing`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver billing
            </Link>
            <Link
              href={`/tenants/${tenantId}/integrations`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Integraciones
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="text-xs text-slate-500">Estado</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {tenant.status || "active"}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="text-xs text-slate-500">Alta</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {tenant.createdAt ? formatShortDate(tenant.createdAt) : "--"}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="text-xs text-slate-500">Direccion</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {tenant.address || "Sin direccion"}
          </div>
        </div>
      </div>
    </div>
  );
}
