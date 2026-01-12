import type { Metadata } from "next";
import Link from "next/link";
import { Plug, Database, CloudOff, Mail, FileText, Smartphone } from "lucide-react";

export const metadata: Metadata = {
  title: "Integraciones | Verifactu Business",
  description:
    "Conecta Verifactu Business con tus herramientas: exporta a Excel, sincroniza con tu gestorÃ­a y mÃ¡s. Integraciones simples y seguras.",
};

export default function IntegrationsPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* NavegaciÃ³n */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0060F0] hover:text-[#0080F0]">
            â† Volver al inicio
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="py-16 bg-gradient-to-b from-teal-50 to-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 mb-6">
              <Plug className="h-4 w-4 text-teal-600" />
              Integraciones
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl mb-4">
              Conecta con tus <br className="hidden sm:block" />herramientas habituales
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              Verifactu Business se integra con las herramientas que ya usas. Exporta datos, 
              sincroniza con tu gestorÃ­a y comparte informaciÃ³n sin complicaciones.
            </p>
          </div>
        </div>
      </section>

      {/* FilosofÃ­a */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="bg-gradient-to-br from-sky-50/70 to-blue-50/40 rounded-3xl p-8 shadow-lg border border-[#0060F0]/25">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-[#0060F0] flex items-center justify-center shrink-0">
                <CloudOff className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">
                  Nuestra filosofÃ­a: simplicidad primero
                </h2>
                <p className="text-slate-700 leading-relaxed mb-4">
                  No queremos ser "el ERP que hace todo". Queremos ser la mejor herramienta para 
                  <strong> llevar ventas, gastos y beneficio</strong>, y conectar fÃ¡cilmente con el resto de tu stack.
                </p>
                <p className="text-slate-700 leading-relaxed">
                  Por eso, en lugar de replicar funcionalidades que ya existen (email marketing, CRM, etc.), 
                  nos centramos en <strong>exportaciones limpias</strong> e <strong>integraciones sencillas</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integraciones actuales */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Exportaciones y formatos disponibles
            </h2>
            <p className="text-lg text-slate-600">
              Saca tus datos cuando quieras, en el formato que necesites
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Excel */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-green-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Exportar a Excel
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Libro de facturas, gastos, clientes. Compatible con Excel, Google Sheets y LibreOffice.
              </p>
              <p className="text-xs text-green-700 font-medium">âœ“ Disponible ahora</p>
            </div>

            {/* PDF */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition">
              <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                PDFs conformes VeriFactu
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Cada factura en PDF con QR, huella digital y cumplimiento RD 1007/2023 garantizado.
              </p>
              <p className="text-xs text-green-700 font-medium">âœ“ Disponible ahora</p>
            </div>

            {/* JSON/API */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition">
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                <Database className="h-6 w-6 text-purple-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                API REST (JSON)
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Conecta tu propio software o automatizaciones con nuestra API. DocumentaciÃ³n completa.
              </p>
              <p className="text-xs text-[#0060F0] font-medium">Q2 2026 (prÃ³ximamente)</p>
            </div>

            {/* Email */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-[#0060F0]" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                EnvÃ­o por email
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                EnvÃ­a facturas PDF por email directamente desde la plataforma. AutomÃ¡tico o manual.
              </p>
              <p className="text-xs text-[#0060F0] font-medium">Q2 2026 (prÃ³ximamente)</p>
            </div>

            {/* Zapier/Make */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition">
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
                <Plug className="h-6 w-6 text-orange-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Zapier / Make (Integromat)
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Conecta con +5000 apps sin cÃ³digo: Google Drive, Slack, Notion, Airtable...
              </p>
              <p className="text-xs text-[#0060F0] font-medium">Q3 2026 (prÃ³ximamente)</p>
            </div>

            {/* MÃ³vil */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition">
              <div className="h-12 w-12 rounded-xl bg-teal-100 flex items-center justify-center mb-4">
                <Smartphone className="h-6 w-6 text-teal-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                App mÃ³vil nativa
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                iOS y Android nativas para escanear tickets, crear facturas y consultar beneficio.
              </p>
              <p className="text-xs text-[#0060F0] font-medium">Q4 2026 (prÃ³ximamente)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Casos de uso */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Casos de uso reales
            </h2>
            <p className="text-lg text-slate-600">
              AsÃ­ usan las integraciones nuestros clientes
            </p>
          </div>

          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Caso 1 */}
            <div className="bg-gradient-to-r from-sky-50/70 to-blue-50/40 rounded-2xl p-8 border border-[#0060F0]/25">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-[#0060F0] flex items-center justify-center shrink-0 text-white font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Enviar datos a la gestorÃ­a cada trimestre
                  </h3>
                  <p className="text-slate-700 leading-relaxed mb-3">
                    MarÃ­a exporta su libro de facturas y gastos en Excel cada fin de trimestre. 
                    Lo envÃ­a por email a su gestorÃ­a y ellos preparan los modelos trimestrales.
                  </p>
                  <p className="text-sm text-[#0060F0] font-medium">
                    IntegraciÃ³n: Excel + Email (manual)
                  </p>
                </div>
              </div>
            </div>

            {/* Caso 2 */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-8 border border-green-200">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center shrink-0 text-white font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Archivar facturas en Google Drive
                  </h3>
                  <p className="text-slate-700 leading-relaxed mb-3">
                    Javier exporta los PDFs de sus facturas y los sube a una carpeta compartida en Google Drive 
                    con su socio. AsÃ­ ambos tienen acceso a la documentaciÃ³n.
                  </p>
                  <p className="text-sm text-green-700 font-medium">
                    IntegraciÃ³n: PDF + Google Drive (manual ahora, automÃ¡tico Q3 2026)
                  </p>
                </div>
              </div>
            </div>

            {/* Caso 3 */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl p-8 border border-purple-200">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center shrink-0 text-white font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Notificaciones en Slack cuando hay factura nueva
                  </h3>
                  <p className="text-slate-700 leading-relaxed mb-3">
                    El equipo de contabilidad de una pequeÃ±a empresa recibe un mensaje en Slack cada vez 
                    que se crea una factura. AsÃ­ todos estÃ¡n al dÃ­a sin revisar la plataforma constantemente.
                  </p>
                  <p className="text-sm text-purple-700 font-medium">
                    IntegraciÃ³n: API + Zapier + Slack (Q3 2026)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integraciones personalizadas */}
      <section className="py-16 bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white mb-6">
            <Plug className="h-4 w-4" />
            Empresas
          </div>
          <h2 className="text-3xl font-bold text-white mb-6">
            Â¿Necesitas una integraciÃ³n especÃ­fica?
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Para equipos con necesidades especiales, creamos integraciones a medida. 
            ERP, CRM, software interno... trabajamos contigo para conectar lo que necesites.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:soporte@verifactu.business?subject=IntegraciÃ³n%20personalizada"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-900 font-semibold rounded-xl shadow-lg hover:bg-slate-100 transition"
            >
              <Mail className="h-5 w-5" />
              Contactar ventas
            </a>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-800 text-white font-semibold rounded-xl border-2 border-slate-600 hover:bg-slate-700 transition"
            >
              Ver demo primero
            </Link>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Roadmap de integraciones
            </h2>
            <p className="text-lg text-slate-600">
              Lo que estamos construyendo
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-green-300">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold text-slate-900">Q1 2026 (ahora)</h3>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  Completado
                </span>
              </div>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  ExportaciÃ³n a Excel/CSV
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  PDFs conformes VeriFactu
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-[#0060F0]/35">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold text-slate-900">Q2 2026</h3>
                <span className="px-3 py-1 bg-blue-100 text-[#0060F0] text-xs font-semibold rounded-full">
                  En desarrollo
                </span>
              </div>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#0060F0]" />
                  API REST completa con documentaciÃ³n
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#0060F0]" />
                  EnvÃ­o de facturas por email
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold text-slate-900">Q3 2026</h3>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
                  Planificado
                </span>
              </div>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-slate-400" />
                  IntegraciÃ³n Zapier/Make
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-slate-400" />
                  Webhooks para eventos (factura creada, etc.)
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold text-slate-900">Q4 2026</h3>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
                  ExploraciÃ³n
                </span>
              </div>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-slate-400" />
                  App mÃ³vil nativa (iOS + Android)
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-slate-400" />
                  Conectores para ERPs populares
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-teal-600 to-teal-700">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Empieza ahora, integra despuÃ©s
          </h2>
          <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto">
            No necesitas integraciones complejas desde el dÃ­a 1. 
            Empieza a usar la plataforma y aÃ±ade conexiones cuando las necesites.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-teal-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition"
          >
            Prueba gratis 14 dÃ­as
          </Link>
        </div>
      </section>

      {/* Footer */}
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

