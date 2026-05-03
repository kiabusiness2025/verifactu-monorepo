import {
  Clock,
  Database,
  KeyRound,
  Lock,
  Mail,
  ServerCog,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politica de privacidad | Conector Holded para Claude',
  description:
    'Politica de privacidad especifica del conector Holded para Claude operado por Verifactu Business.',
  alternates: {
    canonical: '/conectores/claude/privacy',
  },
};

const dataCategories = [
  'Datos de cuenta necesarios para identificar al usuario y mantener su acceso.',
  'Datos de conexion con Holded facilitados por el usuario, incluida la API key.',
  'Datos de negocio consultados en Holded, como facturas, contactos, productos, contabilidad, proyectos y tesoreria.',
  'Metadatos tecnicos de OAuth, MCP, sesion, seguridad, soporte y trazabilidad operativa.',
];

const purposes = [
  'Conectar la cuenta de Holded con Claude mediante el servidor MCP operado por Verifactu Business.',
  'Responder a consultas del usuario sobre sus datos de Holded dentro de Claude.',
  'Crear borradores o artefactos revisables cuando el usuario lo solicita y el alcance del conector lo permite.',
  'Mantener seguridad, auditoria tecnica, soporte y continuidad del servicio.',
];

const safeguards = [
  'La API key de Holded se procesa en backend y se almacena protegida.',
  'La API key no se envia a Anthropic.',
  'El conector no mueve dinero, no envia emails automaticamente y no cierra contabilidad de forma autonoma.',
  'Los borradores requieren revision o confirmacion del usuario antes de cualquier accion final.',
];

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck;
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

export default function ClaudePrivacyPage() {
  return (
    <main className="page-enter min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fffbeb_45%,#ffffff_100%)] text-slate-900">
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <ShieldCheck className="h-4 w-4" />
              Politica de privacidad
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Privacidad del Conector Holded para Claude
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              Esta pagina explica que datos se tratan cuando conectas Holded con Claude mediante el
              servidor MCP operado por Verifactu Business.
            </p>
            <p className="text-sm text-slate-500">Ultima actualizacion: 25 de abril de 2026.</p>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm lg:w-[24rem]">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Lock className="h-4 w-4 text-emerald-600" />
              Principio clave
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Verifactu Business opera el conector. Claude es el canal desde el que el usuario pide
              acciones o consultas. Holded es el origen de los datos conectados por el usuario.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <SectionCard icon={Database} title="Datos que tratamos">
            <ul className="space-y-2">
              {dataCategories.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard icon={ServerCog} title="Para que los usamos">
            <ul className="space-y-2">
              {purposes.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SectionCard icon={KeyRound} title="API key de Holded">
            <p>
              La API key de Holded se usa para validar la conexion y consultar la cuenta de Holded
              autorizada por el usuario. Se procesa en backend, se almacena protegida y no se
              muestra de nuevo en la interfaz despues de enviarla.
            </p>
          </SectionCard>

          <SectionCard icon={UserCheck} title="Uso dentro de Claude">
            <p>
              Cuando el usuario hace una consulta desde Claude, Anthropic puede procesar el texto de
              la conversacion y la respuesta generada. El conector solo devuelve a Claude la
              informacion necesaria para responder a la solicitud del usuario.
            </p>
          </SectionCard>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SectionCard icon={ShieldCheck} title="Limitaciones de seguridad">
            <ul className="space-y-2">
              {safeguards.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard icon={Clock} title="Retención de datos">
            <ul className="space-y-2">
              <li>
                - <strong>API key de Holded:</strong> se conserva cifrada (AES-256-GCM) mientras la
                conexión está activa. Se elimina al desconectar el conector o al revocar el acceso
                OAuth.
              </li>
              <li>
                - <strong>Tokens OAuth:</strong> los access tokens expiran a los 60 minutos. Los
                refresh tokens se anulan al revocar el acceso.
              </li>
              <li>
                - <strong>Datos de Holded (facturas, contactos, etc.):</strong> se procesan en
                tránsito para responder la consulta. No se almacenan en servidores de Verifactu más
                allá del tiempo de respuesta de la llamada.
              </li>
              <li>
                - <strong>Metadatos de sesión:</strong> los registros de auditoría técnica se
                conservan un máximo de 90 días y se eliminan de forma automática.
              </li>
            </ul>
          </SectionCard>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SectionCard icon={Mail} title="Derechos y contacto">
            <p>
              Para solicitudes sobre privacidad, soporte o eliminacion de datos, escribe a{' '}
              <a
                href="mailto:info@verifactu.business"
                className="font-semibold text-amber-700 underline underline-offset-4"
              >
                info@verifactu.business
              </a>{' '}
              o utiliza{' '}
              <Link
                href="/support"
                className="font-semibold text-amber-700 underline underline-offset-4"
              >
                soporte del conector
              </Link>
              .
            </p>
          </SectionCard>
        </div>

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
            href="/conectores/claude/dpa"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ver DPA
          </Link>
        </div>
      </section>
    </main>
  );
}
