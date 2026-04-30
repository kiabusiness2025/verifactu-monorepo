import {
  ArrowRight,
  FileSpreadsheet,
  Link2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

const HOLDED_CONNECTORS_URL = 'https://holded.verifactu.business/conectores';

const useCases = [
  'Que facturas faltan para cerrar el trimestre?',
  'Que IVA aproximado llevo acumulado?',
  'Prepara un resumen para mi asesoria.',
  'Revisa si hay datos incompletos.',
  'Genera una accion pendiente.',
  'Conecta Holded y consulta tus facturas.',
  'Trabaja desde Excel sin migrar todo tu negocio.',
];

const permissionCards = [
  {
    title: 'Modo lectura',
    body: 'Consulta, interpreta y prioriza sin ejecutar cambios fuera de tus herramientas.',
  },
  {
    title: 'Modo ejecucion',
    body: 'Cuando una accion cambia datos, se plantea como paso controlado y no como automatismo ciego.',
  },
  {
    title: 'Aprobaciones, roles y trazabilidad',
    body: 'Permisos configurados por usuario, historico de acciones y aprobaciones previas cuando corresponde.',
  },
];

export default function IsaakPublicPhase1Landing() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#eef4ff_0%,#ffffff_72%)] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                Orquestador empresarial
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-6xl sm:leading-[1.04]">
                Habla con tu empresa. Entiende tus datos. Ejecuta con control.
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                Isaak conecta Excel, documentos, ERP, facturacion, bancos y herramientas
                empresariales para convertir informacion dispersa en respuestas, alertas y acciones
                trazables.
              </p>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700">
                Isaak no es otro ERP. Es la capa inteligente que permite hablar con tu empresa,
                entenderla y ejecutar acciones sobre tus herramientas con control.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
                >
                  Solicitar acceso
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/modos/excel"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Ver modo Excel
                </Link>
                <Link
                  href="/conectores"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Conectar herramientas
                </Link>
                <Link
                  href="/asesorias"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Soy asesoria
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                Dos modos de entrada
              </div>
              <div className="mt-5 grid gap-4">
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">
                    <FileSpreadsheet className="h-5 w-5 text-[#2361d8]" />
                    Modo in-house / Excel
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Para empresas que trabajan con Excel, documentos y exportaciones. Sube o conecta
                    tus archivos, revisa datos, detecta faltantes y genera resumentes accionables.
                  </p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">
                    <Link2 className="h-5 w-5 text-[#2361d8]" />
                    Modo conectado / API
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Para empresas que ya usan Holded, bancos, CRM o ecommerce. Isaak lee, cruza y
                    ayuda a ejecutar tareas con permisos configurados.
                  </p>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-5 md:grid-cols-3">
            <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <Sparkles className="h-6 w-6 text-[#2361d8]" />
              <h2 className="mt-4 text-xl font-semibold text-slate-950">No somos otro ERP</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Isaak no sustituye tu ERP, tu Excel ni tu asesoria. Los conecta y los hace
                comprensibles.
              </p>
            </article>
            <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <ShieldCheck className="h-6 w-6 text-[#2361d8]" />
              <h2 className="mt-4 text-xl font-semibold text-slate-950">Fiscalidad entendible</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Isaak traduce la contabilidad, los impuestos y las obligaciones fiscales a un
                lenguaje que el empresario puede entender.
              </p>
            </article>
            <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <Link2 className="h-6 w-6 text-[#2361d8]" />
              <h2 className="mt-4 text-xl font-semibold text-slate-950">
                Empieza con Excel. Escala con conectores.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                No exigimos una integracion profunda desde el primer dia. Puedes empezar con
                archivos y pasar despues a sistemas conectados.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="permisos" className="border-y border-slate-200 bg-slate-50/70 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              Permisos y control
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Modo lectura, modo ejecucion y permisos configurados por usuario.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {permissionCards.map((card) => (
              <article
                key={card.title}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <LockKeyhole className="h-6 w-6 text-[#2361d8]" />
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              Casos de uso
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Respuestas, alertas y acciones sobre herramientas que ya existen en tu empresa.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {useCases.map((item) => (
              <article
                key={item}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm leading-7 text-slate-700">{item}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 rounded-[2rem] border border-slate-200 bg-[#011c67] p-8 text-white shadow-sm">
            <h2 className="text-2xl font-semibold">
              Conecta Holded y futuros sistemas sin convertir a Isaak en un plugin.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-blue-100">
              Holded es el primer ecosistema conectado. El hub vertical vive en un dominio separado
              para proteger el flujo publico minimo del conector y mantener a Isaak como producto
              orquestador principal.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-blue-100">
              Isaak actua como capa de interpretacion y control. Las integraciones mantienen su
              propio dominio, su propia documentacion y sus propios limites publicos.
            </p>
            <a
              href={HOLDED_CONNECTORS_URL}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#011c67] hover:bg-slate-100"
            >
              Ver conectores Holded
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
