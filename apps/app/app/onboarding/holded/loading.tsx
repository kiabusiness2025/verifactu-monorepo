'use client';

import Image from 'next/image';

function SkeletonLine({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) {
  return (
    <div
      className={`${width} ${height} rounded-full bg-[linear-gradient(90deg,#e2e8f0_25%,#f1f5f9_50%,#e2e8f0_75%)] bg-[length:200%_100%] animate-shimmer`}
    />
  );
}

export default function HoldedOnboardingLoading() {
  return (
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_45%,#eef2ff_100%)] text-slate-950">
      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-12">
        <div className="absolute left-[-6rem] top-[-4rem] h-56 w-56 rounded-full bg-[#ff5460]/10 blur-3xl" />
        <div className="absolute right-[-4rem] bottom-[-5rem] h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative w-full max-w-3xl animate-fade-in rounded-[30px] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-10">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-3">
            <Image
              src="/brand/holded/holded-diamond-red.png"
              alt="Holded"
              width={20}
              height={20}
              className="h-5 w-5 rounded-md"
            />
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Holded
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
              ChatGPT
            </span>
          </div>

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

          {/* Progress bar */}
          <div className="mt-8 flex items-center gap-4">
            <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-1/2 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-[#ff5460]/70" />
            </div>
            <span className="text-sm font-medium text-slate-400">Preparando tu sesión...</span>
          </div>

          {/* Step indicators skeleton */}
          <div className="mt-8 grid grid-cols-3 gap-3 border-t border-slate-100 pt-8">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="h-8 w-8 rounded-full bg-[linear-gradient(90deg,#e2e8f0_25%,#f1f5f9_50%,#e2e8f0_75%)] bg-[length:200%_100%] animate-shimmer" />
                <SkeletonLine width="w-3/4" height="h-3" />
                <SkeletonLine width="w-full" height="h-3" />
                <SkeletonLine width="w-2/3" height="h-3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
