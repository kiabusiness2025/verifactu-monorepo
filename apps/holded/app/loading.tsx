'use client';

function SkeletonLine({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) {
  return (
    <div
      className={`${width} ${height} rounded-full bg-[linear-gradient(90deg,#f1e6e7_25%,#fdf4f4_50%,#f1e6e7_75%)] bg-[length:200%_100%] animate-shimmer`}
    />
  );
}

export default function HoldedLoading() {
  return (
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_45%,#ffffff_100%)] text-slate-950">
      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-12">
        <div className="absolute left-[-6rem] top-[-4rem] h-56 w-56 rounded-full bg-[#ff5460]/10 blur-3xl" />
        <div className="absolute right-[-4rem] bottom-[-5rem] h-64 w-64 rounded-full bg-[#ff5460]/5 blur-3xl" />

        <div className="relative w-full max-w-3xl animate-fade-in rounded-[30px] border border-[#ff5460]/10 bg-white/90 p-8 shadow-[0_20px_70px_rgba(255,84,96,0.07)] sm:p-10">
          {/* Header badge skeleton */}
          <div className="h-6 w-36 rounded-full bg-[linear-gradient(90deg,#fde8ea_25%,#fff1f2_50%,#fde8ea_75%)] bg-[length:200%_100%] animate-shimmer" />

          {/* Title skeleton */}
          <div className="mt-6 space-y-3">
            <SkeletonLine width="w-4/5" height="h-7" />
            <SkeletonLine width="w-3/5" height="h-7" />
          </div>

          {/* Body skeleton */}
          <div className="mt-5 space-y-2.5">
            <SkeletonLine width="w-full" height="h-4" />
            <SkeletonLine width="w-11/12" height="h-4" />
            <SkeletonLine width="w-3/4" height="h-4" />
          </div>

          {/* CTA skeleton */}
          <div className="mt-8 flex gap-3">
            <div className="h-11 w-36 rounded-full bg-[linear-gradient(90deg,#ffced1_25%,#fde8ea_50%,#ffced1_75%)] bg-[length:200%_100%] animate-shimmer" />
            <div className="h-11 w-28 rounded-full bg-[linear-gradient(90deg,#e2e8f0_25%,#f1f5f9_50%,#e2e8f0_75%)] bg-[length:200%_100%] animate-shimmer" />
          </div>

          {/* Progress indicator */}
          <div className="mt-8 flex items-center gap-4 border-t border-slate-100 pt-6">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-[#ff5460]/10">
              <div className="h-full w-1/2 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-[#ff5460]/60" />
            </div>
            <span className="text-sm font-medium text-slate-400">Cargando...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
