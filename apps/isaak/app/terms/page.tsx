import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BadgeCheck,
  ExternalLink,
  FileText,
  Mail,
  Scale,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Términos y condiciones | Isaak',
  description: 'Condiciones de uso de Isaak como producto público de verifactu.business.',
};

export default function IsaakTermsPage() {
  return (
    <main className="min-h-screen bg-[#2361d8]/5">
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/20">
              <FileText className="h-4 w-4" />
              Condiciones de servicio
            </div>
            <h1 className="text-4xl font-bold text-[#011c67]">Términos y condiciones</h1>
            <p className="text-lg text-slate-600">
              Estas condiciones regulan el acceso y uso de Isaak. Al utilizar el producto o su chat
              público aceptas este marco de funcionamiento.
            </p>
            <p className="text-sm text-slate-500">Última actualización: 24 de marzo de 2026.</p>
          </div>
          <div className="rounded-2xl border border-[#2361d8]/15 bg-white p-5 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <BadgeCheck className="h-4 w-4" />
              Aviso importante
            </div>
            <p className="mt-2">
              Isaak es un asistente de apoyo fiscal y operativo. No sustituye a tu gestor, asesor o
              profesional acreditado cuando ese criterio sea necesario.
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
              Isaak ofrece asistencia, explicación, priorización y apoyo a la toma de decisiones con
              contexto autorizado. El producto evoluciona de forma continua.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <UserCheck className="h-4 w-4" />
              Cuenta y acceso
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Eres responsable de custodiar tus credenciales, revisar lo que conectas y confirmar
              cualquier acción sensible antes de ejecutarla.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Scale className="h-4 w-4" />
              Responsabilidad
            </div>
            <p className="mt-2 text-sm text-slate-600">
              El servicio se presta tal cual, con esfuerzo razonable por mantener disponibilidad,
              seguridad y actualidad, pero sin garantía absoluta de ausencia total de incidencias.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <BadgeCheck className="h-4 w-4" />
              Precios y activación
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Los planes, periodos de prueba y condiciones comerciales vigentes son los publicados
              por verifactu.business en cada momento. Si necesitas una activación guiada, puedes
              pasar por soporte o por el chat abierto antes de contratar.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-[#2361d8]/15 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
            <ExternalLink className="h-4 w-4" />
            Referencias externas y normativa
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Cuando sea relevante, Isaak puede orientarte hacia la normativa pública o a los canales
            oficiales, pero la responsabilidad final sobre decisiones fiscales sigue siendo tuya.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <a
              href="https://www.agenciatributaria.es/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/20 bg-[#2361d8]/5 px-4 py-2 font-semibold text-[#2361d8]"
            >
              Agencia Tributaria
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href="https://sede.agenciatributaria.gob.es/Sede/"
              target="_blank"
              rel="noopener noreferrer"
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
              Cancelación
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Puedes cancelar o revisar tu activación según las condiciones de tu plan. Para casos
              especiales, el canal correcto es soporte.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Mail className="h-4 w-4" />
              Contacto
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Si tienes dudas legales o de servicio, escríbenos o entra en{' '}
              <Link
                href="/support"
                className="font-semibold text-[#2361d8] underline underline-offset-4"
              >
                soporte de Isaak
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#011c67]">Siguiente paso útil</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Si antes de activar quieres validar cómo responde Isaak, abre el chat o habla con el
            equipo para revisar tu caso.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
            >
              Hablar con Isaak
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Contactar soporte
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
