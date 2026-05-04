import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  FileText,
  Lock,
  Mail,
  Network,
  Scale,
  ServerCog,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Términos de Servicio | Conector Holded para ChatGPT — Verifactu Business',
  description:
    'Términos y condiciones del conector Holded para ChatGPT, desarrollado por Expert Estudios Profesionales, SLU (Verifactu Business). Alcance, OAuth 2.0, responsabilidades y ley aplicable.',
  alternates: { canonical: '/conectores/chatgpt/terms' },
};

const LEGAL_LINKS = [
  { label: 'Documentación', href: '/conectores/chatgpt/docs', Icon: BookOpen },
  { label: 'Privacidad', href: '/conectores/chatgpt/privacy', Icon: ShieldCheck },
  { label: 'DPA', href: '/conectores/chatgpt/dpa', Icon: FileText },
  { label: 'Términos', href: '/conectores/chatgpt/terms', Icon: Scale },
];

export default function ChatGPTTermsPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(175deg,#ffffff_0%,#f0fdf4_100%)] text-slate-900">
      {/* ── Top nav ── */}
      <nav className="sticky top-0 z-10 border-b border-emerald-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href="/conectores/chatgpt"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 transition hover:text-emerald-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al conector ChatGPT
          </Link>
          <div className="flex items-center gap-4">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hidden text-xs font-medium text-slate-500 transition hover:text-emerald-700 sm:inline"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-4 py-12">
        {/* ── Cabecera ── */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Holded"
                width={36}
                height={36}
                className="rounded-lg"
              />
              <span className="text-slate-300">+</span>
              <Image
                src="/brand/chatgpt-logo.png"
                alt="ChatGPT"
                width={32}
                height={32}
                className="rounded-lg"
              />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <FileText className="h-4 w-4" />
              Términos de Servicio
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Términos de Servicio
              <span className="block text-2xl font-semibold text-emerald-700">
                Conector Holded para ChatGPT
              </span>
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Estos términos regulan el acceso y uso del{' '}
              <strong>Conector Holded para ChatGPT</strong>, desarrollado y operado por Expert
              Estudios Profesionales, SLU bajo la marca Verifactu Business.
            </p>
            <p className="text-sm text-slate-400">Última actualización: 29 de abril de 2026.</p>
          </div>

          {/* Aviso card */}
          <div className="shrink-0 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm lg:w-[22rem]">
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

        {/* ── Empresa ── */}
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <UserCheck className="h-4 w-4 text-emerald-600" />
            Empresa que presta el servicio
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            <strong>Expert Estudios Profesionales, SLU</strong> (en adelante, «Verifactu Business»)
            es responsable del desarrollo, mantenimiento y operación del conector. Somos{' '}
            <strong>Holded Solution Partner</strong>, con acceso a los recursos técnicos oficiales
            de Holded para la integración de su API.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              ['Marca', 'Verifactu Business'],
              ['Dominio', 'holded.verifactu.business'],
              ['Plataforma', 'ChatGPT (OpenAI)'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3"
              >
                <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
                  {label}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Verifactu como puente (NUEVO) ── */}
        <div className="mt-6 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Network className="h-4 w-4 text-emerald-600" />
            Verifactu como puente de conexión
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            <strong>Verifactu Business actúa exclusivamente como capa de conexión técnica</strong>{' '}
            entre ChatGPT (proporcionado por OpenAI) y la API oficial de Holded. Verifactu no
            participa en la generación de respuestas de ChatGPT ni en la gestión interna de los
            datos almacenados en Holded.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                OpenAI / ChatGPT
              </div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                Genera todas las respuestas en lenguaje natural. La calidad, exactitud y contenido
                de las respuestas son responsabilidad de OpenAI conforme a sus propios términos.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                Holded
              </div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                Almacena, procesa y gestiona los datos contables, fiscales y comerciales del
                usuario. La disponibilidad y exactitud de los datos depende exclusivamente de
                Holded.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                Verifactu Business
              </div>
              <p className="mt-2 text-xs leading-6 text-slate-700">
                Provee la infraestructura que traduce peticiones de ChatGPT a llamadas a la API de
                Holded. <strong>No genera respuestas, no almacena datos de negocio.</strong>
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-500">
            En consecuencia, Verifactu Business <strong>queda eximida de responsabilidad</strong>{' '}
            por el contenido de las respuestas de ChatGPT, por la disponibilidad o exactitud de los
            datos en Holded y por las decisiones que el usuario tome en base a la información
            obtenida a través del conector.
          </p>
        </div>

        {/* ── Licencias requeridas (NUEVO) ── */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileText className="h-4 w-4 text-emerald-600" />
            Licencias requeridas para usar el conector
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            El uso del conector requiere que el usuario disponga de licencias activas y vigentes en
            las plataformas de terceros, y que cumpla los términos de cada una de ellas:
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Cuenta OpenAI / ChatGPT
              </div>
              <ul className="mt-2 space-y-1 text-sm leading-7 text-slate-700">
                <li>
                  — Cuenta activa en <strong>ChatGPT</strong> con un plan que permita el uso de
                  conectores y aplicaciones (consultar disponibilidad por plan en OpenAI).
                </li>
                <li>
                  — Aceptación de los{' '}
                  <a
                    href="https://openai.com/policies/terms-of-use"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-emerald-700 underline underline-offset-4"
                  >
                    Términos de uso de OpenAI
                  </a>{' '}
                  y la{' '}
                  <a
                    href="https://openai.com/policies/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-emerald-700 underline underline-offset-4"
                  >
                    Política de privacidad de OpenAI
                  </a>
                  .
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                Cuenta Holded
              </div>
              <ul className="mt-2 space-y-1 text-sm leading-7 text-slate-700">
                <li>
                  — Cuenta activa de <strong>Holded</strong> con un plan que permita el uso de la
                  API (consultar disponibilidad por plan en Holded).
                </li>
                <li>
                  — Aceptación de los{' '}
                  <a
                    href="https://www.holded.com/es/legal/condiciones-uso"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-rose-700 underline underline-offset-4"
                  >
                    Términos y condiciones de Holded
                  </a>{' '}
                  y la{' '}
                  <a
                    href="https://www.holded.com/es/legal/privacidad"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-rose-700 underline underline-offset-4"
                  >
                    Política de privacidad de Holded
                  </a>
                  .
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-500">
            La pérdida de cualquiera de estas licencias o el incumplimiento de los términos de
            OpenAI o Holded por parte del usuario suspende automáticamente el derecho de uso del
            conector. Verifactu no tiene capacidad para mantener el servicio si la licencia de la
            plataforma de terceros queda revocada o suspendida.
          </p>
        </div>

        {/* ── Descripción del servicio ── */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ServerCog className="h-4 w-4 text-emerald-600" />
            Descripción del servicio
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            El conector permite a los usuarios de ChatGPT acceder a datos clave de su cuenta de
            Holded: facturas, contactos, cuentas contables y diario con rango de fechas. La conexion
            se aloja en Verifactu y las credenciales se tratan server-side.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Operaciones disponibles
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                <li>- Consulta de facturas y contactos</li>
                <li>- Consulta de cuentas contables y diario con rango de fechas</li>
                <li>- Resumenes de datos disponibles dentro del tenant conectado</li>
                <li>- Creacion de borradores de factura con confirmacion explicita</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Requieren confirmación explícita
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                <li>⚠ Cualquier acción que modifique datos en Holded</li>
                <li>⚠ Creación o edición de registros</li>
                <li>⚠ Envío de documentos o comunicaciones</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── Condiciones ── */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Scale className="h-4 w-4 text-emerald-600" />
              Responsabilidades del usuario
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>
                Eres responsable de la cuenta de Holded que conectas y de las credenciales que
                autorizas en el flujo de conexion.
              </li>
              <li>
                Debes revisar y confirmar cualquier acción que modifique datos antes de ejecutarla.
              </li>
              <li>
                El uso implica aceptar también los términos de OpenAI para ChatGPT y los de Holded.
              </li>
            </ul>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Limitación de responsabilidad
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>
                Verifactu Business no garantiza la exactitud de las respuestas de la IA. Las
                decisiones deben ser validadas por el usuario.
              </li>
              <li>
                No somos responsables de interrupciones en la API de Holded u OpenAI que puedan
                afectar a la disponibilidad del conector.
              </li>
              <li>
                La responsabilidad máxima por daños directos se limita al importe pagado por el
                servicio en los 12 meses anteriores al incidente.
              </li>
            </ul>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Lock className="h-4 w-4 text-emerald-600" />
              Acceso OAuth y revocación
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              La conexión con Holded se establece mediante OAuth 2.0. Puedes revocar el acceso desde
              tu cuenta de Holded o escribiendo a{' '}
              <a
                href="mailto:soporte@verifactu.business"
                className="font-semibold text-emerald-700 underline underline-offset-4"
              >
                soporte@verifactu.business
              </a>
              . Tras la revocación, eliminamos los tokens de acceso en un plazo máximo de 30 días.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="h-4 w-4 text-emerald-600" />
              Disponibilidad y cambios
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              El servicio está en evolución continua. Funcionalidades, límites y procesos pueden
              cambiar cuando Holded u OpenAI actualicen sus plataformas. Notificaremos cambios
              relevantes con al menos 15 días de antelación cuando sea posible.
            </p>
          </article>
        </div>

        {/* ── Herramientas de desarrollo ── */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ServerCog className="h-4 w-4 text-emerald-600" />
            Herramientas tecnológicas en el desarrollo
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Este conector ha sido desarrollado por Expert Estudios Profesionales, SLU con asistencia
            de IA:
          </p>
          <ul className="mt-2 space-y-1 text-sm leading-7 text-slate-600">
            <li>
              — <strong>Claude Sonnet 4.6</strong> (Anthropic) — arquitectura, código y revisión.
            </li>
            <li>
              — <strong>GitHub Copilot / Codex</strong> (OpenAI/Microsoft) — autocompletado y
              generación.
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            Estas herramientas no tienen acceso a datos de usuarios finales ni credenciales de
            producción.
          </p>
        </div>

        {/* ── Ley aplicable ── */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Scale className="h-4 w-4 text-emerald-600" />
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
            <Mail className="h-4 w-4 text-emerald-600" />
            Contacto
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Para dudas legales, solicitudes de eliminación de cuenta o cualquier consulta sobre
            estos términos:
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a
              href="mailto:soporte@verifactu.business"
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <Mail className="h-4 w-4" />
              soporte@verifactu.business
            </a>
            <Link
              href="/conectores/chatgpt/privacy"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <ShieldCheck className="h-4 w-4" />
              Política de privacidad
            </Link>
          </div>
        </div>

        {/* ── Footer legal nav ── */}
        <footer className="mt-12 border-t border-slate-100 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/conectores/chatgpt"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Conector ChatGPT
            </Link>
            <div className="flex flex-wrap gap-6">
              {LEGAL_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm font-medium text-slate-500 transition hover:text-emerald-700"
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <p className="w-full text-center text-xs text-slate-400 sm:w-auto sm:text-right">
              Expert Estudios Profesionales, SLU · Verifactu Business · Holded Solution Partner
            </p>
          </div>
        </footer>
      </section>
    </main>
  );
}
