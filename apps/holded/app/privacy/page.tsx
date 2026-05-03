import { Database, Lock, Mail, Scale, ServerCog, ShieldCheck, UserCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Conector Holded para ChatGPT y Claude — Verifactu Business',
  description:
    'Política de privacidad del conector Holded para ChatGPT y Claude, desarrollado por Expert Estudios Profesionales, SLU (Verifactu Business). Datos tratados, OAuth, GDPR y derechos del usuario.',
  alternates: { canonical: '/privacy' },
};

export default function HoldedPrivacyPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_45%,#ffffff_100%)] text-slate-900">
      <section className="mx-auto max-w-5xl px-4 py-16">
        {/* ── Cabecera ── */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
              <ShieldCheck className="h-4 w-4" />
              Política de Privacidad
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Política de Privacidad del Conector Holded
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              Esta política describe qué datos tratamos, cómo gestionamos la conexión con Holded
              mediante OAuth y API, y los derechos que puedes ejercer como usuario del conector
              disponible en ChatGPT y Claude.
            </p>
            <p className="text-sm text-slate-500">Última actualización: 29 de abril de 2026.</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:w-[24rem]">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              Responsable del tratamiento
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              <strong>Expert Estudios Profesionales, SLU</strong>
              <br />
              Operando bajo la marca <strong>Verifactu Business</strong>
              <br />
              <a
                href="https://verifactu.business"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#ff5460] underline underline-offset-4"
              >
                verifactu.business
              </a>
              <br />
              Contacto:{' '}
              <a
                href="mailto:soporte@verifactu.business"
                className="font-medium text-[#ff5460] underline underline-offset-4"
              >
                soporte@verifactu.business
              </a>
            </p>
          </div>
        </div>

        {/* ── Qué es este servicio ── */}
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ServerCog className="h-4 w-4 text-[#ff5460]" />
            Qué es este servicio
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            El <strong>Conector Holded para ChatGPT y Claude</strong> es un plugin desarrollado por
            Expert Estudios Profesionales, SLU que permite a los usuarios de ChatGPT (OpenAI) y
            Claude (Anthropic) acceder a datos clave de su cuenta de Holded —facturas, contactos,
            cuentas contables, diario y borradores de factura cuando el usuario lo confirma— en
            lenguaje natural, sin salir de su asistente de IA.
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Expert Estudios Profesionales, SLU es <strong>Holded Solution Partner</strong>, lo que
            implica acceso a recursos técnicos y formación oficial de Holded para la integración de
            su API.
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            El conector opera bajo el protocolo <strong>Model Context Protocol (MCP)</strong>,
            estándar abierto de Anthropic, y utiliza <strong>OAuth 2.0</strong> para la
            autenticación segura del usuario con Holded.
          </p>
        </div>

        {/* ── Datos que tratamos ── */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Database className="h-4 w-4 text-[#ff5460]" />
              Datos que tratamos
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>
                <strong>Datos de autenticación OAuth:</strong> tokens de acceso y refresco emitidos
                por Holded al autorizar la conexión. Nunca almacenamos contraseñas de Holded.
              </li>
              <li>
                <strong>Datos de identificación:</strong> correo electrónico y nombre de usuario
                necesarios para vincular la sesión al tenant correcto.
              </li>
              <li>
                <strong>Datos de negocio de Holded:</strong> información consultada en tiempo real
                —facturas, contactos, cuentas contables y diario— únicamente en respuesta a
                solicitudes explícitas del usuario.
              </li>
              <li>
                <strong>Registros operativos:</strong> logs técnicos mínimos para seguridad,
                trazabilidad y soporte.
              </li>
            </ul>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ServerCog className="h-4 w-4 text-[#ff5460]" />
              Finalidad del tratamiento
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>
                Autenticar al usuario y conectar de forma segura su cuenta de Holded con el
                asistente de IA.
              </li>
              <li>
                Recuperar datos del negocio en tiempo real para responder las consultas realizadas
                en ChatGPT o Claude.
              </li>
              <li>Operar el servicio con seguridad, soporte técnico y trazabilidad mínima.</li>
              <li>
                Cumplir las obligaciones legales y técnicas aplicables, incluidos los requisitos de
                la plataforma de OpenAI y Anthropic.
              </li>
            </ul>
          </article>
        </div>

        {/* ── OAuth y Holded ── */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Lock className="h-4 w-4 text-[#ff5460]" />
            Flujo OAuth con Holded
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Cuando el usuario activa el conector, se le redirige a la página de autorización de
            Holded. Allí acepta los permisos solicitados y Holded emite un <em>token OAuth</em> que
            se almacena de forma segura en nuestra infraestructura. Este token se usa exclusivamente
            para realizar las consultas que el usuario solicita en el chat.
          </p>
          <ul className="mt-3 space-y-1 text-sm leading-7 text-slate-600">
            <li>
              — El conector accede únicamente a los datos que el usuario ha autorizado expresamente.
            </li>
            <li>
              — Las operaciones de escritura (crear facturas, etc.) requieren confirmación
              explícita.
            </li>
            <li>
              — El usuario puede revocar el acceso desde su cuenta de Holded en cualquier momento.
            </li>
            <li>— Los tokens no se comparten con terceros ajenos al servicio.</li>
          </ul>
        </div>

        {/* ── Retención y seguridad ── */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Scale className="h-4 w-4 text-[#ff5460]" />
              Retención de datos
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Los tokens OAuth se conservan mientras la integración esté activa. Los registros
              operativos se retienen un máximo de 90 días. Los datos de negocio consultados a través
              de Holded no se almacenan de forma persistente: se recuperan en tiempo real y se
              descartan tras la respuesta.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-[#ff5460]" />
              Seguridad
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Los tokens OAuth se almacenan cifrados. La comunicación entre el plugin y la API de
              Holded se realiza siempre mediante HTTPS. Aplicamos medidas técnicas y organizativas
              conforme al RGPD para minimizar el riesgo de acceso no autorizado.
            </p>
          </article>
        </div>

        {/* ── Derechos GDPR ── */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <UserCheck className="h-4 w-4 text-[#ff5460]" />
            Tus derechos (RGPD)
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            En cumplimiento del Reglamento General de Protección de Datos (RGPD / GDPR), puedes
            ejercer los siguientes derechos enviando un correo a{' '}
            <a
              href="mailto:soporte@verifactu.business"
              className="font-semibold text-[#ff5460] underline underline-offset-4"
            >
              soporte@verifactu.business
            </a>
            :
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {[
              ['Acceso', 'Conocer qué datos tenemos sobre ti.'],
              ['Rectificación', 'Corregir datos inexactos o incompletos.'],
              ['Supresión', 'Solicitar la eliminación de tus datos.'],
              ['Oposición', 'Oponerte al tratamiento en determinadas circunstancias.'],
              ['Portabilidad', 'Recibir tus datos en formato estructurado.'],
              ['Limitación', 'Solicitar que suspendamos temporalmente el tratamiento.'],
            ].map(([title, desc]) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-[#ff5460]">
                  {title}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-500">
            También puedes presentar una reclamación ante la{' '}
            <strong>Agencia Española de Protección de Datos (AEPD)</strong> en{' '}
            <a
              href="https://www.aepd.es"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              aepd.es
            </a>
            .
          </p>
        </div>

        {/* ── Herramientas de desarrollo ── */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ServerCog className="h-4 w-4 text-[#ff5460]" />
            Herramientas utilizadas en el desarrollo
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Este conector ha sido diseñado y desarrollado con la colaboración de herramientas de
            inteligencia artificial:
          </p>
          <ul className="mt-2 space-y-1 text-sm leading-7 text-slate-600">
            <li>
              — <strong>Claude Sonnet 4.6</strong> (Anthropic) — asistencia en arquitectura,
              generación de código y revisión técnica.
            </li>
            <li>
              — <strong>GitHub Copilot / Codex</strong> (OpenAI/Microsoft) — asistencia en
              autocompletado y generación de código.
            </li>
          </ul>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Estas herramientas no tienen acceso a los datos de los usuarios finales ni a las
            credenciales de producción.
          </p>
        </div>

        {/* ── Contacto ── */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Mail className="h-4 w-4 text-[#ff5460]" />
            Contacto y soporte
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Para cualquier solicitud relacionada con esta política de privacidad, derechos de
            protección de datos o eliminación de tu cuenta e integración:
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

        {/* ── Breadcrumb de vuelta ── */}
        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/" className="font-semibold text-[#ff5460] hover:text-[#ef4654]">
            ← Volver a la landing
          </Link>
          <Link href="/terms" className="font-semibold text-slate-500 hover:text-slate-800">
            Términos de servicio →
          </Link>
        </div>
      </section>
    </main>
  );
}
