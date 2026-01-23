import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Database,
  UserCheck,
  Lock,
  Mail,
  ExternalLink,
} from "lucide-react";
import { getLandingUrl } from "../../lib/urls";

export const metadata: Metadata = {
  title: "Política de privacidad | Verifactu Business",
  description:
    "Información sobre el tratamiento de datos personales en Verifactu Business.",
};

export default function PrivacidadPage() {
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
              <ShieldCheck className="h-4 w-4" />
              Privacidad y datos
            </div>
            <h1 className="text-4xl font-bold text-[#011c67]">Política de privacidad</h1>
            <p className="text-lg text-slate-600">
              Esta politica explica que datos recogemos, para que los usamos y como puedes ejercer tus derechos.
            </p>
            <p className="text-sm text-slate-500">Ultima actualizacion: 23 de enero de 2026.</p>
          </div>
          <div className="rounded-2xl border border-[#2361d8]/15 bg-white p-5 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Lock className="h-4 w-4" />
              Compromiso
            </div>
            <p className="mt-2">
              Tratamos tus datos con medidas tecnicas y organizativas para garantizar su seguridad.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <UserCheck className="h-4 w-4" />
              Responsable
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Expert Estudios Profesionales, SLU. Contacto:{" "}
              <a
                href="mailto:info@verifactu.business"
                className="font-semibold text-[#2361d8] underline underline-offset-4"
              >
                info@verifactu.business
              </a>
              .
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Database className="h-4 w-4" />
              Datos tratados
            </div>
            <ul className="mt-2 list-disc pl-6 text-sm text-slate-600">
              <li>Datos de cuenta: nombre, correo electronico y empresa.</li>
              <li>Datos de uso: actividad en la plataforma y preferencias.</li>
              <li>Datos de facturacion si contratas un plan de pago.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <ShieldCheck className="h-4 w-4" />
              Finalidad y base legal
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Prestacion del servicio, soporte y cumplimiento legal. La base legal es la ejecucion del contrato y el
              cumplimiento normativo.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Lock className="h-4 w-4" />
              Retencion
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Conservamos los datos mientras exista una relacion activa o el tiempo necesario para cumplir obligaciones
              legales y soporte.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-[#2361d8]/15 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
            <ExternalLink className="h-4 w-4" />
            Subencargados y proveedores
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Utilizamos proveedores para operar el servicio (pagos, email, hosting e IA). Solo tratamos los datos
            necesarios para prestar el servicio.
          </p>
          <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-700">Pagos y facturacion</div>
              <p className="mt-1 text-xs">Stripe (procesamiento de pagos).</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-700">Email y soporte</div>
              <p className="mt-1 text-xs">Resend y canales de soporte.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-700">Hosting e IA</div>
              <p className="mt-1 text-xs">Google Cloud y Vertex AI.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-700">Seguridad</div>
              <p className="mt-1 text-xs">Cifrado en transito y controles de acceso.</p>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
            <Mail className="h-4 w-4" />
            Ejercicio de derechos
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Puedes acceder, rectificar o eliminar tus datos. Escribe a{" "}
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




