import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BookOpenText,
  BriefcaseBusiness,
  FileSpreadsheet,
  FolderKanban,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { getAppUrl } from '../../../lib/urls';

export const metadata: Metadata = {
  title: 'Isaak for Holded | Verifactu Business',
  description:
    'Asistente fiscal y contable para usuarios de Holded dentro de Verifactu Business. Consulta facturas, contactos, cuentas, CRM y proyectos con ayuda guiada por Isaak.',
};

const capabilities = [
  {
    title: 'Facturas y borradores',
    body: 'Consulta facturas, revisa contexto antes de actuar y crea borradores con confirmacion explicita.',
    icon: FileSpreadsheet,
  },
  {
    title: 'Contabilidad explicada',
    body: 'Isaak traduce cuentas, ventas, gastos y beneficio a lenguaje claro para empresarios no contables.',
    icon: BookOpenText,
  },
  {
    title: 'CRM y agenda comercial',
    body: 'Lee contactos y bookings para conectar actividad comercial con el estado real del negocio.',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Proyectos y tareas',
    body: 'Explica progreso de proyectos y tareas desde Holded sin obligarte a navegar menus tecnicos.',
    icon: FolderKanban,
  },
];

const publicScope = [
  'Invoice API: listar facturas, obtener factura y crear borradores con confirmacion.',
  'Accounting API: listar cuentas contables para lectura y explicacion.',
  'CRM API: listar contactos y bookings para contexto comercial.',
  'Projects API: listar proyectos, consultar un proyecto y listar sus tareas.',
];

const guardrails = [
  'OAuth propio de Verifactu para identificar al usuario y resolver su tenant autorizado.',
  'La API key de Holded nunca sale al cliente; permanece cifrada y solo se usa server-side.',
  'Las acciones de escritura requieren confirmacion explicita.',
  'El alcance inicial publico deja Team API fuera para reducir exposicion de datos sensibles.',
];

export default function IsaakForHoldedPage() {
  const appUrl = getAppUrl();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fbff_35%,#ffffff_72%)] text-slate-900">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link
            href="/producto/integraciones"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#2361d8] hover:text-[#1f55c0]"
          >
            Volver a integraciones
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
            <Sparkles className="h-4 w-4 text-[#2361d8]" />
            Public app candidate
          </div>
        </div>
      </div>

      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-4 py-1.5 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/15">
              Isaak for Holded
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
              El contable nativo de Verifactu para usuarios de Holded
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Isaak convierte Holded en una capa de decision mas clara: explica ventas, gastos,
              beneficio, facturas, CRM y proyectos desde Verifactu Business, sin exigir al
              empresario que piense como un contable.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={appUrl + '/dashboard/integrations/isaak-for-holded'}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#1f55c0]"
              >
                Abrir modulo en Verifactu
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/recursos/contacto"
                className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Hablar con el equipo
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {guardrails.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-[#2361d8]" />
                    <p className="text-sm leading-6 text-slate-600">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_-40px_rgba(1,28,103,0.45)]">
            <div className="border-b border-slate-200 bg-[#081936] px-5 py-3 text-sm font-semibold text-white">
              Isaak opera sobre Holded desde Verifactu
            </div>
            <div className="p-4">
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
                <Image
                  src="/Isaak/Isaak_principal.png"
                  alt="Isaak dentro de Verifactu Business"
                  width={1280}
                  height={960}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                Public v1: facturas, cuentas, contactos, CRM y proyectos. Team API queda fuera de
                la primera publicacion para mantener el alcance y la revision de seguridad bajo control.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67]">
              Alcance recomendado para la primera revision publica
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Vamos a publicar una version contenida y facil de revisar: lectura primero, escritura
              controlada despues y cero acceso a datos laborales en esta primera fase.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-lg font-semibold text-[#011c67]">Incluido en public v1</h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                {publicScope.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#011c67]">Por que encaja con Isaak</h3>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Isaak no replica el ERP. Lo resume, lo explica y te ayuda a actuar desde
                verifactu.business. El usuario mantiene su sistema contable, pero gana una capa de
                claridad y ejecucion guiada.
              </p>
              <div className="mt-5 rounded-2xl border border-[#2361d8]/15 bg-[#2361d8]/5 p-4 text-sm leading-6 text-slate-700">
                Este enfoque es el mas solido para una revision publica: reduce riesgo, mejora
                legibilidad de la app y hace mas facil justificar el valor de negocio frente a OpenAI.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
            {capabilities.map((item) => (
              <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2361d8]/10 text-[#2361d8]">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#011c67]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_52%,#eef4ff_100%)] p-8 shadow-sm lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-[#011c67]">
                  Privacidad, soporte y claridad publica
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                  Para revisar y publicar bien esta app necesitamos que la capa publica cuente lo
                  mismo que la app hace de verdad: tenant autorizado, OAuth propio, API key solo
                  server-side y herramientas limitadas al alcance definido.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <ul className="space-y-3 text-sm leading-6 text-slate-600">
                  <li>
                    <Link href="/legal/privacidad" className="font-semibold text-[#2361d8] hover:text-[#1f55c0]">
                      Politica de privacidad
                    </Link>
                  </li>
                  <li>
                    <Link href="/legal/terminos" className="font-semibold text-[#2361d8] hover:text-[#1f55c0]">
                      Terminos y condiciones
                    </Link>
                  </li>
                  <li>
                    <Link href="/recursos/contacto" className="font-semibold text-[#2361d8] hover:text-[#1f55c0]">
                      Soporte y contacto
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
