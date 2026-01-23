import type { Metadata } from "next";
import Link from "next/link";
import { Cookie, Settings, ShieldCheck, Mail } from "lucide-react";
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
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/20">
              <Cookie className="h-4 w-4" />
              Cookies y preferencias
            </div>
            <h1 className="text-4xl font-bold text-[#2361d8]">Politica de cookies</h1>
            <p className="text-lg text-slate-600">
              Usamos cookies para mejorar tu experiencia y para analitica basica del uso del sitio.
            </p>
            <p className="text-sm text-slate-500">Ultima actualizacion: 23 de enero de 2026.</p>
          </div>
          <div className="rounded-2xl border border-[#2361d8]/15 bg-white p-5 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <ShieldCheck className="h-4 w-4" />
              Transparencia
            </div>
            <p className="mt-2">
              Solo usamos cookies necesarias y de analitica basica para mejorar el servicio.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Cookie className="h-4 w-4" />
              Que son las cookies
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Son pequenos archivos que se guardan en tu navegador para recordar preferencias o medir el uso.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Settings className="h-4 w-4" />
              Tipos que usamos
            </div>
            <ul className="mt-2 list-disc pl-6 text-sm text-slate-600">
              <li>Necesarias para el funcionamiento basico.</li>
              <li>Analiticas para entender el uso del sitio.</li>
              <li>Preferencias para recordar idioma y ajustes.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Settings className="h-4 w-4" />
              Gestion
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Puedes configurar tu navegador para bloquear o borrar cookies. Algunas funciones pueden dejar de
              funcionar.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
            <Mail className="h-4 w-4" />
            Contacto
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Si tienes dudas, escribenos a{" "}
            <a
              href="mailto:info@verifactu.business"
              className="font-semibold text-[#2361d8] underline underline-offset-4"
            >
              info@verifactu.business
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}




