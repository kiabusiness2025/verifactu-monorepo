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
const HOLDED_CLAUDE_URL = 'https://holded.verifactu.business/conectores/claude';

type UseCase = {
  text: string;
  href?: string;
  hrefLabel?: string;
};

const useCases: UseCase[] = [
  { text: 'Que facturas faltan para cerrar el trimestre?' },
  { text: 'Que IVA aproximado llevo acumulado?' },
  { text: 'Prepara un resumen para mi asesoria.' },
  { text: 'Revisa si hay datos incompletos.' },
  { text: 'Genera una accion pendiente.' },
  {
    text: 'Conecta Holded y consulta tus facturas.',
    href: HOLDED_CLAUDE_URL,
    hrefLabel: 'Probar conector Holded para Claude',
  },
  { text: 'Trabaja desde Excel sin migrar todo tu negocio.' },
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
      {/* Cross-link banner: usuarios que vienen del conector Holded en Claude.
          Mantener visible mientras el conector sea la entrada principal de adquisicion. */}
      <div className="border-b border-emerald-100 bg-emerald-50">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-emerald-900">
            <span className="mr-2" aria-hidden>
              👋
            </span>
            <span className="font-semibold">Vienes de Holded?</span> Empieza gratis con nuestro
            conector en Claude.
          </p>
          <a
            href="https://holded.verifactu.business/conectores/claude"
            className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            Abrir conector Holded → Claude
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

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
              <div className="inline-flex items-center rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                Video de presentacion
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <video
                  className="h-full w-full"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  controls
                >
                  <source src="/Personalidad/isaak_banner_hero_v2.mp4" type="video/mp4" />
                  Tu navegador no soporta video HTML5.
                </video>
              </div>

              <div className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                Dos modos de entrada
              </div>
              <div className="mt-3 grid gap-4">
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
            {useCases.map((item) => {
              const baseClasses = 'rounded-[1.5rem] border bg-white p-5 shadow-sm transition';
              if (item.href) {
                return (
                  <a
                    key={item.text}
                    href={item.href}
                    aria-label={item.hrefLabel ?? item.text}
                    className={`${baseClasses} group flex flex-col justify-between gap-3 border-[#2361d8]/30 hover:border-[#2361d8] hover:shadow-md`}
                  >
                    <p className="text-sm leading-7 text-slate-800">{item.text}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2361d8] group-hover:underline">
                      {item.hrefLabel ?? 'Probar ahora'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </a>
                );
              }
              return (
                <article key={item.text} className={`${baseClasses} border-slate-200`}>
                  <p className="text-sm leading-7 text-slate-700">{item.text}</p>
                </article>
              );
            })}
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
