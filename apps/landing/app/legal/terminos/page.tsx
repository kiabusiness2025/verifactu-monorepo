import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y condiciones | Verifactu Business",
  description:
    "Términos y condiciones de uso de Verifactu Business.",
};

export default function TerminosPage() {
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
        <h1 className="text-4xl font-bold text-[#002060]">Términos y condiciones</h1>
        <p className="mt-4 text-lg text-slate-600">
          Estas condiciones regulan el acceso y uso de Verifactu Business. Al usar
          el servicio aceptas este acuerdo.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#002060]">
          1. Servicio
        </h2>
        <p className="mt-3 text-slate-600">
          Verifactu Business proporciona herramientas de facturación, registro y
          control básico para PYMEs y autónomos. El servicio puede evolucionar y
          mejorar con el tiempo.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#002060]">
          2. Cuenta y acceso
        </h2>
        <p className="mt-3 text-slate-600">
          Eres responsable de mantener la confidencialidad de tus credenciales y
          del uso que se haga de tu cuenta.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#002060]">
          3. Precios y facturación
        </h2>
        <p className="mt-3 text-slate-600">
          Los precios se calculan por tramos de uso. Puedes consultar la política
          pública de precios y medición aquí:{" "}
          <Link
            href="/politica-de-precios"
            className="text-[#0060F0] underline underline-offset-4 hover:text-[#0080F0]"
          >
            Política de precios
          </Link>
          .
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#002060]">
          4. Responsabilidad
        </h2>
        <p className="mt-3 text-slate-600">
          El servicio se ofrece "tal cual". Hacemos esfuerzos razonables para
          mantener la disponibilidad y la información actualizada, sin garantía
          absoluta.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#002060]">
          5. Cancelación
        </h2>
        <p className="mt-3 text-slate-600">
          Puedes cancelar tu suscripción en cualquier momento. La cancelación
          aplica al siguiente periodo de facturación.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#002060]">
          6. Contacto
        </h2>
        <p className="mt-3 text-slate-600">
          Para dudas legales o soporte, contacta en{" "}
          <a
            href="mailto:soporte@verifactu.business"
            className="text-[#0060F0] underline underline-offset-4 hover:text-[#0080F0]"
          >
            soporte@verifactu.business
          </a>
          .
        </p>
      </section>
    </main>
  );
}
