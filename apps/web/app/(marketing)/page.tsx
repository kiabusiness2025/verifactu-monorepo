import Link from "next/link";

const APP_BASE_URL = "https://app.verifactu.business";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-white text-slate-900">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2" aria-label="Inicio verifactu.business">
            <picture>
              <source srcSet="/brand/logo-light.svg" media="(prefers-color-scheme: light)" />
              <source srcSet="/brand/logo-dark.svg" media="(prefers-color-scheme: dark)" />
              <img src="/brand/logo-light.svg" alt="verifactu.business" className="h-8 w-auto" />
            </picture>
          </Link>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#funcionalidades" className="hover:text-slate-900 text-slate-600">
              Funcionalidades
            </a>
            <a href="#para-quien" className="hover:text-slate-900 text-slate-600">
              Para quién
            </a>
            <a href="#planes" className="hover:text-slate-900 text-slate-600">
              Planes y precios
            </a>
            <a href="#servicios" className="hover:text-slate-900 text-slate-600">
              Servicios adicionales
            </a>
            <a href="#seguridad" className="hover:text-slate-900 text-slate-600">
              Seguridad
            </a>
            <a href="#faq" className="hover:text-slate-900 text-slate-600">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <Link href={`${APP_BASE_URL}/login`} className="text-slate-600 hover:text-slate-900">
              Acceder
            </Link>
            <Link
              href={`${APP_BASE_URL}/signup`}
              className="rounded-md border border-slate-900 px-4 py-2 font-medium hover:bg-slate-900 hover:text-white"
            >
              Crear cuenta gratuita
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="border-b bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
          <div>
            <h1 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Gestión fiscal y contable automatizada para tu empresa
            </h1>
            <p className="mb-4 text-lg text-slate-800">
              La plataforma integral que conecta Verifactu, bancos, Google Drive y un asistente fiscal especializado en normativa española.
              Todo en un único panel inteligente.
            </p>
            <p className="mb-6 text-sm text-slate-600">
              Control financiero en tiempo real, calendario fiscal automático y contabilidad generada por IA.
            </p>

            <div className="mb-3 flex flex-wrap gap-3">
              <Link
                href={`${APP_BASE_URL}/signup`}
                className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-black"
              >
                Crear cuenta gratuita
              </Link>
              <a
                href="#funcionalidades"
                className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-900 hover:bg-white"
              >
                Explorar funcionalidades
              </a>
            </div>

            <p className="text-xs text-slate-500">Sin tarjeta. Configuración inicial en menos de 2 minutos.</p>
          </div>

          {/* Ejemplos Isaak */}
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-medium text-slate-900 mb-1">Usuario</p>
              <p className="text-slate-700 mb-3">
                “¿Cómo voy este trimestre? Necesito el IVA estimado y si hay riesgos de descuadre.”
              </p>
              <p className="font-medium text-slate-900 mb-1">Isaak</p>
              <p className="text-slate-700">
                “Ingresos del 2T: 14.980 €. Gastos deducibles: 3.420 €. IVA devengado: 3.145 €. IVA soportado: 718 €. Previsión de cuota:
                2.427 €. No detecto inconsistencias.”
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-medium text-slate-900 mb-1">Usuario</p>
              <p className="text-slate-700 mb-3">
                “Subo estas 12 facturas de gasto. Clasifícalas y cuéntame si alguna no es deducible.”
              </p>
              <p className="font-medium text-slate-900 mb-1">Isaak</p>
              <p className="text-slate-700">
                “11 facturas clasificadas correctamente. 1 factura no deducible: servicio de entretenimiento. Todo se ha registrado en tu libro de gastos.”
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-medium text-slate-900 mb-1">Usuario</p>
              <p className="text-slate-700 mb-3">
                “Concíliame los movimientos bancarios de esta semana y dime si queda algo pendiente de cobrar.”
              </p>
              <p className="font-medium text-slate-900 mb-1">Isaak</p>
              <p className="text-slate-700">
                “8 movimientos conciliados con tus facturas. 1 transferencia de 412 € pendiente de asociar. 2 facturas emitidas siguen sin cobro.”
              </p>
            </div>

            <p className="text-xs text-slate-500">
              IA fiscal que entiende tu negocio, automatiza tus procesos y te prepara para cada obligación tributaria.
            </p>
          </div>
        </div>
      </section>

      {/* PROPUESTA DE VALOR */}
      <section id="propuesta" className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="mb-3 text-2xl font-semibold tracking-tight">Centraliza toda la gestión fiscal y contable en un único sistema</h2>
          <p className="mb-4 text-slate-700">
            Verifactu, bancos, gastos, documentos, calendario fiscal e inteligencia artificial especializada en España. Una infraestructura empresarial diseñada
            para maximizar control, eficiencia y seguridad.
          </p>
          <div className="grid gap-3 text-sm text-slate-800 md:grid-cols-2">
            <ul className="list-disc space-y-1 pl-5">
              <li>Automatización completa del ciclo fiscal y contable</li>
              <li>Libros oficiales actualizados de forma continua</li>
              <li>Eliminación de errores y duplicidades</li>
            </ul>
            <ul className="list-disc space-y-1 pl-5">
              <li>Visión financiera 360º en tiempo real</li>
              <li>Preparación automatizada de los modelos 303, 130, 111 e Impuesto de Sociedades</li>
              <li>Cumplimiento nativo con Verifactu</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES CLAVE */}
      <section id="funcionalidades" className="border-b bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">Funcionalidades clave</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 text-sm">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-900">Facturación Verifactu</h3>
              <ul className="space-y-1 text-slate-700">
                <li>Emisión certificada</li>
                <li>Registro automático</li>
                <li>Control de cobros y vencimientos</li>
                <li>Envío profesional a clientes</li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-900">Gastos y OCR avanzado</h3>
              <ul className="space-y-1 text-slate-700">
                <li>Integración con Google Drive</li>
                <li>OCR inteligente</li>
                <li>Clasificación automática de documentos</li>
                <li>Registro contable inmediato</li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-900">Integración bancaria (PSD2)</h3>
              <ul className="space-y-1 text-slate-700">
                <li>Conexión segura con entidades españolas</li>
                <li>Importación automática de movimientos</li>
                <li>Conciliación con facturas y gastos</li>
                <li>Alertas financieras y de liquidez</li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-900">Contabilidad automática</h3>
              <ul className="space-y-1 text-slate-700">
                <li>Libros diario, mayor e IVA</li>
                <li>Conciliación completa</li>
                <li>Resultados del periodo en tiempo real</li>
                <li>Proyección de cierre anual</li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-900">Asistente fiscal “Isaak”</h3>
              <p className="text-slate-700">
                Asesoramiento guiado, análisis documental, explicaciones normativas, cálculos automáticos y soporte integral.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-900">Calendario fiscal inteligente</h3>
              <ul className="space-y-1 text-slate-700">
                <li>Generación automática de obligaciones</li>
                <li>Sincronización con Google Calendar</li>
                <li>Recordatorios previos a cada presentación</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PARA QUIÉN ES */}
      <section id="para-quien" className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">Para quién es</h2>
          <div className="grid gap-6 md:grid-cols-3 text-sm">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-2 text-base font-semibold">Autónomos</h3>
              <p className="text-slate-700">Gestión simple, automática y sin fricciones.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-2 text-base font-semibold">Pymes</h3>
              <p className="text-slate-700">Control completo de facturación, bancos, impuestos y documentación.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-2 text-base font-semibold">Gestorías y despachos</h3>
              <p className="text-slate-700">Operativa multiempresa con automatización contable y fiscal de alto nivel.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PLANES Y PRECIOS */}
      <section id="planes" className="border-b bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Planes y precios</h2>
            <a href="#planes" className="text-sm font-medium text-slate-900 underline underline-offset-4">
              Comparar planes
            </a>
          </div>

          <div className="grid gap-6 md:grid-cols-4 text-sm">
            <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-1 text-base font-semibold">Free</h3>
              <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">Para probar la plataforma sin compromiso.</p>
              <ul className="mb-4 space-y-1 text-slate-700">
                <li>1 empresa</li>
                <li>Facturación básica</li>
                <li>Subida manual de documentos</li>
                <li>Hasta 20 documentos al mes</li>
                <li>Chat Isaak limitado</li>
              </ul>
              <p className="mb-4 text-lg font-semibold">0 €/mes</p>
              <Link
                href={`${APP_BASE_URL}/signup?plan=free`}
                className="mt-auto rounded-md border border-slate-900 px-4 py-2 text-center text-sm font-medium hover:bg-slate-900 hover:text-white"
              >
                Empezar gratis
              </Link>
            </div>

            <div className="flex flex-col rounded-lg border border-slate-900 bg-white p-4 shadow-md">
              <h3 className="mb-1 text-base font-semibold">Esencial</h3>
              <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">Para autónomos y microempresas.</p>
              <ul className="mb-4 space-y-1 text-slate-700">
                <li>Drive integrado</li>
                <li>1 empresa</li>
                <li>Facturación Verifactu completa</li>
                <li>OCR + gastos automáticos</li>
                <li>Integración bancaria (1 cuenta)</li>
                <li>Calendario fiscal sincronizado</li>
                <li>Resultados e impuestos estimados</li>
              </ul>
              <p className="mb-1 text-lg font-semibold">29 €/mes</p>
              <p className="mb-4 text-xs text-slate-500">o 290 €/año</p>
              <Link
                href={`${APP_BASE_URL}/signup?plan=esencial`}
                className="mt-auto rounded-md bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-black"
              >
                Empezar con Esencial
              </Link>
            </div>

            <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-1 text-base font-semibold">Profesional</h3>
              <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">Para sociedades y PYMES con procesos estructurados.</p>
              <ul className="mb-4 space-y-1 text-slate-700">
                <li>Multiempresa (2 incluidas)</li>
                <li>Varias cuentas bancarias</li>
                <li>Prevalidación de modelos 303/130/111</li>
                <li>Libros contables automáticos</li>
                <li>Dashboard financiero avanzado</li>
                <li>Estimación del Impuesto de Sociedades</li>
              </ul>
              <p className="mb-1 text-lg font-semibold">69 €/mes</p>
              <p className="mb-4 text-xs text-slate-500">o 690 €/año</p>
              <Link
                href={`${APP_BASE_URL}/signup?plan=profesional`}
                className="mt-auto rounded-md border border-slate-900 px-4 py-2 text-center text-sm font-medium hover:bg-slate-900 hover:text-white"
              >
                Empezar con Profesional
              </Link>
            </div>

            <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-1 text-base font-semibold">Enterprise</h3>
              <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">Para despachos profesionales y empresas con estructura compleja.</p>
              <ul className="mb-4 space-y-1 text-slate-700">
                <li>Multiempresa ilimitada</li>
                <li>Acceso por certificado digital</li>
                <li>Firma electrónica integrada</li>
                <li>API privada</li>
                <li>Delegaciones electrónicas automáticas</li>
                <li>Soporte prioritario</li>
              </ul>
              <p className="mb-4 text-lg font-semibold">149 €/mes por empresa</p>
              <Link
                href="/contacto?plan=enterprise"
                className="mt-auto rounded-md border border-slate-900 px-4 py-2 text-center text-sm font-medium hover:bg-slate-900 hover:text-white"
              >
                Hablar con ventas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICIOS ADICIONALES */}
      <section id="servicios" className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="mb-3 text-2xl font-semibold tracking-tight">Servicios adicionales (on-demand)</h2>
          <p className="mb-4 text-sm text-slate-700">Contratación directa desde la aplicación sin abandonar el panel:</p>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <ul className="list-disc space-y-1 pl-5 text-slate-700">
              <li>Tramitación de certificados digitales</li>
              <li>Constitución de sociedades</li>
              <li>Servicios notariales online (más de 100 trámites)</li>
              <li>Modificaciones estatutarias</li>
            </ul>
            <ul className="list-disc space-y-1 pl-5 text-slate-700">
              <li>Altas de autónomos y cambios censales</li>
              <li>Presentación de modelos especiales</li>
              <li>Revisión documental y legalización</li>
              <li>Representación ante AEAT y Seguridad Social</li>
            </ul>
          </div>
          <div className="mt-6">
            <Link
              href="/servicios"
              className="rounded-md border border-slate-900 px-4 py-2 text-sm font-medium hover:bg-slate-900 hover:text-white"
            >
              Ver catálogo completo
            </Link>
          </div>
        </div>
      </section>

      {/* SEGURIDAD */}
      <section id="seguridad" className="border-b bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="mb-3 text-2xl font-semibold tracking-tight">Seguridad e infraestructura</h2>
          <p className="mb-4 text-sm text-slate-700">Infraestructura diseñada para la normativa española.</p>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <ul className="list-disc space-y-1 pl-5 text-slate-700">
              <li>Cumplimiento Verifactu nativo</li>
              <li>Integración con bancos bajo PSD2</li>
              <li>Tokens cifrados y comunicaciones seguras</li>
            </ul>
            <ul className="list-disc space-y-1 pl-5 text-slate-700">
              <li>Acceso con certificado digital en planes superiores</li>
              <li>Infraestructura desplegada en Google Cloud</li>
              <li>Control de accesos multiempresa</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">Preguntas frecuentes</h2>
          <div className="space-y-4 text-sm text-slate-800">
            <div>
              <p className="font-medium">¿Necesito tarjeta para registrarme?</p>
              <p className="text-slate-700">No. El plan Free es completamente gratuito y sin compromiso.</p>
            </div>
            <div>
              <p className="font-medium">¿Puedo conectar varias empresas?</p>
              <p className="text-slate-700">Sí, desde el plan Profesional.</p>
            </div>
            <div>
              <p className="font-medium">¿Cómo funciona la integración bancaria?</p>
              <p className="text-slate-700">
                Usamos proveedores PSD2 certificados. La conexión es segura y puedes darte de baja en cualquier momento.
              </p>
            </div>
            <div>
              <p className="font-medium">¿Isaak sustituye a una gestoría?</p>
              <p className="text-slate-700">
                Isaak automatiza procesos, cálculos y preparación de datos. Puedes usarlo con o sin gestoría externa.
              </p>
            </div>
            <div>
              <p className="font-medium">¿Qué implica el cumplimiento Verifactu?</p>
              <p className="text-slate-700">
                Tus facturas quedan registradas automáticamente según los requisitos oficiales de integridad, trazabilidad y seguridad.
              </p>
            </div>
            <div>
              <p className="font-medium">¿Puedo contratar trámites adicionales desde la app?</p>
              <p className="text-slate-700">
                Sí. Tienes un marketplace interno con constituciones, certificados, servicios notariales y gestiones fiscales.
              </p>
            </div>
            <div>
              <p className="font-medium">¿Es seguro subir mis documentos?</p>
              <p className="text-slate-700">Sí. Utilizamos cifrado extremo a extremo y almacenamiento seguro con control de acceso por empresa.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">Optimiza tu gestión fiscal y contable hoy mismo</h2>
          <p className="text-sm text-slate-200">
            Automatiza procesos, elimina errores y accede a una visión financiera completa.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap text-sm">
            <Link
              href={`${APP_BASE_URL}/signup`}
              className="rounded-md bg-white px-5 py-2.5 font-medium text-slate-900 hover:bg-slate-100"
            >
              Crear cuenta gratuita
            </Link>
            <Link
              href="/demo"
              className="rounded-md border border-white px-5 py-2.5 font-medium text-white hover:bg-white/10"
            >
              Solicitar demostración
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
