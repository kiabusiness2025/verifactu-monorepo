import type { Metadata } from "next";
import Link from "next/link";
import { getLandingUrl } from "../../lib/urls";

export const metadata: Metadata = {
  title: "Politica de cookies | Verifactu Business",
  description:
    "Informacion sobre el uso de cookies en Verifactu Business.",
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-[#2361d8]/5">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link
            href={getLandingUrl()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#2361d8] hover:text-[#2361d8]"
          >
            Volver al inicio
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-4xl font-bold text-[#2361d8]">Politica de cookies</h1>
        <p className="mt-4 text-lg text-slate-600">
          Usamos cookies para mejorar tu experiencia y para analitica basica del
          uso del sitio.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#2361d8]">
          1. Que son las cookies
        </h2>
        <p className="mt-3 text-slate-600">
          Son pequenos archivos que se guardan en tu navegador para recordar
          preferencias o medir el uso.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#2361d8]">
          2. Tipos de cookies
        </h2>
        <ul className="mt-3 list-disc pl-6 text-slate-600">
          <li>Necesarias para el funcionamiento basico.</li>
          <li>Analiticas para entender el uso del sitio.</li>
          <li>Preferencias para recordar idioma y ajustes de Isaak (si los activas).</li>
        </ul>

        <h2 className="mt-10 text-2xl font-semibold text-[#2361d8]">
          3. Como gestionar cookies
        </h2>
        <p className="mt-3 text-slate-600">
          Puedes configurar tu navegador para bloquear o borrar cookies. Ten en
          cuenta que algunas funciones pueden dejar de funcionar.
        </p>
      </section>
    </main>
  );
}




