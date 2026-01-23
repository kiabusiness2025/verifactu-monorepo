import type { Metadata } from "next";
import Link from "next/link";
import { getLandingUrl } from "../../lib/urls";

export const metadata: Metadata = {
  title: "Terminos y condiciones | Verifactu Business",
  description:
    "Terminos y condiciones de uso de Verifactu Business.",
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
        <h1 className="text-4xl font-bold text-[#2361d8]">Terminos y condiciones</h1>
        <p className="mt-4 text-lg text-slate-600">
          Estas condiciones regulan el acceso y uso de Verifactu Business. Al usar
          el servicio aceptas este acuerdo.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#2361d8]">
          1. Servicio
        </h2>
        <p className="mt-3 text-slate-600">
          Verifactu Business proporciona herramientas de facturacion, registro y
          control basico para PYMEs y autonomos. El servicio puede evolucionar y
          mejorar con el tiempo.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#2361d8]">
          1.1 Asistente Isaak
        </h2>
        <p className="mt-3 text-slate-600">
          Isaak es un asistente de apoyo para ayudarte a interpretar datos, plazos y documentos. Puedes elegir su
          personalidad y tono. Isaak no sustituye a tu gestor ni a un asesor profesional.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#2361d8]">
          2. Cuenta y acceso
        </h2>
        <p className="mt-3 text-slate-600">
          Eres responsable de mantener la confidencialidad de tus credenciales y
          del uso que se haga de tu cuenta.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#2361d8]">
          3. Precios y facturacion
        </h2>
        <p className="mt-3 text-slate-600">
          Los precios de suscripcion se calculan por tramos de uso. Puedes consultar la politica
          publica de precios y medicion aqui:{" "}
          <Link
            href="/politica-de-precios"
            className="text-[#2361d8] underline underline-offset-4 hover:text-[#2361d8]"
          >
            Politica de precios de suscripciones
          </Link>
          , y el soporte en{" "}
          <Link
            href="/verifactu/soporte"
            className="text-[#2361d8] underline underline-offset-4 hover:text-[#2361d8]"
          >
            Centro de soporte
          </Link>
          .
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#2361d8]">
          4. Responsabilidad
        </h2>
        <p className="mt-3 text-slate-600">
          El servicio se ofrece "tal cual". Hacemos esfuerzos razonables para
          mantener la disponibilidad y la informacion actualizada, sin garantia
          absoluta.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#2361d8]">
          5. Cancelacion
        </h2>
        <p className="mt-3 text-slate-600">
          Puedes cancelar tu suscripcion en cualquier momento. La cancelacion
          aplica al siguiente periodo de facturacion.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#2361d8]">
          6. Contacto
        </h2>
        <p className="mt-3 text-slate-600">
          Para dudas legales o soporte, contacta en{" "}
          <a
            href="mailto:info@verifactu.business"
            className="text-[#2361d8] underline underline-offset-4 hover:text-[#2361d8]"
          >
            info@verifactu.business
          </a>
          . (Alias de soporte@verifactu.business)
        </p>
      </section>
    </main>
  );
}




