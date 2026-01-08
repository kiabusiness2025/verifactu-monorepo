import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard, FileText, TrendingUp, Calendar, Search, Download, Filter, Eye } from "lucide-react";

export const metadata: Metadata = {
  title: "Plataforma | Verifactu Business",
  description:
    "Explora la plataforma Verifactu Business: dashboard, gestión de ventas, gastos, beneficio y más. Todo en una interfaz clara y rápida.",
};

export default function PlatformPage() {
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
      <section className="py-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 mb-6">
              <LayoutDashboard className="h-4 w-4 text-blue-700" />
              Plataforma
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl mb-4">
              Una plataforma diseñada <br className="hidden sm:block" />para que trabajes tranquilo
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              Interfaz clara, sin menús infinitos ni opciones que no usas. Solo lo esencial: 
              ventas, gastos, beneficio e Isaak para resolver dudas.
            </p>
          </div>
        </div>
      </section>

      {/* Dashboard */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                Dashboard: todo a la vista
              </h2>
              <p className="text-lg text-slate-600 mb-6">
                Cuando entras a Verifactu Business, lo primero que ves es tu <strong>situación real</strong>:
              </p>
              <ul className="space-y-4 text-slate-700">
                <li className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-slate-900">Beneficio del mes</strong>
                    <p className="text-sm text-slate-600">Ventas menos gastos. Actualizado en tiempo real.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-slate-900">Comparativa con el mes anterior</strong>
                    <p className="text-sm text-slate-600">¿Estás mejorando o empeorando? Porcentajes claros.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-slate-900">Últimas facturas</strong>
                    <p className="text-sm text-slate-600">Acceso rápido a las 5 más recientes, sin buscar.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-8 shadow-xl border border-slate-200">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-600">Beneficio este mes</h3>
                  <span className="text-xs text-green-600 font-medium">+12.4%</span>
                </div>
                <p className="text-4xl font-bold text-slate-900 mb-2">12.450 €</p>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Ventas</p>
                    <p className="font-semibold text-slate-900">18.700 €</p>
                  </div>
                  <div className="text-slate-300">−</div>
                  <div>
                    <p className="text-slate-600">Gastos</p>
                    <p className="font-semibold text-slate-900">6.250 €</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gestión de ventas */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">
            Gestión de ventas: simple y rápida
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-blue-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Crear factura</h3>
              <p className="text-sm text-slate-600">
                Cliente, fecha, concepto, importe. 4 campos. PDF conforme VeriFactu en 1 clic. Sin complicaciones.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-green-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Buscar y filtrar</h3>
              <p className="text-sm text-slate-600">
                Por cliente, fecha, importe o concepto. Encuentra cualquier factura en segundos, no en carpetas perdidas.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                <Download className="h-6 w-6 text-purple-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Exportar</h3>
              <p className="text-sm text-slate-600">
                Libro de facturas en Excel o PDF. Perfecto para tu gestoría o para revisiones trimestrales.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-orange-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Vista por trimestre</h3>
              <p className="text-sm text-slate-600">
                Filtra por Q1, Q2, Q3 o Q4. Ideal para modelos trimestrales o resúmenes anuales.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center mb-4">
                <Eye className="h-6 w-6 text-red-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Previsualización</h3>
              <p className="text-sm text-slate-600">
                Antes de generar el PDF, ves cómo queda la factura. Cambia lo que necesites y listo.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="h-12 w-12 rounded-xl bg-teal-100 flex items-center justify-center mb-4">
                <Filter className="h-6 w-6 text-teal-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Estados</h3>
              <p className="text-sm text-slate-600">
                Marca facturas como pendientes, pagadas o anuladas. Controla cobros sin Excel aparte.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Control de gastos */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-8 shadow-xl border border-orange-200">
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <p className="text-sm text-slate-600">Descripción</p>
                    <p className="text-sm text-slate-600">Importe</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-900">Gasolina</p>
                    <p className="text-sm font-semibold text-slate-900">65 €</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-900">Material oficina</p>
                    <p className="text-sm font-semibold text-slate-900">134 €</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-900">Software</p>
                    <p className="text-sm font-semibold text-slate-900">29 €</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <p className="text-sm font-semibold text-slate-900">Total</p>
                    <p className="text-lg font-bold text-slate-900">228 €</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                Gastos organizados, sin tickets perdidos
              </h2>
              <p className="text-lg text-slate-600 mb-6">
                Cada gasto con su categoría: gasolina, material, software, gestoría... 
                Sabes exactamente dónde va tu dinero.
              </p>
              <ul className="space-y-4 text-slate-700">
                <li className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-600 mt-2 shrink-0" />
                  <div>
                    <strong className="text-slate-900">Adjunta tickets digitales</strong>
                    <p className="text-sm text-slate-600">Foto del ticket o PDF del proveedor. Todo en el mismo sitio.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-600 mt-2 shrink-0" />
                  <div>
                    <strong className="text-slate-900">Filtra por categoría</strong>
                    <p className="text-sm text-slate-600">¿Cuánto gastas en gasolina al mes? Filtro → resultado en 2 segundos.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-600 mt-2 shrink-0" />
                  <div>
                    <strong className="text-slate-900">Exporta para tu gestoría</strong>
                    <p className="text-sm text-slate-600">Excel o PDF con todos los gastos del trimestre. Lista para declaración.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Isaak integrado */}
      <section className="py-16 bg-gradient-to-br from-purple-50 to-purple-100">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-purple-700 shadow-sm mb-6">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Isaak
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            Tu asistente siempre disponible
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Isaak está integrado en cada pantalla. Pregúntale lo que sea:
          </p>

          <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto text-left">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-purple-200">
              <p className="text-sm text-purple-700 font-medium mb-2">Consulta:</p>
              <p className="text-slate-900">"¿Cuánto he facturado este trimestre?"</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-purple-200">
              <p className="text-sm text-purple-700 font-medium mb-2">Consulta:</p>
              <p className="text-slate-900">"¿Puedo deducir el 100% de este gasto?"</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-purple-200">
              <p className="text-sm text-purple-700 font-medium mb-2">Consulta:</p>
              <p className="text-slate-900">"¿Cuál fue mi mejor mes este año?"</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-purple-200">
              <p className="text-sm text-purple-700 font-medium mb-2">Consulta:</p>
              <p className="text-slate-900">"Exporta mis ventas de enero a marzo"</p>
            </div>
          </div>

          <p className="text-slate-600 mt-8">
            Respuestas en segundos. Sin buscar en manuales ni tutoriales.
          </p>
        </div>
      </section>

      {/* Móvil */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                Diseño adaptado a móvil
              </h2>
              <p className="text-lg text-slate-600 mb-6">
                La plataforma funciona perfecta en tu móvil. Registra una factura desde el coche, 
                consulta el beneficio del mes desde casa o pregunta a Isaak desde donde estés.
              </p>
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Interfaz táctil optimizada</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Carga rápida incluso con datos móviles</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Sincronización automática entre dispositivos</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl p-12 flex items-center justify-center shadow-xl">
              <div className="bg-slate-900 rounded-3xl w-64 h-96 shadow-2xl flex items-center justify-center">
                <div className="bg-white rounded-2xl w-56 h-80 flex items-center justify-center text-slate-400">
                  <span className="text-xs">Vista móvil</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Explora la plataforma sin compromiso
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            14 días gratis para probar cada funcionalidad. Sin tarjeta, sin letras pequeñas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 transition"
            >
              Ver demo interactiva
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-900 font-semibold rounded-xl shadow-lg hover:bg-slate-100 transition"
            >
              Empezar prueba gratis
            </Link>
          </div>
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
