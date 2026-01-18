"use client";

import { useRemoteConfig, useFeatureFlag, useMaintenanceMode } from "@/hooks/useRemoteConfig";

export function RemoteConfigDemo() {
  const { isLoading, lastFetchTime, refresh, getString, getNumber } = useRemoteConfig();
  
  // Feature flags
  const isaakChatEnabled = useFeatureFlag("feature_isaak_chat");
  const newDashboardEnabled = useFeatureFlag("feature_new_dashboard");
  
  // Maintenance mode
  const maintenance = useMaintenanceMode();
  
  // UI Config
  const primaryColor = getString("ui_theme_primary_color");
  const maxCompanies = getNumber("ui_max_companies");
  
  // Business logic
  const freeInvoicesLimit = getNumber("pricing_free_invoices_limit");
  const trialDays = getNumber("pricing_trial_days");

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Maintenance mode alert */}
      {maintenance.enabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-amber-900">Modo de mantenimiento</h3>
              <p className="text-sm text-amber-800">{maintenance.message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Firebase Remote Config</h2>
          <button
            onClick={refresh}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            🔄 Actualizar
          </button>
        </div>

        {lastFetchTime && (
          <p className="text-xs text-slate-500 mb-4">
            Última actualización: {new Date(lastFetchTime).toLocaleString('es-ES')}
          </p>
        )}

        <div className="space-y-4">
          {/* Feature Flags */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">🚀 Feature Flags</h3>
            <div className="space-y-2">
              <FeatureRow label="Isaak Chat" enabled={isaakChatEnabled} />
              <FeatureRow label="Nuevo Dashboard" enabled={newDashboardEnabled} />
            </div>
          </div>

          {/* UI Configuration */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">🎨 UI Configuration</h3>
            <div className="space-y-2">
              <ConfigRow label="Color primario" value={primaryColor}>
                <div 
                  className="h-6 w-6 rounded border border-slate-200"
                  style={{ backgroundColor: primaryColor }}
                />
              </ConfigRow>
              <ConfigRow label="Máx. empresas" value={maxCompanies.toString()} />
            </div>
          </div>

          {/* Business Logic */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">💼 Business Logic</h3>
            <div className="space-y-2">
              <ConfigRow label="Facturas gratis" value={`${freeInvoicesLimit} facturas`} />
              <ConfigRow label="Días de prueba" value={`${trialDays} días`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
        enabled 
          ? "bg-emerald-100 text-emerald-700" 
          : "bg-slate-200 text-slate-600"
      }`}>
        {enabled ? "✓ Activo" : "✗ Inactivo"}
      </span>
    </div>
  );
}

function ConfigRow({ 
  label, 
  value, 
  children 
}: { 
  label: string; 
  value: string; 
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex items-center gap-2">
        {children}
        <span className="text-sm font-medium text-slate-900">{value}</span>
      </div>
    </div>
  );
}
