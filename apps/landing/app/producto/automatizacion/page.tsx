import type { Metadata } from "next";
import Link from "next/link";
import { Zap, Clock, RefreshCw, Bell, Calendar, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Automatización | Verifactu Business",
  description:
    "Automatiza tareas repetitivas: recordatorios, cálculos, exportaciones y más. Ahorra tiempo cada semana con Verifactu Business.",
};

export default function AutomationPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navegación */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">
            ← Volver al inicio
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="py-16 bg-gradient-to-b from-orange-50 to-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 mb-6">
              <Zap className="h-4 w-4 text-orange-600" />
              Automatización
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl mb-4">
              Menos clics, <br className="hidden sm:block" />más tiempo para tu negocio
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              Automatizamos tareas repetitivas para que no pierdas tiempo en lo aburrido: 
              recordatorios, cálculos, exportaciones y cumplimiento VeriFactu.
            </p>
          </div>
        </div>
      </section>

      {/* Problema → Solución */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              El tiempo que pierdes en tareas repetitivas
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Calcular IVA, recordar envíos, exportar datos... son minutos que suman horas al mes. 
              Verifactu Business automatiza esto para ti.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Tarjeta 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
              <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Cálculos automáticos
              </h3>
              <p className="text-sm text-slate-700 mb-3">
                IVA, retenciones, subtotales, descuentos. Todo calculado al escribir el importe.
              </p>
              <p className="text-xs text-slate-600">
                ⏱️ Ahorras: <strong>10 min/factura</strong>
              </p>
            </div>

            {/* Tarjeta 2 */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
              <div className="h-12 w-12 rounded-xl bg-green-600 flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Recordatorios inteligentes
              </h3>
              <p className="text-sm text-slate-700 mb-3">
                Notificación cuando se acerca una fecha límite de pago o declaración.
              </p>
              <p className="text-xs text-slate-600">
                ⏱️ Ahorras: <strong>olvidos caros</strong>
              </p>
            </div>

            {/* Tarjeta 3 */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
              <div className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center mb-4">
                <RefreshCw className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Numeración automática
              </h3>
              <p className="text-sm text-slate-700 mb-3">
                Cada factura con su número secuencial. Sin duplicados, sin errores.
              </p>
              <p className="text-xs text-slate-600">
                ⏱️ Ahorras: <strong>5 min/factura</strong>
              </p>
            </div>

            {/* Tarjeta 4 */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
              <div className="h-12 w-12 rounded-xl bg-orange-600 flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Resúmenes trimestrales
              </h3>
              <p className="text-sm text-slate-700 mb-3">
                Informe automático de ventas, gastos y beneficio cada fin de trimestre.
              </p>
              <p className="text-xs text-slate-600">
                ⏱️ Ahorras: <strong>30 min/trimestre</strong>
              </p>
            </div>

            {/* Tarjeta 5 */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 border border-red-200">
              <div className="h-12 w-12 rounded-xl bg-red-600 flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                PDFs conformes VeriFactu
              </h3>
              <p className="text-sm text-slate-700 mb-3">
                Cada PDF generado cumple el RD 1007/2023. Qr, huella digital y trazabilidad incluidos.
              </p>
              <p className="text-xs text-slate-600">
                ⏱️ Ahorras: <strong>configuración manual</strong>
              </p>
            </div>

            {/* Tarjeta 6 */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-6 border border-teal-200">
              <div className="h-12 w-12 rounded-xl bg-teal-600 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Backups automáticos
              </h3>
              <p className="text-sm text-slate-700 mb-3">
                Tus datos se guardan cada hora. Sin preocuparte de exportar ni de pérdidas.
              </p>
              <p className="text-xs text-slate-600">
                ⏱️ Ahorras: <strong>estrés innecesario</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ejemplo práctico */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Un ejemplo: crear una factura
            </h2>
            <p className="text-lg text-slate-600">
              Con automatización vs. sin automatización
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Sin automatización */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-red-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 font-bold text-xl">✕</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Sin automatización</h3>
              </div>
              <ol className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400">1.</span>
                  <span>Abrir Excel o plantilla Word</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400">2.</span>
                  <span>Buscar el último número de factura</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400">3.</span>
                  <span>Escribir datos del cliente</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400">4.</span>
                  <span>Calcular IVA a mano (o con calculadora)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400">5.</span>
                  <span>Calcular retención si aplica</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400">6.</span>
                  <span>Sumar subtotal + IVA - retención</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400">7.</span>
                  <span>Exportar a PDF</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400">8.</span>
                  <span>Guardar en carpeta correcta</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400">9.</span>
                  <span>Apuntar en Excel de control</span>
                </li>
              </ol>
              <div className="mt-6 pt-6 border-t border-red-200">
                <p className="text-red-700 font-semibold">⏱️ Tiempo: ~15 minutos</p>
              </div>
            </div>

            {/* Con automatización */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 shadow-sm border-2 border-green-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Con Verifactu Business</h3>
              </div>
              <ol className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-3">
                  <span className="font-semibold text-green-700">1.</span>
                  <span>Click en "Nueva factura"</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-green-700">2.</span>
                  <span>Seleccionar cliente (o añadir nuevo)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-green-700">3.</span>
                  <span>Escribir concepto e importe base</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400 line-through">4.</span>
                  <span className="text-slate-400 line-through">IVA calculado automáticamente</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400 line-through">5.</span>
                  <span className="text-slate-400 line-through">Retención calculada si aplica</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400 line-through">6.</span>
                  <span className="text-slate-400 line-through">Total calculado automáticamente</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400 line-through">7.</span>
                  <span className="text-slate-400 line-through">Número secuencial asignado</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400 line-through">8.</span>
                  <span className="text-slate-400 line-through">PDF conforme VeriFactu generado</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-slate-400 line-through">9.</span>
                  <span className="text-slate-400 line-through">Guardado y sincronizado automáticamente</span>
                </li>
              </ol>
              <div className="mt-6 pt-6 border-t border-green-300">
                <p className="text-green-700 font-bold text-lg">⏱️ Tiempo: 2 minutos</p>
                <p className="text-sm text-green-600 mt-1">✓ Ahorras 13 minutos por factura</p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center bg-blue-50 rounded-2xl p-8 border border-blue-200">
            <p className="text-2xl font-bold text-slate-900 mb-2">
              13 minutos × 20 facturas/mes = <span className="text-blue-700">4.3 horas ahorradas</span>
            </p>
            <p className="text-slate-600">
              Tiempo que puedes dedicar a tu negocio en lugar de tareas administrativas
            </p>
          </div>
        </div>
      </section>

      {/* Próximamente */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Próximamente: más automatizaciones
            </h2>
            <p className="text-lg text-slate-600">
              Seguimos mejorando para que ahorres aún más tiempo
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center mb-4">
                <Clock className="h-5 w-5 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Envío automático de facturas
              </h3>
              <p className="text-sm text-slate-600">
                Email al cliente con PDF adjunto. Automático al generar la factura.
              </p>
              <p className="text-xs text-slate-500 mt-3">Q2 2026</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center mb-4">
                <Bell className="h-5 w-5 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Recordatorio de impagados
              </h3>
              <p className="text-sm text-slate-600">
                Notificación si una factura lleva +30 días pendiente de cobro.
              </p>
              <p className="text-xs text-slate-500 mt-3">Q2 2026</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center mb-4">
                <RefreshCw className="h-5 w-5 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Sincronización con gestoría
              </h3>
              <p className="text-sm text-slate-600">
                Exportación automática de datos cada trimestre a tu asesor fiscal.
              </p>
              <p className="text-xs text-slate-500 mt-3">Q3 2026</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-orange-600 to-orange-700">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Recupera 4+ horas al mes
          </h2>
          <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
            Empieza hoy y deja que la plataforma trabaje por ti. Sin tarjeta, sin compromiso.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-orange-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition"
          >
            Prueba gratis 14 días
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-600">
            <p>© 2026 Verifactu Business · Expert Estudios Profesionales, SLU</p>
            <div className="flex gap-6">
              <Link href="/legal/privacidad" className="hover:text-slate-900">Privacidad</Link>
              <Link href="/legal/terminos" className="hover:text-slate-900">Términos</Link>
              <Link href="/legal/cookies" className="hover:text-slate-900">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
