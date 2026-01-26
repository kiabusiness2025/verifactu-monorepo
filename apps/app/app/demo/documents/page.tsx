"use client";

import { DemoLockedButton } from "@/components/demo/DemoLockedButton";
import { getDocuments } from "@/src/lib/data/client";
import { formatShortDate } from "@/src/lib/formatters";

export default function DemoDocumentsPage() {
  const documents = getDocuments("demo");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">Documentos demo</h1>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              Solo lectura
            </span>
          </div>
          <DemoLockedButton
            className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400"
            toastMessage="Disponible al activar tu prueba"
          >
            Subir documento
          </DemoLockedButton>
        </div>
        <p className="text-xs text-slate-500">
          Archivos simulados para mostrar orden y trazabilidad documental.
        </p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{doc.type}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{doc.name}</td>
                  <td className="px-4 py-3 text-slate-600">{formatShortDate(doc.date)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ring-1 ${
                        doc.status === "valid"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          : doc.status === "pending"
                            ? "bg-amber-50 text-amber-700 ring-amber-100"
                            : "bg-slate-100 text-slate-600 ring-slate-200"
                      }`}
                    >
                      {doc.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
