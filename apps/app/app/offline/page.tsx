export default function Offline() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <svg
            className="w-24 h-24 mx-auto text-slate-400"
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
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Sin conexión
        </h1>
        <p className="text-slate-600 mb-6">
          No tienes conexión a internet. Algunas funciones están limitadas mientras estés offline.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-[#0060F0] text-white rounded-lg hover:bg-[#0050D0] transition font-medium"
        >
          Reintentar conexión
        </button>
      </div>
    </div>
  );
}
