import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  FileCheck2,
  Radar,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import Link from 'next/link';
import { APP_URL, CONTACT_URL, HOLDed_URL } from './lib/isaak-navigation';

const valueCards = [
  {
    title: 'Entiende lo importante antes',
    body: 'Isaak traduce ventas, gastos, cobros, impuestos y operativa en prioridades claras para hoy.',
    icon: Radar,
  },
  {
    title: 'Trabaja con datos reales',
    body: 'No vive solo en un chat. Se apoya en datos de tu negocio, documentos e integraciones compatibles para ayudarte de verdad.',
    icon: Workflow,
  },
  {
    title: 'Reduce errores y fricción',
    body: 'Te ayuda a detectar pendientes, revisar borradores, anticipar riesgos y llegar con más calma a cierres y plazos.',
    icon: FileCheck2,
  },
];

const signalCards = [
  { label: 'Prioridad operativa', value: 'Cobros, gastos y plazos en un mismo criterio' },
  { label: 'Capa fiscal', value: 'Pensado para Verifactu, trazabilidad y control' },
  { label: 'Compatibilidad', value: 'Holded es una entrada; Isaak mantiene la voz y el criterio' },
];

const capabilities = [
  'Explicar con claridad facturas, cobros, gastos y señales de riesgo.',
  'Priorizar qué revisar primero para no perder tiempo en menús y detalles dispersos.',
  'Ayudar a preparar acciones como borradores, revisiones y siguientes pasos.',
  'Recordar contexto y conversaciones para responder con continuidad operativa.',
  'Escalar a flujos más profundos de Isaak cuando necesitas más contexto y control.',
];

const mechanics = [
  'Isaak opera con su propia identidad y usa contexto autorizado por usuario y tenant.',
  'Trabaja sobre datos reales del negocio, no solo sobre texto aislado en una ventana de chat.',
  'Puede empezar con ERPs compatibles como Holded sin que esa compatibilidad defina toda la marca.',
  'Antes de responder, puede apoyarse en historial, integraciones y señales de negocio relevantes.',
  'Cuando una acción cambia datos fuera, Isaak pide confirmación explícita antes de ejecutarla.',
];

const faqs = [
  {
    q: '¿Isaak es solo una compatibilidad puntual o un producto completo?',
    a: 'No. Holded puede ser una compatibilidad de entrada, pero la propuesta central es Isaak como producto propio con identidad, criterio y experiencia independientes.',
  },
  {
    q: '¿En qué se diferencia Isaak de una IA generalista?',
    a: 'Isaak está pensado para control fiscal, operativa, Verifactu, errores frecuentes, documentos y datos reales del negocio. No responde solo por estilo: responde con contexto, prioridad y siguiente paso.',
  },
  {
    q: '¿Puede trabajar con más integraciones aparte de Holded?',
    a: 'Sí. Holded es una compatibilidad de entrada, pero la arquitectura se está preparando para abrirse a más ERPs, documentos y fuentes de contexto sin cambiar la identidad de Isaak.',
  },
  {
    q: '¿Isaak recuerda conversaciones y contexto?',
    a: 'Ese es justo el camino actual: una memoria privada propia de Isaak para ayudarte con continuidad real, sin depender de una memoria genérica del canal donde entres.',
  },
];

export default function IsaakHomePage() {
  return (
    <main className="min-h-screen py-14 text-slate-900">
      <div className="mx-auto max-w-6xl px-4">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#f8fbff_34%,#ffffff_70%)] shadow-sm">
          <div className="grid gap-8 p-6 lg:grid-cols-[0.92fr_1.08fr] lg:p-10">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center rounded-full bg-[#2361d8]/10 px-4 py-1.5 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/15">
                Isaak
              </div>
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
                Tu asistente fiscal inteligente para trabajar con datos reales.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Isaak no se limita a responder texto. Te ayuda a entender qué pasa en tu negocio, a
                priorizar lo importante y a reducir errores fiscales y operativos usando contexto
                real de tu empresa.
              </p>

              <div className="mt-6 grid gap-3">
                {valueCards.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm"
                  >
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
                <a
                  href={APP_URL}
                  className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
                >
                  Activar Isaak 30 días
                </a>
                <a
                  href={HOLDed_URL}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ver una compatibilidad activa
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href={CONTACT_URL}
                  className="inline-flex items-center justify-center rounded-full border border-[#2361d8] bg-white px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
                >
                  Hablar con el equipo
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-white/70 bg-[linear-gradient(135deg,#081936_0%,#0f2660_45%,#2361d8_100%)] p-6 shadow-[0_35px_90px_-35px_rgba(8,25,54,0.7)]">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/90">
                  <Bot className="h-3.5 w-3.5" />
                  Video de presentación
                </div>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Mira cómo habla Isaak de tu negocio desde el primer minuto.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
                  Este video resume la propuesta de valor de Isaak y su forma de trabajar: claridad,
                  prioridad y siguiente paso con contexto real.
                </p>

                <div className="mt-6 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/50">
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
                    Tu navegador no soporta vídeo HTML5.
                  </video>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#2361d8]">
                    <Bot className="h-3.5 w-3.5" />
                    Cómo trabaja Isaak
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    Une contexto fiscal, operativa y decisiones diarias para que el empresario no
                    tenga que traducir solo lo que ve en su ERP o en su dashboard.
                  </p>
                  <div className="mt-4 space-y-3">
                    {signalCards.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {item.label}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.4rem] border border-slate-200 bg-[linear-gradient(160deg,#ffffff_0%,#eef4ff_100%)] p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-[#011c67]">Chatbot de Isaak</div>
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      Avatar oficial
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <img
                        src="/Personalidad/Isaak%20Avatar.png"
                        alt="Avatar de Isaak"
                        className="h-12 w-12 rounded-full border border-slate-200 object-cover"
                      />
                      <div className="flex-1">
                        <div className="rounded-2xl bg-[#f5f9ff] px-3 py-2 text-sm text-slate-700">
                          Veo tres prioridades hoy: cobros vencidos, gastos sin clasificar y cierre
                          de impuestos.
                        </div>
                        <div className="mt-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
                          ¿Quieres que te deje un plan de acción en 5 minutos?
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Asistente activo
                      </span>
                      <BadgeCheck className="h-4 w-4 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#011c67]">Qué puede hacer por ti</h2>
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
            <h2 className="text-base font-semibold text-[#011c67]">Cómo funciona</h2>
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
          <h2 className="text-lg font-semibold text-[#011c67]">
            Isaak frente a una IA generalista
          </h2>
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
                  <td className="rounded-l-xl bg-slate-50 px-3 py-2">Contexto de negocio</td>
                  <td className="bg-emerald-50 px-3 py-2">Sí, con tenant, memoria y permisos</td>
                  <td className="rounded-r-xl bg-slate-50 px-3 py-2">No por defecto</td>
                </tr>
                <tr>
                  <td className="rounded-l-xl bg-slate-50 px-3 py-2">Foco fiscal y operativo</td>
                  <td className="bg-emerald-50 px-3 py-2">Especializado</td>
                  <td className="rounded-r-xl bg-slate-50 px-3 py-2">Genérico</td>
                </tr>
                <tr>
                  <td className="rounded-l-xl bg-slate-50 px-3 py-2">Siguiente paso útil</td>
                  <td className="bg-emerald-50 px-3 py-2">Sí, orientado a acción</td>
                  <td className="rounded-r-xl bg-slate-50 px-3 py-2">Depende del prompt</td>
                </tr>
                <tr>
                  <td className="rounded-l-xl bg-slate-50 px-3 py-2">
                    Puerta a automatización y control
                  </td>
                  <td className="bg-emerald-50 px-3 py-2">
                    Sí, dentro de la experiencia propia de Isaak
                  </td>
                  <td className="rounded-r-xl bg-slate-50 px-3 py-2">No integrada por defecto</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#011c67]">Privacidad y control</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Isaak trabaja con controles por usuario y tenant. La memoria, el historial y los
            documentos deben responder a una idea muy clara: ayudarte mejor sin perder control ni
            trazabilidad. Para detalles legales completos, revisa la{' '}
            <Link href="/privacy" className="font-semibold text-[#2361d8] hover:text-[#2361d8]">
              política de privacidad
            </Link>
            .
          </p>
        </div>

        <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-[#ff5460]/20 bg-[#ff5460]/5 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Capacidades reales hoy con Holded
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Para mantener una promesa clara, estas son capacidades ya disponibles en producción
            cuando conectas Holded.
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>Lectura de facturas, contactos, cuentas, proyectos y tareas con contexto.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>Priorización operativa en lenguaje claro para decidir qué hacer primero.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>Acciones sensibles solo con confirmación explícita del usuario.</span>
            </li>
          </ul>
          <div className="mt-5">
            <a
              href="https://holded.verifactu.business/capacidades"
              className="inline-flex items-center justify-center rounded-full border border-[#ff5460]/35 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Ver detalle completo de capacidades
            </a>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-5xl">
          <h2 className="text-2xl font-semibold tracking-tight text-[#011c67]">
            Preguntas frecuentes sobre Isaak
          </h2>
          <div className="mt-5 space-y-3">
            {faqs.map((item) => (
              <article
                key={item.q}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="text-base font-semibold text-slate-900">{item.q}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.a}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-4xl flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:flex-row sm:justify-center sm:flex-wrap">
          <a
            href={APP_URL}
            className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
          >
            Activar Isaak 30 días
          </a>
          <a
            href={HOLDed_URL}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver compatibilidad con Holded
          </a>
          <a
            href={CONTACT_URL}
            className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
          >
            Hablar con el equipo
          </a>
        </div>
      </div>
    </main>
  );
}
