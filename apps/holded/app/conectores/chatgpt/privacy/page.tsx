import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Database,
  FileText,
  Lock,
  Mail,
  Scale,
  ServerCog,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Conector Holded para ChatGPT — Verifactu Business',
  description:
    'Política de privacidad del conector Holded para ChatGPT, desarrollado por Expert Estudios Profesionales, SLU (Verifactu Business). Datos tratados, OAuth 2.0, GDPR y derechos del usuario.',
  alternates: { canonical: '/conectores/chatgpt/privacy' },
};

// ── Footer nav links ─────────────────────────────────────────────────────────
const LEGAL_LINKS = [
  { label: 'Documentación', href: '/conectores/chatgpt/docs', Icon: BookOpen },
  { label: 'Privacidad', href: '/conectores/chatgpt/privacy', Icon: ShieldCheck },
  { label: 'DPA', href: '/conectores/chatgpt/dpa', Icon: FileText },
  { label: 'Términos', href: '/conectores/chatgpt/terms', Icon: Scale },
];

export default function ChatGPTPrivacyPage() {
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
            {/* Logos */}
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
              <ShieldCheck className="h-4 w-4" />
              Política de Privacidad
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Política de Privacidad
              <span className="block text-2xl font-semibold text-emerald-700">
                Conector Holded para ChatGPT
              </span>
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Qué datos tratamos, cómo gestionamos la conexión con Holded mediante OAuth 2.0 y los
              derechos que puedes ejercer como usuario del plugin disponible en ChatGPT.
            </p>
            <p className="text-sm text-slate-400">Última actualización: 29 de abril de 2026.</p>
          </div>

          {/* Responsable card */}
          <div className="shrink-0 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm lg:w-[22rem]">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              Responsable del tratamiento
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              <strong>Expert Estudios Profesionales, SLU</strong>
              <br />
              Marca:{' '}
              <a
                href="https://verifactu.business"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-700 underline underline-offset-4"
              >
                Verifactu Business
              </a>
              <br />
              Holded Solution Partner
              <br />
              <a
                href="mailto:soporte@verifactu.business"
                className="font-medium text-emerald-700 underline underline-offset-4"
              >
                soporte@verifactu.business
              </a>
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2">
              <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="text-xs text-emerald-800">Plugin OAuth · OpenAI GPT Store</span>
            </div>
          </div>
        </div>

        {/* ── Qué es ── */}
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ServerCog className="h-4 w-4 text-emerald-600" />
            Qué es este servicio
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            El <strong>Conector Holded para ChatGPT</strong> es un plugin OAuth desarrollado por
            Expert Estudios Profesionales, SLU que permite a los usuarios de ChatGPT (OpenAI)
            acceder a los datos de su cuenta de Holded —facturas, contactos, proyectos, tesorería,
            empleados— en lenguaje natural, sin salir del chat.
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            El plugin opera bajo el protocolo <strong>Model Context Protocol (MCP)</strong> y
            utiliza <strong>OAuth 2.0</strong> para autenticar de forma segura al usuario con Holded
            sin exponer credenciales. Expert Estudios Profesionales, SLU es{' '}
            <strong>Holded Solution Partner</strong>, con acceso a recursos técnicos y formación
            oficial de Holded para la integración de su API.
          </p>
        </div>

        {/* ── Datos tratados / Finalidad ── */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Database className="h-4 w-4 text-emerald-600" />
              Datos que tratamos
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>
                <strong>Tokens OAuth:</strong> de acceso y refresco emitidos por Holded al
                autorizar. Nunca almacenamos contraseñas de Holded.
              </li>
              <li>
                <strong>Datos de identificación:</strong> correo electrónico y nombre de usuario
                para vincular la sesión al tenant correcto.
              </li>
              <li>
                <strong>Datos de negocio:</strong> información consultada en tiempo real únicamente
                en respuesta a solicitudes explícitas del usuario.
              </li>
              <li>
                <strong>Logs operativos:</strong> registros técnicos mínimos para seguridad,
                trazabilidad y soporte.
              </li>
            </ul>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ServerCog className="h-4 w-4 text-emerald-600" />
              Finalidad del tratamiento
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>Autenticar y conectar de forma segura tu cuenta de Holded con ChatGPT.</li>
              <li>
                Recuperar datos del negocio en tiempo real para responder las consultas en el chat.
              </li>
              <li>Operar el servicio con seguridad, soporte técnico y trazabilidad mínima.</li>
              <li>
                Cumplir las obligaciones técnicas de la plataforma OpenAI y la normativa aplicable.
              </li>
            </ul>
          </article>
        </div>

        {/* ── OAuth ── */}
        <div className="mt-6 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Lock className="h-4 w-4 text-emerald-600" />
            Flujo OAuth 2.0 con Holded
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Al activar el conector, se te redirige a la página de autorización de Holded. Allí
            aceptas los permisos solicitados y Holded emite un <em>token OAuth</em> que se almacena
            de forma segura en nuestra infraestructura. Este token se usa exclusivamente para
            ejecutar las consultas que solicitas en el chat.
          </p>
          <ul className="mt-3 space-y-1 text-sm leading-7 text-slate-600">
            <li className="flex gap-2">
              <span className="text-emerald-500">✓</span>
              Solo accedemos a los datos que has autorizado expresamente.
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500">✓</span>
              Las operaciones de escritura requieren confirmación explícita tuya.
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500">✓</span>
              Puedes revocar el acceso desde tu cuenta de Holded en cualquier momento.
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500">✓</span>
              Los tokens no se comparten con terceros ajenos al servicio.
            </li>
          </ul>
        </div>

        {/* ── Retención y Seguridad ── */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Scale className="h-4 w-4 text-emerald-600" />
              Retención de datos
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Los tokens OAuth se conservan mientras la integración esté activa. Los logs operativos
              se retienen un máximo de 90 días. Los datos de negocio consultados a través de Holded{' '}
              <strong>no se almacenan</strong> de forma persistente: se recuperan en tiempo real y
              se descartan tras la respuesta.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
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
            <UserCheck className="h-4 w-4 text-emerald-600" />
            Tus derechos (RGPD / GDPR)
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Puedes ejercer los siguientes derechos enviando un correo a{' '}
            <a
              href="mailto:soporte@verifactu.business"
              className="font-semibold text-emerald-700 underline underline-offset-4"
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
              ['Limitación', 'Suspender temporalmente el tratamiento.'],
            ].map(([title, desc]) => (
              <div
                key={title}
                className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {title}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-500">
            También puedes reclamar ante la{' '}
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
            <ServerCog className="h-4 w-4 text-emerald-600" />
            Herramientas utilizadas en el desarrollo
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Este conector ha sido diseñado y desarrollado con la colaboración de IA:
          </p>
          <ul className="mt-2 space-y-1 text-sm leading-7 text-slate-600">
            <li>
              — <strong>Claude Sonnet 4.6</strong> (Anthropic) — arquitectura, código y revisión.
            </li>
            <li>
              — <strong>GitHub Copilot / Codex</strong> (OpenAI/Microsoft) — asistencia en
              autocompletado.
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            Estas herramientas no tienen acceso a los datos de usuarios finales ni a credenciales de
            producción.
          </p>
        </div>

        {/* ── Contacto ── */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Mail className="h-4 w-4 text-emerald-600" />
            Contacto y soporte
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Para cualquier solicitud sobre privacidad, protección de datos o eliminación de tu
            cuenta e integración:
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
              href="/conectores/chatgpt/docs"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <BookOpen className="h-4 w-4" />
              Ver documentación
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
