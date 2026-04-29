import {
  BadgeCheck,
  FileText,
  Lock,
  Mail,
  Scale,
  ServerCog,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Términos de Servicio | Conector Holded para ChatGPT — Verifactu Business',
  description:
    'Términos y condiciones del conector Holded para ChatGPT y Claude, desarrollado por Expert Estudios Profesionales, SLU (Verifactu Business). Alcance del servicio, responsabilidades, OAuth y derechos del usuario.',
};

export default function HoldedTermsPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_45%,#ffffff_100%)] text-slate-900">
      <section className="mx-auto max-w-5xl px-4 py-16">
        {/* ── Cabecera ── */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
              <FileText className="h-4 w-4" />
              Términos de Servicio
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Términos de Servicio del Conector Holded
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              Estos términos regulan el acceso y uso del{' '}
              <strong>Conector Holded para ChatGPT y Claude</strong>, desarrollado y operado por
              Expert Estudios Profesionales, SLU bajo la marca Verifactu Business.
            </p>
            <p className="text-sm text-slate-500">Última actualización: 29 de abril de 2026.</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:w-[24rem]">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              Aviso importante
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              El conector es una herramienta de consulta y apoyo operativo.{' '}
              <strong>No sustituye</strong> el criterio de un asesor fiscal, contable o legal
              cualificado. Verifica siempre la información antes de tomar decisiones importantes.
            </p>
          </div>
        </div>

        {/* ── Quién presta el servicio ── */}
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <UserCheck className="h-4 w-4 text-[#ff5460]" />
            Empresa que presta el servicio
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            <strong>Expert Estudios Profesionales, SLU</strong> (en adelante, «Verifactu Business»)
            es la empresa responsable del desarrollo, mantenimiento y operación del conector. Somos
            <strong> Holded Solution Partner</strong>, con acceso a los recursos técnicos oficiales
            de Holded para la integración de su API.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              ['Marca comercial', 'Verifactu Business'],
              ['Dominio principal', 'verifactu.business'],
              ['Conector disponible en', 'ChatGPT (OpenAI) · Claude (Anthropic)'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {label}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Descripción del servicio ── */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ServerCog className="h-4 w-4 text-[#ff5460]" />
            Descripción del servicio
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            El conector permite a los usuarios de ChatGPT y Claude acceder a los datos de su cuenta
            de Holded —facturas, contactos, tesorería, proyectos, empleados y documentos— mediante
            lenguaje natural, utilizando el protocolo <strong>Model Context Protocol (MCP)</strong>{' '}
            y autenticación <strong>OAuth 2.0</strong>.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Operaciones disponibles
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                <li>✓ Consulta de facturas, contactos, proyectos y tesorería</li>
                <li>✓ Resúmenes y análisis de datos del negocio</li>
                <li>✓ Búsqueda de empleados, productos y almacenes</li>
                <li>✓ Creación de borradores de factura (con confirmación)</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Operaciones que requieren confirmación
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                <li>⚠ Cualquier acción que modifique datos en Holded</li>
                <li>⚠ Creación o edición de registros</li>
                <li>⚠ Envío de documentos o comunicaciones</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── Condiciones de uso ── */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Scale className="h-4 w-4 text-[#ff5460]" />
              Responsabilidades del usuario
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>
                Eres responsable de la cuenta de Holded que conectas y de la API key o token OAuth
                que facilitas para el acceso.
              </li>
              <li>
                Debes revisar y confirmar cualquier acción que modifique datos antes de ejecutarla.
              </li>
              <li>
                El uso del conector implica aceptar también los términos de servicio de Holded y los
                de la plataforma de IA utilizada (OpenAI para ChatGPT, Anthropic para Claude).
              </li>
            </ul>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-[#ff5460]" />
              Limitación de responsabilidad
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>
                Verifactu Business no garantiza la exactitud de las respuestas generadas por la IA a
                partir de los datos de Holded. Las decisiones deben ser validadas por el usuario.
              </li>
              <li>
                No somos responsables de interrupciones en la API de Holded, OpenAI o Anthropic que
                puedan afectar a la disponibilidad del conector.
              </li>
              <li>
                La responsabilidad máxima por daños directos se limita al importe pagado por el
                servicio en los 12 meses anteriores al incidente.
              </li>
            </ul>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Lock className="h-4 w-4 text-[#ff5460]" />
              Acceso OAuth y revocación
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              La conexión con Holded se establece mediante OAuth 2.0. Puedes revocar el acceso en
              cualquier momento desde tu cuenta de Holded o contactando con{' '}
              <a
                href="mailto:soporte@verifactu.business"
                className="font-semibold text-[#ff5460] underline underline-offset-4"
              >
                soporte@verifactu.business
              </a>
              . Tras la revocación, eliminamos los tokens de acceso en un plazo máximo de 30 días.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="h-4 w-4 text-[#ff5460]" />
              Disponibilidad y cambios
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              El servicio se ofrece en evolución continua. Las funcionalidades disponibles, límites
              y procesos pueden cambiar cuando Holded, OpenAI o Anthropic actualicen sus plataformas
              o requisitos técnicos. Notificaremos cambios relevantes con al menos 15 días de
              antelación cuando sea posible.
            </p>
          </article>
        </div>

        {/* ── Herramientas de desarrollo ── */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ServerCog className="h-4 w-4 text-[#ff5460]" />
            Desarrollo y herramientas tecnológicas
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Este conector ha sido desarrollado por Expert Estudios Profesionales, SLU con la
            asistencia de herramientas de IA:
          </p>
          <ul className="mt-2 space-y-1 text-sm leading-7 text-slate-600">
            <li>
              — <strong>Claude Sonnet 4.6</strong> (Anthropic) — arquitectura, código y revisión
              técnica.
            </li>
            <li>
              — <strong>GitHub Copilot / Codex</strong> (OpenAI/Microsoft) — asistencia en
              desarrollo.
            </li>
          </ul>
        </div>

        {/* ── Ley aplicable ── */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Scale className="h-4 w-4 text-[#ff5460]" />
            Ley aplicable y jurisdicción
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Estos términos se rigen por la legislación española. Para cualquier controversia, las
            partes se someten a los Juzgados y Tribunales del domicilio del responsable del
            servicio, salvo que la normativa de consumidores establezca otro fuero.
          </p>
        </div>

        {/* ── Contacto ── */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Mail className="h-4 w-4 text-[#ff5460]" />
            Contacto
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Para dudas legales, solicitudes de eliminación de cuenta o cualquier consulta sobre
            estos términos:
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a
              href="mailto:soporte@verifactu.business"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#ff5460]/25 bg-[#fff7f7] px-4 py-3 text-sm font-semibold text-[#ff5460] transition hover:bg-[#ffeef0]"
            >
              <Mail className="h-4 w-4" />
              soporte@verifactu.business
            </a>
            <Link
              href="/support"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Abrir ticket de soporte
            </Link>
          </div>
        </div>

        {/* ── Breadcrumb ── */}
        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/" className="font-semibold text-[#ff5460] hover:text-[#ef4654]">
            ← Volver a la landing
          </Link>
          <Link href="/privacy" className="font-semibold text-slate-500 hover:text-slate-800">
            Política de privacidad →
          </Link>
        </div>
      </section>
    </main>
  );
}
