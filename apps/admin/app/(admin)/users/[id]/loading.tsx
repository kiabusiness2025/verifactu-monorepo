export default function UserDetailLoading() {
  return (
    <main className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-6 w-32 animate-pulse rounded-full bg-slate-100" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
            <div className="mb-3 h-4 w-28 animate-pulse rounded bg-slate-100" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 border-b border-slate-100 py-2.5">
                <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-48 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>

          {/* Memberships */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
            <div className="mb-3 h-4 w-24 animate-pulse rounded bg-slate-100" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-slate-100 py-3">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-16 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
            <div className="mb-3 h-4 w-20 animate-pulse rounded bg-slate-100" />
            <div className="h-9 w-full animate-pulse rounded-xl bg-slate-100" />
            <div className="mt-2 h-9 w-full animate-pulse rounded-xl bg-slate-100" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
            <div className="mb-3 h-4 w-28 animate-pulse rounded bg-slate-100" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1 border-b border-slate-100 py-2.5">
                <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
