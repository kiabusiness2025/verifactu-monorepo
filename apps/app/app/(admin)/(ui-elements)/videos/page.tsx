import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "videos | verifactu",
  description: "Sección en actualización. Próximamente añadiremos el contenido definitivo.",
};

export default function PlaceholderPage() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 shadow-sm">
      <h1 className="mb-3 text-2xl font-semibold text-slate-900">videos</h1>
      <p className="text-sm text-slate-700">
        Estamos preparando esta sección para el nuevo panel fiscal. Mientras tanto puedes
        seguir trabajando con las funcionalidades principales del dashboard.
      </p>
    </div>
  );
}
