import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de cookies | Verifactu Business",
  description:
    "Información sobre el uso de cookies en Verifactu Business.",
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50/70 via-white to-white">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0060F0] hover:text-[#0080F0]"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-4xl font-bold text-[#002060]">Política de cookies</h1>
        <p className="mt-4 text-lg text-slate-600">
          Usamos cookies para mejorar tu experiencia y para analítica básica del
          uso del sitio.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#002060]">
          1. Qué son las cookies
        </h2>
        <p className="mt-3 text-slate-600">
          Son pequeños archivos que se guardan en tu navegador para recordar
          preferencias o medir el uso.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#002060]">
          2. Tipos de cookies
        </h2>
        <ul className="mt-3 list-disc pl-6 text-slate-600">
          <li>Necesarias para el funcionamiento básico.</li>
          <li>Analíticas para entender el uso del sitio.</li>
        </ul>

        <h2 className="mt-10 text-2xl font-semibold text-[#002060]">
          3. Cómo gestionar cookies
        </h2>
        <p className="mt-3 text-slate-600">
          Puedes configurar tu navegador para bloquear o borrar cookies. Ten en
          cuenta que algunas funciones pueden dejar de funcionar.
        </p>
      </section>
    </main>
  );
}
