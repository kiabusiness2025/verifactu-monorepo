function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

export default function ConnectorsLoading() {
  return (
    <main className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Pulse className="h-7 w-32" />
          <Pulse className="h-3.5 w-48" />
        </div>
        <Pulse className="h-8 w-32 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Pulse className="h-10 flex-1 rounded-xl" />
        <Pulse className="h-10 w-40 rounded-xl" />
        <Pulse className="h-10 w-40 rounded-xl" />
        <Pulse className="h-10 w-24 rounded-xl" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-6 gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3">
          {[...Array(6)].map((_, i) => (
            <Pulse key={i} className="h-2.5 w-16" />
          ))}
        </div>
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-6 gap-4 border-b border-slate-100 px-4 py-3 last:border-0"
          >
            <div className="space-y-1.5">
              <Pulse className="h-3.5 w-36" />
              <Pulse className="h-2.5 w-24" />
            </div>
            <Pulse className="h-5 w-20 rounded-full" />
            <Pulse className="h-5 w-24 rounded-full" />
            <Pulse className="h-2.5 w-28" />
            <Pulse className="h-2.5 w-28" />
            <div className="flex justify-end">
              <Pulse className="h-7 w-14 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
