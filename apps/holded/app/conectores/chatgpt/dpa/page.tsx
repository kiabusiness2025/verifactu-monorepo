/**
 * F4.1b (revisita) — DPA themed para el conector ChatGPT.
 *
 * Sustituye el re-export de la pagina raiz `/dpa` (Holded brand rojo) por una
 * version que usa `ConnectorPageShell` + theme verde ChatGPT, en linea con
 * terms/privacy. La estructura de contenido sigue el RGPD (responsable,
 * subprocesadores, finalidades, conservacion, transferencias internacionales,
 * derechos del interesado) y enfatiza OpenAI como subprocesador relevante.
 */

import { Building2, Clock, FileText, Globe, Lock, Mail, Scale, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ConnectorPageHero, ConnectorPageShell } from '@/app/components/ConnectorPageShell';

export const metadata: Metadata = {
  title:
    'Acuerdo de tratamiento de datos (DPA) | Conector Holded para ChatGPT — Verifactu Business',
  description:
    'DPA del conector Holded para ChatGPT (OpenAI). Responsable del tratamiento, subprocesadores, base juridica RGPD, transferencias internacionales y derechos del interesado.',
  alternates: { canonical: '/conectores/chatgpt/dpa' },
};

const SUBPROCESSORS = [
  {
    name: 'Holded S.L.',
    purpose: 'Acceso a datos de la cuenta del usuario via API REST',
    country: 'España (UE)',
    guarantee: 'RGPD',
  },
  {
    name: 'OpenAI, Inc.',
    purpose: 'Procesamiento de lenguaje natural — ChatGPT',
    country: 'EE.UU.',
    guarantee: 'Cláusulas contractuales tipo (SCC)',
  },
  {
    name: 'Render / Vercel',
    purpose: 'Infraestructura y alojamiento del conector',
    country: 'EE.UU. / UE',
    guarantee: 'SCC / DPA del proveedor',
  },
  {
    name: 'Neon (PostgreSQL gestionado)',
    purpose: 'Base de datos de usuarios, conexiones y tokens',
    country: 'UE',
    guarantee: 'RGPD',
  },
  {
    name: 'Resend Inc.',
    purpose: 'Envío de emails transaccionales (avisos, soporte)',
    country: 'EE.UU.',
    guarantee: 'Cláusulas contractuales tipo (SCC)',
  },
];

const DATA_CATEGORIES = [
  'Datos identificativos del usuario (email, nombre).',
  'API key de Holded (credencial de acceso, almacenada cifrada).',
  'Datos de negocio consultados: facturas, contactos, productos, contabilidad, proyectos.',
  'Tokens OAuth (access token TTL corto, refresh token con rotacion).',
  'Registros de actividad (logs de operaciones, sin contenido de prompts).',
];

const SECURITY_MEASURES = [
  'Transmisión cifrada mediante TLS/HTTPS en todos los endpoints.',
  'API keys almacenadas hasheadas o cifradas en base de datos.',
  'Tokens de sesión y OAuth con TTL corto y revocación explícita disponible.',
  'Acceso a datos de producción restringido a personal autorizado y auditado.',
  'Rate limiting por IP en todos los endpoints públicos.',
  'Auditoría de eventos en `external_connection_audit_logs` y `holded_mcp_pat_audit_logs`.',
];

const RIGHTS = [
  ['Acceso', 'Solicitar confirmación de qué datos tratamos sobre ti.'],
  ['Rectificación', 'Corregir datos inexactos o incompletos.'],
  ['Supresión', 'Eliminar tus datos cuando ya no sean necesarios.'],
  ['Portabilidad', 'Recibir tus datos en formato estructurado y legible.'],
  ['Oposición', 'Oponerte al tratamiento basado en interés legítimo.'],
  ['Limitación', 'Restringir el tratamiento en determinadas circunstancias.'],
] as const;

export default function ChatGPTDpaPage() {
  return (
    <ConnectorPageShell provider="chatgpt" kind="dpa">
      <ConnectorPageHero
        provider="chatgpt"
        badgeIcon={<FileText className="h-4 w-4" />}
        badgeLabel="Acuerdo de tratamiento de datos"
        title="Data Processing Agreement"
        subtitle="Conector Holded para ChatGPT"
        intro={
          <>
            Este acuerdo describe cómo tratamos los datos personales y de negocio en el marco del{' '}
            <strong>Conector Holded para ChatGPT</strong>, en cumplimiento del Reglamento (UE)
            2016/679 (RGPD).
          </>
        }
        lastUpdated="Última actualización: 7 de mayo de 2026."
        asideCard={
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Scale className="h-4 w-4 text-emerald-600" />
              Base legal
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              El tratamiento se basa en la <strong>ejecución del contrato</strong> con el usuario
              (art. 6.1.b RGPD) y, cuando aplica, en el <strong>interés legítimo</strong> del
              responsable para la seguridad y mejora del servicio (art. 6.1.f RGPD).
            </p>
          </>
        }
      />

      {/* ── Responsable del tratamiento ── */}
      <article className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Building2 className="h-4 w-4 text-emerald-600" />
          Responsable del tratamiento
        </div>
        <div className="mt-3 grid gap-3 text-sm leading-7 text-slate-600 sm:grid-cols-2">
          <div>
            <p className="font-semibold text-slate-800">Entidad</p>
            <p>Expert Estudios Profesionales, SLU</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Dominio</p>
            <p>holded.verifactu.business</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Email de contacto</p>
            <a
              href="mailto:soporte@verifactu.business"
              className="font-medium text-emerald-700 underline underline-offset-4"
            >
              soporte@verifactu.business
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
          <Globe className="h-4 w-4 text-emerald-600" />
          Encargados del tratamiento (subprocesadores)
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Para prestar el servicio del conector ChatGPT contamos con los siguientes subprocesadores:
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-emerald-50/60 text-left text-xs font-semibold uppercase tracking-wide text-emerald-800">
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Finalidad</th>
                <th className="px-4 py-3">País</th>
                <th className="px-4 py-3">Garantías</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {SUBPROCESSORS.map((row) => (
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

      {/* ── Datos y medidas ── */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileText className="h-4 w-4 text-emerald-600" />
            Categorías de datos tratados
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
            {DATA_CATEGORIES.map((item) => (
              <li key={item}>— {item}</li>
            ))}
          </ul>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Medidas de seguridad
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
            {SECURITY_MEASURES.map((item) => (
              <li key={item}>— {item}</li>
            ))}
          </ul>
        </article>
      </div>

      {/* ── Conservación ── */}
      <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Clock className="h-4 w-4 text-emerald-600" />
          Plazos de conservación
        </div>
        <div className="mt-3 grid gap-4 text-sm leading-7 text-slate-600 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-slate-800">Tokens OAuth</p>
            <p>Access token: 1 hora. Refresh token: 30 días con rotación en cada uso.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Cuenta de usuario</p>
            <p>Mientras la cuenta esté activa. Se elimina a petición en 30 días.</p>
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
          <Globe className="h-4 w-4 text-emerald-600" />
          Transferencias internacionales de datos
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          OpenAI y Resend tienen sede en EE.UU. Las transferencias se amparan en las{' '}
          <strong>Cláusulas Contractuales Tipo (SCC)</strong> aprobadas por la Comisión Europea
          (Decisión 2021/914), en cumplimiento del art. 46 RGPD. El responsable del tratamiento
          verifica periódicamente que los subprocesadores mantienen estas garantías actualizadas.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Para los detalles del tratamiento que realiza OpenAI sobre los prompts y respuestas
          generados en ChatGPT, consulta su{' '}
          <a
            href="https://openai.com/policies/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-700 underline underline-offset-4"
          >
            Política de privacidad de OpenAI
          </a>
          .
        </p>
      </article>

      {/* ── Derechos del interesado ── */}
      <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Lock className="h-4 w-4 text-emerald-600" />
          Derechos del interesado (RGPD)
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          En virtud del RGPD, tienes derecho a:
        </p>
        <div className="mt-3 grid gap-3 text-sm leading-7 text-slate-600 sm:grid-cols-2">
          {RIGHTS.map(([title, desc]) => (
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
            className="font-medium text-emerald-700 underline underline-offset-4"
          >
            Agencia Española de Protección de Datos (AEPD)
          </a>
          .
        </p>
      </article>

      {/* ── Contacto ── */}
      <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Mail className="h-4 w-4 text-emerald-600" />
          Contacto y ejercicio de derechos
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Para ejercer cualquiera de estos derechos o para cualquier consulta sobre este acuerdo,
          escribe a{' '}
          <a
            href="mailto:soporte@verifactu.business"
            className="font-semibold text-emerald-700 underline underline-offset-4"
          >
            soporte@verifactu.business
          </a>{' '}
          indicando tu solicitud en el asunto. Responderemos en el plazo máximo de 30 días hábiles
          establecido por el RGPD.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Para soporte técnico del producto, utiliza{' '}
          <Link
            href="/conectores/chatgpt/soporte"
            className="font-semibold text-emerald-700 underline underline-offset-4"
          >
            soporte del conector ChatGPT
          </Link>
          .
        </p>
      </article>
    </ConnectorPageShell>
  );
}
