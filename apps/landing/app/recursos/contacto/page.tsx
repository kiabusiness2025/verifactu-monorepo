import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, Receipt, Sparkles } from "lucide-react";
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
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/20">
          <MessageCircle className="h-4 w-4" />
          Soporte y ventas
        </div>
        <h1 className="mt-4 text-4xl font-bold text-[#011c67]">Contacto</h1>
        <p className="mt-4 text-lg text-slate-600">
          Estamos aquí para ayudarte. Respondemos en 24-48h laborables. Isaak puede guiarte en minutos.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Mail className="h-4 w-4" />
              Email directo
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Escríbenos a{" "}
              <a
                href="mailto:info@verifactu.business"
                className="font-semibold text-[#2361d8] underline underline-offset-4"
              >
                info@verifactu.business
              </a>
              .
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Receipt className="h-4 w-4" />
              Presupuesto
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Si necesitas una propuesta personalizada, visita{" "}
              <Link
                href="/presupuesto"
                className="font-semibold text-[#2361d8] underline underline-offset-4"
              >
                Solicitar presupuesto
              </Link>
              .
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Sparkles className="h-4 w-4" />
              Isaak en minutos
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Isaak resuelve dudas rápidas y te guía paso a paso.
            </p>
            <div className="mt-3">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-4 py-2 text-xs font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Probar con Isaak
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <MessageCircle className="h-4 w-4" />
              Tiempo de respuesta
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Respondemos en 24-48h laborables con la mejor solución posible.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <ContactForms />
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/#planes"
            className="inline-flex items-center justify-center rounded-xl bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
          >
            Calcular precio
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




