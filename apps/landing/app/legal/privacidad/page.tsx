import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad | Verifactu Business",
  description:
    "Información sobre el tratamiento de datos personales en Verifactu Business.",
};

export default function PrivacidadPage() {
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
        <h1 className="text-4xl font-bold text-[#002060]">Política de privacidad</h1>
        <p className="mt-4 text-lg text-slate-600">
          Esta política explica qué datos recogemos, para qué los usamos y cómo
          puedes ejercer tus derechos.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#002060]">
          1. Responsable
        </h2>
        <p className="mt-3 text-slate-600">
          Expert Estudios Profesionales, SLU. Contacto:{" "}
          <a
            href="mailto:soporte@verifactu.business"
            className="text-[#0060F0] underline underline-offset-4 hover:text-[#0080F0]"
          >
            soporte@verifactu.business
          </a>
          .
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#002060]">
          2. Datos que tratamos
        </h2>
        <ul className="mt-3 list-disc pl-6 text-slate-600">
          <li>Datos de cuenta: nombre y correo electrónico.</li>
          <li>Datos de uso: actividad en la plataforma y preferencias.</li>
          <li>Datos de facturación si contratas un plan de pago.</li>
        </ul>

        <h2 className="mt-10 text-2xl font-semibold text-[#002060]">
          3. Finalidad
        </h2>
        <p className="mt-3 text-slate-600">
          Usamos los datos para prestar el servicio, mejorar la experiencia,
          atender soporte y cumplir obligaciones legales.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-[#002060]">
          4. Tus derechos
        </h2>
        <p className="mt-3 text-slate-600">
          Puedes acceder, rectificar o eliminar tus datos. Para ejercer tus
          derechos, escribe a{" "}
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
