import type { Metadata } from 'next';
import Link from 'next/link';
import { Database, ExternalLink, Lock, Mail, ShieldCheck, UserCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Política de privacidad | Isaak',
  description: 'Información sobre tratamiento de datos personales y uso del contexto en Isaak.',
};

export default function IsaakPrivacyPage() {
  return (
    <main className="min-h-screen bg-[#2361d8]/5">
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/20">
              <ShieldCheck className="h-4 w-4" />
              Privacidad y datos
            </div>
            <h1 className="text-4xl font-bold text-[#011c67]">Política de privacidad</h1>
            <p className="text-lg text-slate-600">
              Esta política explica qué datos usa Isaak, para qué los usa y cómo puedes ejercer tus
              derechos cuando interactúas con el producto o con su chat público.
            </p>
            <p className="text-sm text-slate-500">Última actualización: 24 de marzo de 2026.</p>
          </div>
          <div className="rounded-2xl border border-[#2361d8]/15 bg-white p-5 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Lock className="h-4 w-4" />
              Compromiso
            </div>
            <p className="mt-2">
              Isaak está diseñado para ayudarte mejor sin perder control, trazabilidad ni claridad
              sobre qué información entra en juego.
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
              Expert Estudios Profesionales, SLU. Para consultas sobre datos o privacidad puedes
              escribir a{' '}
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
              <li>Datos de cuenta, contacto y empresa cuando activas el producto.</li>
              <li>Mensajes e interacciones necesarias para dar continuidad al servicio.</li>
              <li>
                Contexto autorizado de negocio e integraciones compatibles cuando las conectas.
              </li>
              <li>Datos técnicos mínimos de uso para seguridad, soporte y diagnóstico.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <ShieldCheck className="h-4 w-4" />
              Finalidad y base legal
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Tratamos datos para prestar el servicio, responder soporte, mantener seguridad y
              cumplir obligaciones legales. La base legal principal es la ejecución del contrato, el
              interés legítimo y el cumplimiento normativo.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Lock className="h-4 w-4" />
              Conservación
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Conservamos los datos mientras exista una relación activa o durante el plazo necesario
              para soporte, auditoría razonable y cumplimiento de obligaciones aplicables.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-[#2361d8]/15 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
            <ExternalLink className="h-4 w-4" />
            Proveedores y subencargados
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Isaak utiliza proveedores para operar pagos, email, hosting, procesamiento y modelos.
            Solo se comparte la información necesaria para prestar el servicio con garantías de
            seguridad razonables.
          </p>
          <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-700">Hosting e IA</div>
              <p className="mt-1 text-xs">Google Cloud y Vertex AI.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-700">Email y soporte</div>
              <p className="mt-1 text-xs">Resend y canales de soporte de verifactu.business.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-700">Pagos</div>
              <p className="mt-1 text-xs">Stripe para cobros y facturación.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-700">Seguridad</div>
              <p className="mt-1 text-xs">Cifrado en tránsito y controles de acceso por rol.</p>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
            <Mail className="h-4 w-4" />
            Ejercicio de derechos
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Puedes solicitar acceso, rectificación, supresión o limitación del tratamiento. Si
            quieres ayuda rápida, también puedes ir a{' '}
            <Link
              href="/support"
              className="font-semibold text-[#2361d8] underline underline-offset-4"
            >
              soporte de Isaak
            </Link>
            .
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#011c67]">Siguiente paso útil</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Si prefieres validar primero el tono y el criterio de Isaak antes de activar tu espacio,
            puedes probar el chat abierto o pedir acompañamiento del equipo.
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
