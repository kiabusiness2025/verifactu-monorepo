function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

export default function TenantsLoading() {
  return (
    <main className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5">
        <Pulse className="h-7 w-52 rounded-xl" />
        <Pulse className="mt-2 h-3.5 w-80 rounded-xl" />
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Pulse className="h-2.5 w-28" />
                <Pulse className="h-8 w-16 rounded-xl" />
              </div>
              <Pulse className="h-10 w-10 shrink-0 rounded-2xl" />
            </div>
            <Pulse className="mt-3 h-2.5 w-36" />
          </div>
        ))}
      </div>

      {/* Search */}
      <Pulse className="h-12 w-full rounded-2xl" />

      {/* Tenant list */}
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Pulse className="h-10 w-10 shrink-0 rounded-2xl" />
                <div className="space-y-1.5">
                  <Pulse className="h-4 w-48" />
                  <Pulse className="h-3 w-32" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Pulse className="h-6 w-20 rounded-full" />
                <Pulse className="h-8 w-24 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
