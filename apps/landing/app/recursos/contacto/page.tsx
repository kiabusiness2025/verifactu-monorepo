import type { Metadata } from "next";
import Link from "next/link";
import { getLandingUrl } from "../../lib/urls";
import ContactForms from "./ContactForms";

export const metadata: Metadata = {
  title: "Contacto | Verifactu Business",
  description:
    "Contacta con nuestro equipo para soporte, ventas o consultas.",
};

export default function ContactoPage() {
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
        <h1 className="text-4xl font-bold text-[#2361d8]">Contacto</h1>
        <p className="mt-4 text-lg text-slate-600">
          Estamos aqui para ayudarte. Responderemos en 24-48h laborables. Isaak puede guiarte en minutos.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-700">
            Escribenos a{" "}
            <a
              href="mailto:info@verifactu.business"
              className="text-[#2361d8] underline underline-offset-4 hover:text-[#2361d8]"
            >
              info@verifactu.business
            </a>
            .
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Si necesitas una propuesta personalizada, tambien puedes visitar{" "}
            <Link
              href="/presupuesto"
              className="text-[#2361d8] underline underline-offset-4 hover:text-[#2361d8]"
            >
              Solicitar presupuesto
            </Link>
            .
          </p>
        </div>

        <div className="mt-10">
          <ContactForms />
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/#precios"
            className="inline-flex items-center justify-center rounded-xl bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
          >
            Ver planes
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
          >
            Probar con Isaak
          </Link>
        </div>
      </section>
    </main>
  );
}




