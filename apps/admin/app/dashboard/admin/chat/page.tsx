"use client";

import { AdminChat } from "@/components/admin/AdminChat";

export default function AdminChatPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Chat con Isaak
        </h2>
        <p className="text-sm text-slate-600">
          Asistente de administración con acceso a integraciones de Vercel y despliegues
        </p>
      </div>

      <AdminChat />
    </div>
  );
}
