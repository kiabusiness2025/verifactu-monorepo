function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />;
}

export default function PanelLoading() {
  return (
    <main className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Pulse className="h-3 w-32" />
          <Pulse className="h-6 w-56" />
        </div>
        <Pulse className="h-6 w-32" />
      </div>

      {/* ConnectorsPanelWidget skeleton */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="space-y-1.5">
            <Pulse className="h-4 w-44" />
            <Pulse className="h-3 w-56" />
          </div>
          <Pulse className="h-7 w-24 rounded-full" />
        </div>
        <div className="space-y-6 p-5">
          {/* Channel cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <Pulse className="h-3 w-20" />
                <Pulse className="mt-2 h-7 w-14" />
                <Pulse className="mt-1.5 h-2.5 w-24" />
              </div>
            ))}
          </div>
          {/* Chart */}
          <div className="flex h-44 items-end gap-[3px]">
            {[...Array(14)].map((_, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end">
                <Pulse
                  className={`w-full rounded-t ${['h-16', 'h-10', 'h-20', 'h-8', 'h-24', 'h-14', 'h-18', 'h-12', 'h-20', 'h-16', 'h-10', 'h-22', 'h-8', 'h-14'][i]}`}
                />
                <div className="mt-1.5 h-2 w-6 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1.5 text-center">
                <Pulse className="mx-auto h-6 w-12" />
                <Pulse className="mx-auto h-2.5 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <Pulse className="h-2.5 w-20" />
            <Pulse className="mt-3 h-8 w-14" />
            <Pulse className="mt-2 h-2.5 w-28" />
          </div>
        ))}
      </div>
    </main>
  );
}
