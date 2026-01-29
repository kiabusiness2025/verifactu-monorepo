"use client";

import { useState, useEffect } from "react";
import { Check, X, RefreshCw, ExternalLink, Rocket } from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  status: "connected" | "disconnected" | "error";
  lastSync?: string;
  config?: Record<string, any>;
}

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: "vercel",
      name: "Vercel",
      description: "Gestión de despliegues y deployments",
      status: "connected",
      lastSync: new Date().toISOString(),
      config: {
        teamId: process.env.NEXT_PUBLIC_VERCEL_TEAM_ID || "team_***",
        projectId: process.env.NEXT_PUBLIC_VERCEL_PROJECT_ID || "prj_***",
      },
    },
    {
      id: "resend",
      name: "Resend",
      description: "Servicio de correos transaccionales",
      status: "connected",
      lastSync: new Date().toISOString(),
    },
    {
      id: "firebase",
      name: "Firebase",
      description: "Autenticación y base de datos",
      status: "connected",
      lastSync: new Date().toISOString(),
    },
    {
      id: "openai",
      name: "OpenAI",
      description: "Asistente Isaak con GPT-4",
      status: process.env.OPENAI_API_KEY ? "connected" : "disconnected",
    },
    {
      id: "github",
      name: "GitHub Actions",
      description: "Workflow de auto-fix con Isaak",
      status: "connected",
      lastSync: new Date().toISOString(),
    },
  ]);

  const [loading, setLoading] = useState(false);

  const getStatusColor = (status: Integration["status"]) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-700 border-green-200";
      case "disconnected":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "error":
        return "bg-red-100 text-red-700 border-red-200";
    }
  };

  const getStatusIcon = (status: Integration["status"]) => {
    switch (status) {
      case "connected":
        return <Check className="h-4 w-4" />;
      case "disconnected":
        return <X className="h-4 w-4" />;
      case "error":
        return <X className="h-4 w-4" />;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Integraciones
          </h2>
          <p className="text-sm text-slate-600">
            Gestiona las conexiones con servicios externos
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 1000);
          }}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[#0b6cfb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a5be0] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Verificar todo
        </button>
      </div>

      {/* Integrations Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-900">
                  {integration.name}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {integration.description}
                </p>
              </div>
              <span
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(
                  integration.status
                )}`}
              >
                {getStatusIcon(integration.status)}
                {integration.status === "connected" && "Conectado"}
                {integration.status === "disconnected" && "Desconectado"}
                {integration.status === "error" && "Error"}
              </span>
            </div>

            {integration.lastSync && (
              <div className="text-xs text-slate-500 mb-3">
                Última sincronización: {formatDate(integration.lastSync)}
              </div>
            )}

            {integration.config && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1 mb-3">
                {Object.entries(integration.config).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-slate-600">{key}:</span>
                    <span className="font-mono text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {integration.status === "connected" && (
                <>
                  <button className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Configurar
                  </button>
                  <button className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
                    Desconectar
                  </button>
                </>
              )}
              {integration.status === "disconnected" && (
                <button className="flex-1 rounded-lg bg-[#0b6cfb] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0a5be0]">
                  Conectar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add New Integration */}
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <Rocket className="mx-auto h-12 w-12 text-slate-400 mb-3" />
        <h3 className="font-semibold text-slate-900 mb-2">
          Agregar nueva integración
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Conecta más servicios para expandir las capacidades del sistema
        </p>
        <button className="rounded-lg bg-[#0b6cfb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a5be0]">
          Explorar integraciones
        </button>
      </div>

      {/* Documentation Link */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <ExternalLink className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-blue-900 mb-1">
              Documentación de integraciones
            </p>
            <p className="text-blue-700 mb-2">
              Aprende cómo configurar y gestionar las integraciones disponibles
            </p>
            <a
              href="/docs/integrations"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Ver guías →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
