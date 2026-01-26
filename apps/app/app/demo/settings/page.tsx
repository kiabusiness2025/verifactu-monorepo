"use client";

import { DemoLockedButton } from "@/components/demo/DemoLockedButton";

export default function DemoSettingsPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">Configuracion demo</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            Solo lectura
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Vista de ajustes simulada para que conozcas el panel.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Empresa</h2>
          <p className="mt-2 text-xs text-slate-500">
            Nombre comercial: Empresa Demo SL
          </p>
          <p className="mt-1 text-xs text-slate-500">NIF: B12345678</p>
          <DemoLockedButton
            className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400"
            toastMessage="Disponible al activar tu prueba"
          >
            Editar datos
          </DemoLockedButton>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Usuarios</h2>
          <p className="mt-2 text-xs text-slate-500">
            Invita a tu equipo para colaborar en facturacion y bancos.
          </p>
          <DemoLockedButton
            className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400"
            toastMessage="Disponible al activar tu prueba"
          >
            Invitar usuario
          </DemoLockedButton>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Integraciones</h2>
          <p className="mt-2 text-xs text-slate-500">
            Conecta bancos, correo y calendario para automatizar tareas.
          </p>
          <DemoLockedButton
            className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400"
            toastMessage="Disponible al activar tu prueba"
          >
            Conectar servicios
          </DemoLockedButton>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Facturacion</h2>
          <p className="mt-2 text-xs text-slate-500">
            Configura series, impuestos y formatos VeriFactu.
          </p>
          <DemoLockedButton
            className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400"
            toastMessage="Disponible al activar tu prueba"
          >
            Ajustar parametros
          </DemoLockedButton>
        </div>
      </section>
    </div>
  );
}
