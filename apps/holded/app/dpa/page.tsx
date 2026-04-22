import { Building2, Clock, FileText, Globe, Lock, Mail, Scale, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Acuerdo de tratamiento de datos (DPA) | Holded',
  description:
    'Acuerdo de tratamiento de datos del Conector Holded de verifactu.business. Responsable, encargados, finalidad, base juridica y derechos del interesado.',
};

export default function HoldedDpaPage() {
  return (
    <main className="page-enter min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_45%,#ffffff_100%)] text-slate-900">
      <section className="mx-auto max-w-5xl px-4 py-16">
        {/* ── Header ── */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
              <FileText className="h-4 w-4" />
              Acuerdo de tratamiento de datos
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Data Processing Agreement — DPA
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              Este acuerdo describe cómo tratamos los datos personales y de negocio en el marco del
              Conector Holded de verifactu.business, en cumplimiento del Reglamento (UE) 2016/679
              (RGPD).
            </p>
            <p className="text-sm text-slate-500">Última actualización: 22 de abril de 2026.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:w-[24rem]">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Scale className="h-4 w-4 text-[#ff5460]" />
              Base legal
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              El tratamiento se basa en la <strong>ejecución del contrato</strong> con el usuario
              (art. 6.1.b RGPD) y, cuando aplica, en el <strong>interés legítimo</strong> del
              responsable para la seguridad y mejora del servicio (art. 6.1.f RGPD).
            </p>
          </div>
        </div>

        {/* ── Responsable del tratamiento ── */}
        <article className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Building2 className="h-4 w-4 text-[#ff5460]" />
            Responsable del tratamiento
          </div>
          <div className="mt-3 grid gap-3 text-sm leading-7 text-slate-600 sm:grid-cols-2">
            <div>
              <p className="font-semibold text-slate-800">Entidad</p>
              <p>Expert Estudios Profesionales</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Dominio</p>
              <p>verifactu.business / holded.verifactu.business</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Email de contacto</p>
              <a
                href="mailto:info@verifactu.business"
                className="font-medium text-[#ff5460] underline underline-offset-4"
              >
                info@verifactu.business
              </a>
            </div>
            <div>
              <p className="font-semibold text-slate-800">País</p>
              <p>España (UE)</p>
            </div>
          </div>
        </article>

        {/* ── Encargados del tratamiento ── */}
        <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Globe className="h-4 w-4 text-[#ff5460]" />
            Encargados del tratamiento (subprocesadores)
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Para prestar el servicio contamos con los siguientes subprocesadores:
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Finalidad</th>
                  <th className="px-4 py-3">País</th>
                  <th className="px-4 py-3">Garantías</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {[
                  {
                    name: 'Holded S.L.',
                    purpose: 'Acceso a datos de la cuenta del usuario vía API REST',
                    country: 'España (UE)',
                    guarantee: 'RGPD',
                  },
                  {
                    name: 'OpenAI, Inc.',
                    purpose: 'Procesamiento de lenguaje natural — conector ChatGPT',
                    country: 'EE.UU.',
                    guarantee: 'Cláusulas contractuales tipo (SCC)',
                  },
                  {
                    name: 'Anthropic, PBC',
                    purpose: 'Procesamiento de lenguaje natural — conector Claude',
                    country: 'EE.UU.',
                    guarantee: 'Cláusulas contractuales tipo (SCC)',
                  },
                  {
                    name: 'Prisma / Neon / Supabase',
                    purpose: 'Base de datos de usuarios y tokens de sesión',
                    country: 'UE / EE.UU.',
                    guarantee: 'SCC / DPA del proveedor',
                  },
                  {
                    name: 'Resend Inc.',
                    purpose: 'Envío de emails transaccionales',
                    country: 'EE.UU.',
                    guarantee: 'Cláusulas contractuales tipo (SCC)',
                  },
                  {
                    name: 'Proveedor de hosting',
                    purpose: 'Infraestructura de servidores y alojamiento',
                    country: 'UE',
                    guarantee: 'RGPD',
                  },
                ].map((row) => (
                  <tr key={row.name}>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.purpose}</td>
                    <td className="px-4 py-3">{row.country}</td>
                    <td className="px-4 py-3 text-slate-500">{row.guarantee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        {/* ── Datos y finalidades ── */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="h-4 w-4 text-[#ff5460]" />
              Categorías de datos tratados
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>— Datos identificativos del usuario (email, nombre).</li>
              <li>— API key de Holded (credencial de acceso, almacenada cifrada).</li>
              <li>— Datos de negocio consultados: facturas, contactos, productos, contabilidad.</li>
              <li>— Tokens de sesión y OAuth (identificadores técnicos, TTL limitado).</li>
              <li>— Registros de actividad (logs de operaciones, sin contenido de mensajes).</li>
            </ul>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-[#ff5460]" />
              Medidas de seguridad
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>— Transmisión cifrada mediante TLS/HTTPS en todos los endpoints.</li>
              <li>— API keys almacenadas hasheadas o cifradas en base de datos.</li>
              <li>— Tokens de sesión con TTL corto y revocación explícita disponible.</li>
              <li>— Acceso a datos de producción restringido a personal autorizado.</li>
              <li>— Rate limiting por IP en todos los endpoints públicos.</li>
            </ul>
          </article>
        </div>

        {/* ── Conservación ── */}
        <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Clock className="h-4 w-4 text-[#ff5460]" />
            Plazos de conservación
          </div>
          <div className="mt-3 grid gap-4 text-sm leading-7 text-slate-600 sm:grid-cols-3">
            <div>
              <p className="font-semibold text-slate-800">Tokens de acceso</p>
              <p>1 hora desde su emisión (access token). 30 días (refresh token).</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Cuenta de usuario</p>
              <p>Mientras el usuario mantiene la cuenta activa. Se elimina a petición.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Logs operativos</p>
              <p>Máximo 90 días. No contienen el contenido de las conversaciones.</p>
            </div>
          </div>
        </article>

        {/* ── Transferencias internacionales ── */}
        <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Globe className="h-4 w-4 text-[#ff5460]" />
            Transferencias internacionales de datos
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Algunos subprocesadores (OpenAI, Anthropic, Resend) tienen sede en EE.UU. Las
            transferencias se amparan en las <strong>Cláusulas Contractuales Tipo (SCC)</strong>{' '}
            aprobadas por la Comisión Europea (Decisión 2021/914), en cumplimiento del art. 46 RGPD.
            El responsable del tratamiento verifica periódicamente que los subprocesadores mantienen
            estas garantías actualizadas.
          </p>
        </article>

        {/* ── Derechos ── */}
        <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Lock className="h-4 w-4 text-[#ff5460]" />
            Derechos del interesado (RGPD)
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            En virtud del RGPD, tienes derecho a:
          </p>
          <div className="mt-3 grid gap-3 text-sm leading-7 text-slate-600 sm:grid-cols-2">
            {[
              ['Acceso', 'Solicitar confirmación de qué datos tratamos sobre ti.'],
              ['Rectificación', 'Corregir datos inexactos o incompletos.'],
              ['Supresión', 'Eliminar tus datos cuando ya no sean necesarios.'],
              ['Portabilidad', 'Recibir tus datos en formato estructurado y legible.'],
              ['Oposición', 'Oponerte al tratamiento basado en interés legítimo.'],
              ['Limitación', 'Restringir el tratamiento en determinadas circunstancias.'],
            ].map(([title, desc]) => (
              <div key={title}>
                <p className="font-semibold text-slate-800">{title}</p>
                <p>{desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            También puedes presentar una reclamación ante la{' '}
            <a
              href="https://www.aepd.es"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#ff5460] underline underline-offset-4"
            >
              Agencia Española de Protección de Datos (AEPD)
            </a>
            .
          </p>
        </article>

        {/* ── Contacto ── */}
        <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Mail className="h-4 w-4 text-[#ff5460]" />
            Contacto y ejercicio de derechos
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Para ejercer cualquiera de estos derechos o para cualquier consulta sobre este acuerdo,
            escribe a{' '}
            <a
              href="mailto:info@verifactu.business"
              className="font-semibold text-[#ff5460] underline underline-offset-4"
            >
              info@verifactu.business
            </a>{' '}
            indicando tu solicitud en el asunto. Responderemos en el plazo máximo de 30 días hábiles
            establecido por el RGPD.
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Para soporte técnico del producto, utiliza{' '}
            <Link
              href="/support"
              className="font-semibold text-[#ff5460] underline underline-offset-4"
            >
              soporte Holded
            </Link>
            .
          </p>
        </article>
      </section>
    </main>
  );
}
