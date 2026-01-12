"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-slate-800">
      <h2 className="text-2xl font-bold mb-4">¡Vaya! Algo salió mal.</h2>
      <p className="mb-6">Ha ocurrido un error inesperado. Puedes intentar recargar la página.</p>
      <button
        className="rounded-full bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-[#0056D6] hover:to-[#1AA3DB]"
        onClick={() => reset()}
      >
        Reintentar
      </button>
    </div>
  );
}
