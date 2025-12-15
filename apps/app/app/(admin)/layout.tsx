import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Panel administrativo
          </p>
          <h1 className="text-3xl font-bold text-slate-900">verifactu</h1>
          <p className="text-sm text-slate-700">
            Secciones del panel en modo placeholder mientras completamos la migración del
            dashboard.
          </p>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
