'use client';

import Image from 'next/image';

export default function Loading() {
  return (
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_45%,#eef2ff_100%)] text-slate-950">
      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-12">
        <div className="absolute left-[-6rem] top-[-4rem] h-56 w-56 rounded-full bg-[#ff5460]/10 blur-3xl" />
        <div className="absolute right-[-4rem] bottom-[-5rem] h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative w-full max-w-3xl rounded-[30px] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <Image
              src="/brand/holded/holded-diamond-red.png"
              alt="Holded"
              width={20}
              height={20}
              className="h-5 w-5 rounded-md"
            />
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Isaak</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">ChatGPT</span>
          </div>

          <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Cargando una experiencia mas clara para gestionar tu negocio.
          </h2>

          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Estamos preparando Isaak para que el siguiente paso sea sencillo, seguro y mucho mas útil que una pantalla de espera normal.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-1/2 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-slate-950" />
            </div>
            <span className="text-sm font-medium text-slate-500">Preparando contexto, sesión y herramientas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
