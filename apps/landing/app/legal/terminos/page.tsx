import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  FileText,
  Scale,
  ShieldCheck,
  UserCheck,
  Mail,
  ExternalLink,
} from "lucide-react";
import { getLandingUrl } from "../../lib/urls";

export const metadata: Metadata = {
  title: "Términos y condiciones | Verifactu Business",
  description:
    "Términos y condiciones de uso de Verifactu Business.",
};

export default function TerminosPage() {
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
              <FileText className="h-4 w-4" />
              Condiciones de servicio
            </div>
            <h1 className="text-4xl font-bold text-[#011c67]">Términos y condiciones</h1>
            <p className="text-lg text-slate-600">
              Estas condiciones regulan el acceso y uso de Verifactu Business. Al usar el servicio aceptas este acuerdo.
            </p>
            <p className="text-sm text-slate-500">Última actualización: 23 de enero de 2026.</p>
          </div>
          <div className="rounded-2xl border border-[#2361d8]/15 bg-white p-5 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <BadgeCheck className="h-4 w-4" />
              Aviso importante
            </div>
            <p className="mt-2">
              Isaak es un asistente de apoyo. No sustituye a tu gestor ni a un asesor profesional.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <ShieldCheck className="h-4 w-4" />
              Servicio
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Verifactu Business ofrece facturación, registro y control básico para PYMEs y autónomos. El servicio
              evoluciona con mejoras continuas.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <UserCheck className="h-4 w-4" />
              Cuenta y acceso
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Eres responsable de custodiar tus credenciales y del uso que se haga desde tu cuenta.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Scale className="h-4 w-4" />
              Responsabilidad
            </div>
            <p className="mt-2 text-sm text-slate-600">
              El servicio se ofrece tal cual. Trabajamos para mantener disponibilidad y datos actualizados, sin garantía absoluta.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <BadgeCheck className="h-4 w-4" />
              Precios y facturación
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Los precios se calculan por tramos de uso. Consulta la{" "}
              <Link href="/politica-de-precios" className="font-semibold text-[#2361d8] underline underline-offset-4">
                política de precios
              </Link>{" "}
              y nuestro{" "}
              <Link href="/recursos/contacto" className="font-semibold text-[#2361d8] underline underline-offset-4">
                contacto
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-[#2361d8]/15 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
            <ExternalLink className="h-4 w-4" />
            Referencias oficiales VeriFactu
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Para normativa y publicaciones oficiales consulta la Agencia Tributaria:
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <a
              href="https://www.agenciatributaria.es/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/20 bg-[#2361d8]/5 px-4 py-2 font-semibold text-[#2361d8]"
            >
              Agencia Tributaria
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href="https://sede.agenciatributaria.gob.es/Sede/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/20 bg-[#2361d8]/5 px-4 py-2 font-semibold text-[#2361d8]"
            >
              Sede electrónica
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Scale className="h-4 w-4" />
              Cancelacion
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Puedes cancelar tu suscripcion en cualquier momento. La cancelacion aplica al siguiente periodo de
              facturacion.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Mail className="h-4 w-4" />
              Contacto
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Dudas legales o soporte:{" "}
              <a
                href="mailto:info@verifactu.business"
                className="font-semibold text-[#2361d8] underline underline-offset-4"
              >
                info@verifactu.business
              </a>
              . (Alias de soporte@verifactu.business)
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}




