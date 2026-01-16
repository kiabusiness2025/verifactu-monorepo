"use client";

export default function Offline() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f7fb] via-[#fff4e8] to-[#e8f1ff] px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-sm">
        <div className="mb-5">
          <svg
            className="h-20 w-20 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#0b214a]">
          Sin conexion
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Estas sin internet. Puedes seguir navegando por secciones ya abiertas,
          pero algunas funciones estan limitadas.
        </p>
        <div className="mt-6 flex w-full flex-col gap-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full rounded-lg bg-[#0b6cfb] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0a5be0] transition"
          >
            Reintentar conexion
          </button>
          <a
            href="/dashboard"
            className="w-full rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Volver al dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
