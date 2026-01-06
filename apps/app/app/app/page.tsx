import Image from "next/image";
import IsaakCommandInput from "../../components/dashboard/IsaakCommandInput";
import { getDashboardMvpData } from "../../lib/dashboardMvp";

function formatEur(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function AppDashboardPage() {
  const data = await getDashboardMvpData();

  const sales = data.kpis.salesEur;
  const expenses = data.kpis.expensesEur;
  const profit = data.kpis.profitEur;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/system/logo-horizontal-dark.png"
            alt="Verifactu Business"
            width={160}
            height={32}
            priority
          />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            Resumen
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Hoy, lo importante está aquí.
        </p>
      </div>

      {/* KPIs */}
      <section aria-label="Resumen" className="grid gap-4 md:grid-cols-3">
        <KpiCard title="Ventas" value={formatEur(sales)} />
        <KpiCard title="Gastos" value={formatEur(expenses)} />
        <KpiCard title="Beneficio" value={formatEur(profit)} highlight />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr,1fr]">
        {/* Actividad */}
        <section
          aria-label="Actividad"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Actividad
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-900">
              Últimos movimientos
            </h2>
          </div>

          <div className="mt-4 space-y-3">
            {data.activity.map((item) => (
              <div
                key={`${item.title}-${item.time}`}
                className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500">{item.time}</p>
                </div>
                <span
                  className={
                    item.tone === "ok"
                      ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"
                      : item.tone === "warn"
                      ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200"
                      : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                  }
                >
                  {item.tone === "ok"
                    ? "Listo"
                    : item.tone === "warn"
                    ? "Revisar"
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <IsaakCommandInput />

          {/* Plazos */}
          <section
            aria-label="Plazos"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Plazos
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-900">
              Próximas fechas
            </h2>

            <div className="mt-4 space-y-3">
              {data.deadlines.map((d) => (
                <div
                  key={`${d.name}-${d.dateLabel}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                    <p className="text-xs text-slate-500">Recordatorio automático</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    {d.dateLabel}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function KpiCard({
  title,
  value,
  highlight,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
          : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      }
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
