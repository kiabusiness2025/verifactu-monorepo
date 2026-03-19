import Link from 'next/link';
import Header from '../components/Header';
import { Container, Footer } from '../lib/home/ui';
import { getAppUrl } from '../lib/urls';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  FileSpreadsheet,
  FolderKanban,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';

const navLinks = [
  { label: 'Inicio', href: '/#hero' },
  { label: 'Para quien', href: '/#para-quien' },
  { label: 'Dashboard', href: '/#dashboard' },
  { label: 'Planes', href: '/planes' },
  { label: 'Que es Isaak', href: '/que-es-isaak' },
  { label: 'Contacto', href: '/recursos/contacto' },
];

const faqs = [
  {
    q: 'En que se diferencia Isaak de una IA general como ChatGPT?',
    a: 'Isaak esta entrenado para tu contexto operativo en Verifactu: facturas, gastos, plazos, cierres y trazabilidad. No se limita a responder texto: te ayuda a ejecutar tareas del flujo real.',
  },
  {
    q: 'Isaak aprende de mi empresa?',
    a: 'Si, puede usar contexto de tu tenant para mejorar respuestas: configuracion, historico, documentos y patrones de uso autorizados por tu equipo.',
  },
  {
    q: 'Se comparten mis datos con personas?',
    a: 'No. Tus datos no se comparten con ningun humano sin autorizacion previa del usuario, salvo requerimientos legales aplicables.',
  },
  {
    q: 'Puedo borrar historial y memoria?',
    a: 'Si. Puedes solicitar borrado del historial de chat y reinicio de memoria contextual. Tambien puedes pedir eliminacion completa segun politica de privacidad.',
  },
  {
    q: 'Habra mensajes temporales?',
    a: 'Si. Esta prevista la opcion de mensajes temporales para consultas que no quieras mantener en memoria persistente.',
  },
  {
    q: 'Habra modo voz?',
    a: 'Si. Estamos preparando voz para hablar con Isaak sin teclear: dictado de preguntas y respuesta por audio como funcion adicional.',
  },
];

const operatingCards = [
  {
    title: 'Entiende tu negocio',
    body: 'Explica balances, ventas, gastos e impuestos sin obligarte a pensar como un contable.',
    icon: Wallet,
  },
  {
    title: 'Opera con tus datos',
    body: 'Trabaja sobre Holded y futuras integraciones API desde un unico panel controlado por Verifactu.',
    icon: FileSpreadsheet,
  },
  {
    title: 'Conecta conversacion y accion',
    body: 'No se queda en el chat: prioriza tareas, resume contexto y te lleva al siguiente paso util.',
    icon: MessageSquareText,
  },
];

const mockSignals = [
  {
    label: 'Pendientes detectados',
    value: '3 facturas por revisar',
  },
  {
    label: 'Margen del mes',
    value: '18,4% explicado por Isaak',
  },
  {
    label: 'Siguiente accion',
    value: 'Cobros y gastos prioritarios',
  },
];

const capabilities = [
  'Revisar y extraer datos de facturas, tickets y documentos.',
  'Sugerir acciones para cerrar periodos sin pendientes.',
  'Detectar errores frecuentes antes de que escalen.',
  'Recordarte plazos y tareas clave del calendario fiscal.',
  'Resumirte ventas, gastos y beneficio en lenguaje claro.',
];

const mechanics = [
  'Se integra en tu espacio de trabajo y usa tu contexto autorizado.',
  'Adapta tono y profundidad segun el tipo de consulta.',
  'Prioriza respuestas accionables sobre texto generico.',
  'Mantiene trazabilidad de decisiones y sugerencias relevantes.',
  'Te permite escalar a soporte cuando necesitas ayuda humana.',
];

export default function QueEsIsaakPage() {
  const appUrl = getAppUrl();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      <section className="py-14">
        <Container>
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#f8fbff_34%,#ffffff_70%)] shadow-sm">
            <div className="grid gap-8 p-6 lg:grid-cols-[0.92fr_1.08fr] lg:p-10">
              <div className="flex flex-col justify-center">
                <div className="inline-flex w-fit items-center rounded-full bg-[#2361d8]/10 px-4 py-1.5 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/15">
                  Que es Isaak
                </div>
                <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
                  Tu contable nativo dentro de Verifactu
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Isaak no es un chatbot generico. Es el asistente fiscal y contable de verifactu.business para traducir datos complejos en decisiones claras, contexto operativo y acciones guiadas dentro de tu dashboard.
                </p>

                <div className="mt-6 grid gap-3">
                  {operatingCards.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2361d8]/10 text-[#2361d8]">
                          <item.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#011c67]">{item.title}</div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href={appUrl}
                    className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
                  >
                    Empezar prueba de 30 días
                  </Link>
                  <Link
                    href="/holded"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Probar Isaak for Holded
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/recursos/contacto"
                    className="inline-flex items-center justify-center rounded-full border border-[#2361d8] bg-white px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
                  >
                    Hablar con el equipo
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                <div className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-[#081936] shadow-[0_35px_90px_-35px_rgba(8,25,54,0.7)]">
                  <video
                    className="h-full w-full object-cover"
                    src="/Isaak/isaak_banner_hero_v2.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls={false}
                    poster="/Isaak/Isaak_principal.png"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#2361d8]">
                      <Bot className="h-3.5 w-3.5" />
                      Como se vive Isaak
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      Unifica métricas, tareas, contexto fiscal y decisiones operativas para que el empresario vea qué hacer ahora, no solo qué pasó el mes pasado.
                    </p>
                    <div className="mt-4 space-y-3">
                      {mockSignals.map((item) => (
                        <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] border border-slate-200 bg-[linear-gradient(160deg,#ffffff_0%,#eef4ff_100%)] p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-[#011c67]">Panel de señales</div>
                      <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        En tiempo real
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ventas vs gastos</span>
                          <BadgeCheck className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-100">
                          <div className="h-2 w-[72%] rounded-full bg-[#2361d8]" />
                        </div>
                        <div className="mt-2 text-sm text-slate-600">Isaak detecta desviaciones y te las explica con contexto.</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <FolderKanban className="h-4 w-4 text-[#2361d8]" />
                          Integraciones operativas
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Holded</span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Excel AEAT</span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">CRM y proyectos</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[#ff5460]/20 bg-[#fff7f7] p-4">
                        <div className="flex items-start gap-3">
                          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5460]" />
                          <div>
                            <div className="text-sm font-semibold text-slate-900">Prueba externa con Holded</div>
                            <div className="mt-1 text-sm leading-6 text-slate-600">
                              Si quieres probar a Isaak desde ChatGPT con tu cuenta de Holded, ya tienes una landing específica para hacerlo por tu cuenta.
                            </div>
                            <Link href="/holded" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#ff5460] hover:text-[#ef4654]">
                              Ir a la experiencia Holded
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-[#011c67]">Que puede hacer por ti</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                {capabilities.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-[#011c67]">Como funciona</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                {mechanics.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2361d8]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#011c67]">Isaak vs IA generalista</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-3">Criterio</th>
                    <th className="py-2 pr-3">Isaak</th>
                    <th className="py-2">IA general</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  <tr>
                    <td className="rounded-l-xl bg-slate-50 px-3 py-2">Contexto de tu empresa</td>
                    <td className="bg-emerald-50 px-3 py-2">Si, en tu tenant y con permisos</td>
                    <td className="rounded-r-xl bg-slate-50 px-3 py-2">No por defecto</td>
                  </tr>
                  <tr>
                    <td className="rounded-l-xl bg-slate-50 px-3 py-2">Flujo operativo VeriFactu</td>
                    <td className="bg-emerald-50 px-3 py-2">Especializado</td>
                    <td className="rounded-r-xl bg-slate-50 px-3 py-2">Generico</td>
                  </tr>
                  <tr>
                    <td className="rounded-l-xl bg-slate-50 px-3 py-2">Sugerencias con accion inmediata</td>
                    <td className="bg-emerald-50 px-3 py-2">Si</td>
                    <td className="rounded-r-xl bg-slate-50 px-3 py-2">Depende del prompt</td>
                  </tr>
                  <tr>
                    <td className="rounded-l-xl bg-slate-50 px-3 py-2">Control de historial/memoria</td>
                    <td className="bg-emerald-50 px-3 py-2">Configurable y eliminable</td>
                    <td className="rounded-r-xl bg-slate-50 px-3 py-2">Variable segun proveedor</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#011c67]">Privacidad y control de datos</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Isaak trabaja con controles de acceso por cuenta y tenant. Los datos no se comparten con ningun humano sin autorizacion previa. Puedes solicitar borrado de historial, limpieza de memoria y gestion de retencion. Para detalles legales completos, revisa la{' '}
              <Link href="/legal/privacidad" className="font-semibold text-[#2361d8] hover:text-[#2361d8]">
                politica de privacidad
              </Link>
              .
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-5xl">
            <h2 className="text-2xl font-semibold tracking-tight text-[#011c67]">Preguntas frecuentes sobre Isaak</h2>
            <div className="mt-5 space-y-3">
              {faqs.map((item) => (
                <article key={item.q} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900">{item.q}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.a}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-10 flex max-w-4xl flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:flex-row sm:justify-center sm:flex-wrap">
            <Link
              href={appUrl}
              className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
            >
              Empezar prueba de 30 días
            </Link>
            <Link
              href="/holded"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Probar integracion Holded + ChatGPT
            </Link>
            <Link
              href="/recursos/contacto"
              className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
            >
              Hablar con el equipo
            </Link>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
