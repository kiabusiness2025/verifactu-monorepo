import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight, TrendingUp, FileText, Calculator } from "lucide-react";

export const metadata: Metadata = {
  title: "Resumen del producto | Verifactu Business",
  description:
    "Verifactu Business simplifica tu gestiÃ³n: ventas, gastos y beneficio bajo control, con cumplimiento VeriFactu garantizado.",
};

export default function ProductSummaryPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50/70 via-white to-white">
      {/* NavegaciÃ³n */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0060F0] hover:text-[#0080F0]">
            â† Volver al inicio
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 mb-6">
              <CheckCircle2 className="h-4 w-4 text-[#0060F0]" />
              Producto
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl mb-4">
              Tu negocio bajo control, <br className="hidden sm:block" />sin complicaciones
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              Verifactu Business es la forma mÃ¡s sencilla de llevar ventas, gastos y beneficio. 
              Todo en una pantalla, con Isaak para ayudarte y cumplimiento VeriFactu garantizado.
            </p>
          </div>
        </div>
      </section>

      {/* Problema â†’ SoluciÃ³n */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                El problema de siempre: <br />demasiadas herramientas, poco tiempo
              </h2>
              <div className="space-y-4 text-slate-600">
                <p className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">âœ•</span>
                  <span>Excel para ventas, otra hoja para gastos, y cuando quieres saber si ganas o pierdes... tienes que ponerte a calcular.</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">âœ•</span>
                  <span>Facturas en PDF sueltos, recibos perdidos, y al final del trimestre: el caos.</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">âœ•</span>
                  <span>VeriFactu, modelos, declaraciones... Â¿por dÃ³nde empezar? Â¿Lo estoy haciendo bien?</span>
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-sky-50/70 to-blue-50/40 rounded-3xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                Verifactu Business resuelve esto
              </h3>
              <div className="space-y-4">
                <p className="flex items-start gap-3 text-slate-700">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span><strong>Una sola pantalla</strong>: ventas, gastos, beneficio. Siempre actualizado.</span>
                </p>
                <p className="flex items-start gap-3 text-slate-700">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span><strong>Todo organizado</strong>: cada factura con su fecha, cliente y categorÃ­a. Buscable en 2 clics.</span>
                </p>
                <p className="flex items-start gap-3 text-slate-700">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span><strong>Cumplimiento automÃ¡tico</strong>: VeriFactu, conservaciÃ³n, trazabilidad. Sin que tengas que pensar en ello.</span>
                </p>
                <p className="flex items-start gap-3 text-slate-700">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span><strong>Isaak te guÃ­a</strong>: "Â¿puedo deducir esto?", "Â¿cuÃ¡nto IVA pago este trimestre?". Respuestas en segundos.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades clave */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Las 4 cosas que mÃ¡s vas a usar
            </h2>
            <p className="text-lg text-slate-600">
              DiseÃ±adas para que no pierdas tiempo y tengas control real de tu negocio
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-[#0060F0]" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Dashboard de beneficio
              </h3>
              <p className="text-sm text-slate-600">
                Ves de un vistazo: ventas del mes, gastos, y lo mÃ¡s importante: <strong>cuÃ¡nto te queda</strong>.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-green-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Registro de ventas
              </h3>
              <p className="text-sm text-slate-600">
                AÃ±ade facturas con cliente, fecha, concepto e importe. Genera PDFs conformes VeriFactu en 1 clic.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
                <Calculator className="h-6 w-6 text-orange-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Control de gastos
              </h3>
              <p className="text-sm text-slate-600">
                Registra tickets, facturas de proveedor, gasolina, material. Categoriza y filtra por trimestre.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Isaak, tu asistente
              </h3>
              <p className="text-sm text-slate-600">
                Pregunta lo que sea: "Â¿cuÃ¡nto he facturado?", "Â¿este gasto es deducible?". Respuestas al instante.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Para quiÃ©n */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Â¿Para quiÃ©n es Verifactu Business?
          </h2>

          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 bg-sky-50/70 p-6 rounded-r-xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                AutÃ³nomos con poco tiempo
              </h3>
              <p className="text-slate-700">
                Si pasas mÃ¡s tiempo buscando facturas que trabajando, esto te devuelve horas cada mes.
              </p>
            </div>

            <div className="border-l-4 border-green-500 bg-green-50 p-6 rounded-r-xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                PequeÃ±os negocios (hasta 50 facturas/mes)
              </h3>
              <p className="text-slate-700">
                Controla ingresos, gastos y beneficio sin contratar a un contable para el dÃ­a a dÃ­a.
              </p>
            </div>

            <div className="border-l-4 border-purple-500 bg-purple-50 p-6 rounded-r-xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Quien quiere cumplir VeriFactu sin dolores de cabeza
              </h3>
              <p className="text-slate-700">
                La normativa te agobia, pero no quieres arriesgarte. AquÃ­ todo estÃ¡ bajo control desde el primer dÃ­a.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparativa rÃ¡pida */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Verifactu Business vs. otras opciones
          </h2>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6 text-sm font-semibold text-slate-900"></th>
                  <th className="py-4 px-6 text-sm font-semibold text-[#0060F0]">Verifactu Business</th>
                  <th className="py-4 px-6 text-sm font-semibold text-slate-600">Excel / Sheets</th>
                  <th className="py-4 px-6 text-sm font-semibold text-slate-600">Software complejo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-4 px-6 text-sm font-medium text-slate-900">Tiempo de aprendizaje</td>
                  <td className="py-4 px-6 text-sm text-green-700 font-semibold">5 minutos</td>
                  <td className="py-4 px-6 text-sm text-slate-600">Variable</td>
                  <td className="py-4 px-6 text-sm text-slate-600">DÃ­as o semanas</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-sm font-medium text-slate-900">Cumplimiento VeriFactu</td>
                  <td className="py-4 px-6 text-sm text-green-700 font-semibold">âœ“ AutomÃ¡tico</td>
                  <td className="py-4 px-6 text-sm text-slate-600">âœ• Manual</td>
                  <td className="py-4 px-6 text-sm text-orange-600">Requiere configuraciÃ³n</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-sm font-medium text-slate-900">Asistente IA</td>
                  <td className="py-4 px-6 text-sm text-green-700 font-semibold">âœ“ Isaak incluido</td>
                  <td className="py-4 px-6 text-sm text-slate-600">âœ• No</td>
                  <td className="py-4 px-6 text-sm text-slate-600">âœ• No</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-sm font-medium text-slate-900">Precio/mes</td>
                  <td className="py-4 px-6 text-sm text-green-700 font-semibold">Desde 29â‚¬</td>
                  <td className="py-4 px-6 text-sm text-slate-600">Gratis (pero tu tiempo no)</td>
                  <td className="py-4 px-6 text-sm text-slate-600">50-150â‚¬+</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-700">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Empieza hoy y recupera el control
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            14 dÃ­as gratis. Sin tarjeta. Cancela cuando quieras. VerÃ¡s el beneficio de simplificar desde el primer dÃ­a.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#0060F0] font-semibold rounded-xl shadow-lg hover:shadow-xl transition"
            >
              Prueba gratis 14 dÃ­as
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-sky-50/700/20 text-white font-semibold rounded-xl border-2 border-white/30 hover:bg-sky-50/700/30 transition"
            >
              Ver demo interactiva
            </Link>
          </div>
        </div>
      </section>

      {/* Footer simple */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-600">
            <p>Â© 2026 Verifactu Business Â· Expert Estudios Profesionales, SLU</p>
            <div className="flex gap-6">
              <Link href="/legal/privacidad" className="hover:text-slate-900">Privacidad</Link>
              <Link href="/legal/terminos" className="hover:text-slate-900">TÃ©rminos</Link>
              <Link href="/legal/cookies" className="hover:text-slate-900">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

