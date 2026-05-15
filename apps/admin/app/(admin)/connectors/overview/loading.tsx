function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

export default function ConnectorsOverviewLoading() {
  return (
    <main className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Pulse className="h-7 w-40 rounded-xl" />
          <Pulse className="h-3.5 w-64" />
        </div>
        <Pulse className="h-8 w-32 rounded-xl" />
      </div>

      {/* Channel summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4">
            <div className="flex items-center gap-2">
              <Pulse className="h-2 w-2 rounded-full" />
              <Pulse className="h-3 w-16" />
            </div>
            <Pulse className="mt-3 h-8 w-16 rounded-xl" />
            <Pulse className="mt-1.5 h-2.5 w-24" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Pulse className="h-2.5 w-2.5 rounded-sm" />
              <Pulse className="h-2.5 w-12" />
            </div>
          ))}
        </div>
        <div className="flex h-48 items-end gap-[3px]">
          {[...Array(30)].map((_, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
              <Pulse
                className={`w-full rounded-t ${['h-12', 'h-8', 'h-16', 'h-6', 'h-20', 'h-10', 'h-14', 'h-18', 'h-8', 'h-24', 'h-12', 'h-16', 'h-10', 'h-6', 'h-20', 'h-14', 'h-8', 'h-18', 'h-12', 'h-22', 'h-8', 'h-14', 'h-10', 'h-20', 'h-6', 'h-16', 'h-12', 'h-18', 'h-8', 'h-14'][i]}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Errors + Top tools */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
          <Pulse className="mb-4 h-3 w-32" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <Pulse className="h-3.5 w-48" />
                  <Pulse className="h-2.5 w-32" />
                </div>
                <Pulse className="h-5 w-16 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
          <Pulse className="mb-4 h-3 w-28" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Pulse className="h-3 w-32 shrink-0" />
                <div className="h-4 flex-1 overflow-hidden rounded bg-slate-50">
                  <Pulse
                    className={`h-full rounded ${['w-4/5', 'w-3/5', 'w-2/3', 'w-1/2', 'w-1/3'][i]}`}
                  />
                </div>
                <Pulse className="h-3 w-6 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
