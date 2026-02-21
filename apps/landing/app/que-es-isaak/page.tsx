import Link from 'next/link';
import Header from '../components/Header';
import { Container, Footer } from '../lib/home/ui';
import { getAppUrl } from '../lib/urls';

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

export default function QueEsIsaakPage() {
  const appUrl = getAppUrl();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      <section className="py-14">
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center rounded-full bg-[#2361d8]/10 px-4 py-1.5 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/15">
              Que es Isaak
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
              Tu copiloto operativo para cumplir VeriFactu y decidir con datos reales
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              Isaak no es un chatbot generico. Es un asistente integrado en Verifactu para guiarte
              en facturacion, gastos, plazos fiscales y analisis diario de ventas, gastos y beneficio.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-[#011c67]">Que puede hacer por ti</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li>- Revisar y extraer datos de facturas, tickets y documentos.</li>
                <li>- Sugerir acciones para cerrar periodos sin pendientes.</li>
                <li>- Detectar errores frecuentes antes de que escalen.</li>
                <li>- Recordarte plazos y tareas clave del calendario fiscal.</li>
                <li>- Resumirte ventas, gastos y beneficio en lenguaje claro.</li>
              </ul>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-[#011c67]">Como funciona</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li>- Se integra en tu espacio de trabajo y usa tu contexto autorizado.</li>
                <li>- Adapta tono y profundidad segun el tipo de consulta.</li>
                <li>- Prioriza respuestas accionables sobre texto generico.</li>
                <li>- Mantiene trazabilidad de decisiones y sugerencias relevantes.</li>
                <li>- Te permite escalar a soporte cuando necesitas ayuda humana.</li>
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
              Isaak trabaja con controles de acceso por cuenta y tenant. Los datos no se comparten
              con ningun humano sin autorizacion previa. Puedes solicitar borrado de historial,
              limpieza de memoria y gestion de retencion. Para detalles legales completos, revisa la{' '}
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

          <div className="mx-auto mt-10 flex max-w-4xl flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:flex-row sm:justify-center">
            <Link
              href={appUrl}
              className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
            >
              Empezar gratis (para siempre)
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
