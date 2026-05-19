import { Building2, Clock, FileText, Globe, Lock, Mail, Scale, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ConnectorPageHero, ConnectorPageShell } from '@/app/components/ConnectorPageShell';

export const metadata: Metadata = {
  title: 'DPA | Conector Holded para Claude',
  description:
    'Acuerdo de tratamiento de datos especifico del conector Holded para Claude operado por Verifactu Business.',
  alternates: {
    canonical: '/conectores/claude/dpa',
  },
};

const subprocessors = [
  {
    name: 'Holded S.L.',
    purpose: 'Acceso a datos de la cuenta de Holded autorizada por el usuario via API.',
    country: 'Espana / UE',
    guarantee: 'RGPD',
  },
  {
    name: 'Anthropic, PBC',
    purpose: 'Procesamiento de lenguaje natural cuando el usuario usa el conector desde Claude.',
    country: 'EE.UU.',
    guarantee: 'SCC / DPA del proveedor cuando aplique',
  },
  {
    name: 'Neon (Neon, Inc.)',
    purpose:
      'PostgreSQL gestionado para persistencia de usuarios, tenants, conexiones, tokens cifrados y trazas operativas. La API key de Holded se almacena cifrada con AES-256-GCM (la clave maestra vive solo en variables de entorno del servidor, nunca en BD).',
    country: 'UE (Frankfurt)',
    guarantee: 'SCC + DPA Neon firmado',
  },
  {
    name: 'Vercel Inc.',
    purpose:
      'Alojamiento del frontend (apps/holded, apps/app) y endpoints OAuth proxy. Region edge UE preferida.',
    country: 'UE / EE.UU.',
    guarantee: 'SCC + DPA Vercel firmado',
  },
  {
    name: 'Railway (Railway Corp.)',
    purpose:
      'Alojamiento del servidor MCP standalone (apps/holded-mcp) accesible en claude.verifactu.business.',
    country: 'EE.UU.',
    guarantee: 'SCC / DPA del proveedor cuando aplique',
  },
  {
    name: 'Resend Inc.',
    purpose: 'Envio de emails transaccionales y soporte operativo.',
    country: 'EE.UU.',
    guarantee: 'SCC / DPA del proveedor',
  },
];

const dataTypes = [
  'Datos identificativos del usuario: email, nombre y datos de cuenta.',
  'Datos de tenant o empresa necesarios para operar la conexion.',
  'API key de Holded, almacenada protegida y usada para consultar la cuenta autorizada.',
  'Datos de negocio consultados en Holded: facturas, contactos, productos, contabilidad, proyectos y tesoreria.',
  'Tokens OAuth, identificadores tecnicos de sesion y logs operativos.',
];

const securityMeasures = [
  'Transmision cifrada mediante HTTPS/TLS.',
  'API keys y secretos tratados server-side y protegidos en almacenamiento.',
  'Tokens OAuth con duracion limitada y posibilidad de revocacion.',
  'Acceso administrativo restringido al personal autorizado.',
  'Registros operativos limitados a seguridad, soporte y trazabilidad tecnica.',
];

function LegalCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Scale;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Icon className="h-4 w-4 text-amber-600" />
        {title}
      </div>
      <div className="mt-3 text-sm leading-7 text-slate-600">{children}</div>
    </article>
  );
}

export default function ClaudeDpaPage() {
  return (
    <ConnectorPageShell provider="claude" kind="dpa">
      <ConnectorPageHero
        provider="claude"
        badgeIcon={<FileText className="h-4 w-4" />}
        badgeLabel="Data Processing Agreement"
        title="DPA del Conector Holded para Claude"
        intro={
          <>
            Este acuerdo describe el tratamiento de datos personales y de negocio cuando el usuario
            conecta Holded con Claude mediante el servidor MCP operado por Verifactu Business.
          </>
        }
        lastUpdated="Ultima actualizacion: 11 de mayo de 2026."
        asideCard={
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Scale className="h-4 w-4 text-amber-600" />
              Marco de tratamiento
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Verifactu Business actua como operador del conector. El usuario autoriza la conexion
              con Holded y decide usar Claude como canal conversacional.
            </p>
          </>
        }
      />

      <LegalCard icon={Building2} title="Responsable y operador del conector">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="font-semibold text-slate-800">Entidad</p>
            <p>Expert Estudios Profesionales</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Dominio</p>
            <p>holded.verifactu.business</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Email de contacto</p>
            <a
              href="mailto:soporte@verifactu.business"
              className="font-medium text-amber-700 underline underline-offset-4"
            >
              soporte@verifactu.business
            </a>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Pais</p>
            <p>Espana / UE</p>
          </div>
        </div>
      </LegalCard>

      <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Globe className="h-4 w-4 text-amber-600" />
          Subprocesadores principales
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          La lista puede actualizarse cuando cambie la infraestructura o el proveedor de servicios.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Finalidad</th>
                <th className="px-4 py-3">Pais</th>
                <th className="px-4 py-3">Garantias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {subprocessors.map((row) => (
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

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <LegalCard icon={FileText} title="Categorias de datos">
          <ul className="space-y-2">
            {dataTypes.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </LegalCard>

        <LegalCard icon={ShieldCheck} title="Medidas de seguridad">
          <ul className="space-y-2">
            {securityMeasures.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </LegalCard>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <LegalCard icon={Clock} title="Conservacion">
          <p>
            Los tokens tecnicos se conservan durante el tiempo necesario para operar la sesion y la
            conexion. Los datos de cuenta y conexion se conservan mientras el usuario mantiene el
            servicio activo o hasta que solicite la eliminacion o desconexion. Los logs operativos
            se limitan a seguridad, soporte y trazabilidad tecnica.
          </p>
        </LegalCard>

        <LegalCard icon={Lock} title="Transferencias internacionales">
          <p>
            Algunos proveedores pueden tratar datos fuera del Espacio Economico Europeo. Cuando
            aplique, las transferencias se amparan en clausulas contractuales tipo, DPA del
            proveedor u otros mecanismos validos bajo RGPD.
          </p>
        </LegalCard>
      </div>

      <LegalCard icon={Mail} title="Ejercicio de derechos">
        <p>
          Para ejercer derechos de acceso, rectificacion, supresion, oposicion, limitacion o
          portabilidad, escribe a{' '}
          <a
            href="mailto:soporte@verifactu.business"
            className="font-semibold text-amber-700 underline underline-offset-4"
          >
            soporte@verifactu.business
          </a>
          . Tambien puedes contactar con{' '}
          <Link
            href="/conectores/claude/soporte"
            className="font-semibold text-amber-700 underline underline-offset-4"
          >
            soporte del conector
          </Link>
          .
        </p>
      </LegalCard>

      <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ShieldCheck className="h-4 w-4 text-amber-600" />
          Marcas y no afiliacion
        </div>
        <p className="mt-3">
          Verifactu Business no esta afiliado, patrocinado ni respaldado por Anthropic ni por
          Holded. Anthropic, Claude y Holded son marcas de sus respectivos titulares.
        </p>
      </article>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/conectores/claude"
          className="inline-flex items-center justify-center rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Volver al conector Claude
        </Link>
        <Link
          href="/conectores/claude/privacy"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Ver privacidad
        </Link>
      </div>
    </ConnectorPageShell>
  );
}
