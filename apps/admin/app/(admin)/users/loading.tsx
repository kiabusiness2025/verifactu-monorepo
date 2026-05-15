function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

export default function UsersLoading() {
  return (
    <main className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="space-y-1.5">
        <Pulse className="h-7 w-28" />
        <Pulse className="h-3.5 w-44" />
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <Pulse className="h-10 flex-1 rounded-xl" />
        <Pulse className="h-10 w-40 rounded-xl" />
        <Pulse className="h-10 w-24 rounded-xl" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* Header row */}
        <div className="grid grid-cols-4 gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3">
          {['w-20', 'w-16', 'w-14', 'w-16'].map((w, i) => (
            <Pulse key={i} className={`h-2.5 ${w}`} />
          ))}
        </div>
        {/* Data rows */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-4 gap-4 border-b border-slate-100 px-4 py-3 last:border-0"
          >
            <div className="space-y-1.5">
              <Pulse className="h-3.5 w-44" />
              <Pulse className="h-2.5 w-28" />
            </div>
            <div className="flex gap-1.5">
              <Pulse className="h-5 w-24 rounded-lg" />
            </div>
            <div className="flex items-center gap-1.5">
              <Pulse className="h-2 w-2 rounded-full" />
              <Pulse className="h-2.5 w-16" />
            </div>
            <div className="flex justify-end">
              <Pulse className="h-2.5 w-24" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
