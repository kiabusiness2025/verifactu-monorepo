import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-5xl font-extrabold text-blue-700 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Página no encontrada</h2>
        <p className="text-slate-600 mb-6">
          Lo sentimos, la página que buscas no existe o ha sido movida.<br />
          Si crees que es un error, contacta con soporte.
        </p>
        <Link href="/" className="inline-block px-6 py-3 rounded-full bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
