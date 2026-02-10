import { prisma } from "@verifactu/db";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function extractMessage(details: unknown) {
  if (details && typeof details === "object" && "message" in details) {
    const msg = (details as { message?: string }).message;
    if (msg) return msg;
  }
  try {
    return JSON.stringify(details);
  } catch {
    return null;
  }
}

type PageProps = {
  searchParams?: Promise<{ type?: string }>;
};

const TYPE_OPTIONS = [
  "all",
  "console_error",
  "runtime_error",
  "broken_image",
  "broken_link",
  "empty_button",
  "slow_load",
  "not_found",
];

export default async function OperationsErrorsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const typeFilterRaw = resolvedSearchParams?.type?.trim();
  const typeFilter =
    typeFilterRaw && typeFilterRaw !== "all" ? typeFilterRaw : null;

  const errors = await prisma.errorEvent.findMany({
    where: typeFilter ? { type: typeFilter } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Errores globales
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Errores reportados desde el monitor de la app (últimos 50).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((type) => {
            const active =
              (type === "all" && !typeFilter) || typeFilter === type;
            const href =
              type === "all"
                ? "/operations/errors"
                : `/operations/errors?type=${encodeURIComponent(type)}`;
            return (
              <a
                key={type}
                href={href}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  active
                    ? "border-slate-900 text-slate-900"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {type === "all" ? "Todos" : type}
              </a>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Fecha</th>
              <th className="px-4 py-3 text-left font-semibold">Tipo</th>
              <th className="px-4 py-3 text-left font-semibold">URL</th>
              <th className="px-4 py-3 text-left font-semibold">Detalle</th>
              <th className="px-4 py-3 text-left font-semibold">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {errors.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  No hay errores registrados todavía.
                </td>
              </tr>
            ) : (
              errors.map((err) => {
                const detail = extractMessage(err.details);
                return (
                  <tr key={err.id} className="align-top">
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {formatDate(err.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{err.type}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-[320px] truncate">
                      {err.url}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[420px]">
                      <div className="truncate">{detail ?? "-"}</div>
                      {err.details ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
                            Ver JSON
                          </summary>
                          <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-100 bg-slate-50 p-2 text-[11px] text-slate-700">
                            {JSON.stringify(err.details, null, 2)}
                          </pre>
                        </details>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{err.source ?? "-"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
