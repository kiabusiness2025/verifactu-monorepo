import { Database, Lock, Mail, ServerCog, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politica de privacidad | Isaak para Holded',
  description:
    'Politica de privacidad de holded.verifactu.business y del acceso a Holded mediante API key.',
};

export default function HoldedPrivacyPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_45%,#ffffff_100%)] text-slate-900">
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
              <ShieldCheck className="h-4 w-4" />
              Politica de privacidad
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Politica de privacidad de Isaak para Holded
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              Esta pagina resume que datos tratamos, como gestionamos la conexion con Holded y que
              puedes pedirnos como usuario de holded.verifactu.business.
            </p>
            <p className="text-sm text-slate-500">Ultima actualizacion: 25 de marzo de 2026.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:w-[24rem]">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Lock className="h-4 w-4 text-emerald-600" />
              Principio clave
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              La API key de Holded se procesa en el backend, se almacena protegida y no se muestra
              de nuevo en la interfaz despues de enviarla.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Database className="h-4 w-4 text-[#ff5460]" />
              Datos que tratamos
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>
                - Datos de cuenta necesarios para identificar al usuario y mantener su acceso.
              </li>
              <li>
                - Datos de conexion con Holded facilitados por el usuario, incluida la API key.
              </li>
              <li>
                - Datos de negocio consultados a traves de la app, como facturas, contactos,
                movimientos o informacion relacionada con la cuenta conectada.
              </li>
              <li>- Registros operativos necesarios para seguridad, soporte y trazabilidad.</li>
            </ul>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ServerCog className="h-4 w-4 text-[#ff5460]" />
              Para que los usamos
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>- Para conectar tu cuenta con Holded y validar que la API key funciona.</li>
              <li>- Para mostrarte informacion y respuestas relacionadas con tu negocio.</li>
              <li>- Para operar el servicio con seguridad, soporte y trazabilidad minima.</li>
              <li>- Para cumplir obligaciones legales y tecnicas aplicables al servicio.</li>
            </ul>
          </article>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Lock className="h-4 w-4 text-[#ff5460]" />
            Conexion con Holded
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            El usuario decide que cuenta de Holded conecta mediante una API key. Esa clave se
            almacena protegida y se utiliza para acceder a los datos de la cuenta conectada y
            ofrecer la funcionalidad solicitada dentro de Isaak para Holded.
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Puedes reconectar o desconectar la integracion desde el producto cuando esa opcion este
            disponible en tu panel.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Mail className="h-4 w-4 text-[#ff5460]" />
            Derechos y contacto
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Para solicitudes sobre privacidad, soporte o eliminacion de datos, puedes escribir a{' '}
            <a
              href="mailto:info@verifactu.business"
              className="font-semibold text-[#ff5460] underline underline-offset-4"
            >
              info@verifactu.business
            </a>{' '}
            o usar{' '}
            <Link
              href="/support"
              className="font-semibold text-[#ff5460] underline underline-offset-4"
            >
              soporte Holded
            </Link>
            . Esta experiencia esta operada por la entidad responsable de verifactu.business.
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Si activas la casilla opcional de comunicaciones, podremos enviarte novedades y mejoras
            del producto. Ese consentimiento es independiente del acceso al servicio.
          </p>
        </div>
      </section>
    </main>
  );
}
