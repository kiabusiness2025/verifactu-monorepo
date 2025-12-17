 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/apps/landing/app/page.tsx b/apps/landing/app/page.tsx
index e39ae2e625ca33f1b4455aaf327bbef16ee6dc9a..7abb5db245588b0341ba560c8902a96b9bfde7cd 100644
--- a/apps/landing/app/page.tsx
+++ b/apps/landing/app/page.tsx
@@ -1,573 +1,396 @@
 "use client";
 
-import PricingCalculator from "@/app/components/PricingCalculator";
-import Faq from "@/app/components/Faq";
 import { useSession } from "next-auth/react";
-import React, { useEffect, useState } from "react";
 
-type ChatMessage = {
-  from: "Isaak" | "Tú";
-  text: string;
-  pending?: boolean;
-};
-
-const PROACTIVE_MESSAGES = [
-  "Hola 👋 soy Isaak. ¿Quieres que configuremos tus envíos VeriFactu?",
-  "Puedo analizar tus márgenes y detectar ahorros fiscales en minutos.",
-  "¿Te guío paso a paso para validar tu siguiente envío a la AEAT?",
+const heroMetrics = [
+  { label: "Alta y validación VeriFactu", value: "1 día" },
+  { label: "Libros contables actualizados", value: "24/7" },
+  { label: "Métricas de negocio", value: "En minutos" },
 ];
 
-const ISAAC_API_KEY = process.env.NEXT_PUBLIC_ISAAC_API_KEY;
-const ISAAC_ASSISTANT_ID = process.env.NEXT_PUBLIC_ISAAC_ASSISTANT_ID;
-
-export default function Page() {
-  const [chatOpen, setChatOpen] = useState(false);
-  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
-  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
-  const { data: session } = useSession();
-
-  useEffect(() => {
-    setChatMessages(PROACTIVE_MESSAGES.map((text) => ({ from: "Isaak", text })));
-  }, []);
-
-  const sendIsaakMessage = async (prompt: string) => {
-    setChatMessages((prev) => [...prev, { from: "Tú", text: prompt }]);
+const activationHighlights = [
+  {
+    title: "Activación inmediata",
+    description:
+      "Alta, configuración y validación con VeriFactu en menos de 24 h.",
+  },
+  {
+    title: "Gana en eficiencia y seguridad",
+    description:
+      "Ciclo fiscal y contable automatizado, reducción de errores y duplicidades.",
+  },
+  {
+    title: "Ventaja competitiva",
+    description:
+      "Información para decidir: facturación, margenes, previsión y pagos en tiempo real.",
+  },
+];
 
-    const placeholder: ChatMessage = {
-      from: "Isaak",
-      text: "Isaak está escribiendo...",
-      pending: true,
-    };
-    setChatMessages((prev) => [...prev, placeholder]);
+const platformFeatures = [
+  {
+    title: "Libros contables siempre listos",
+    description:
+      "Libros de ingresos, gastos e IVA actualizados automáticamente con cada operación.",
+  },
+  {
+    title: "Contabilidad automática con banca integrada",
+    description:
+      "Conciliación y registro contable conectado a tus bancos y tarjetas bajo PSD2.",
+  },
+  {
+    title: "Carga masiva de documentos",
+    description:
+      "Importa facturas y tickets desde Drive y correo con OCR avanzado y clasificación.",
+  },
+  {
+    title: "Estadísticas en tiempo real",
+    description:
+      "Panel financiero y calendario fiscal con alertas previas a cada obligación.",
+  },
+];
 
-    if (!ISAAC_API_KEY || !ISAAC_ASSISTANT_ID) {
-      setChatMessages((prev) => [
-        ...prev,
-        {
-          from: "Isaak",
-          text: "Configura las variables NEXT_PUBLIC_ISAAC_API_KEY y NEXT_PUBLIC_ISAAC_ASSISTANT_ID.",
-        },
-      ]);
-      return;
-    }
+const steps = [
+  {
+    title: "Te damos de alta en VeriFactu",
+    description:
+      "Configuración y documentación completa para que puedas emitir sin fricciones.",
+  },
+  {
+    title: "Conectamos tus sistemas",
+    description:
+      "Bancos, Drive y email listos para conciliar facturas, gastos y movimientos.",
+  },
+  {
+    title: "Modelos presentados",
+    description:
+      "Libros contables al día, modelos generados y calendario fiscal con alertas.",
+  },
+];
 
-    try {
-      const response = await fetch("https://api.openai.com/v1/responses", {
-        method: "POST",
-        headers: {
-          "Content-Type": "application/json",
-          Authorization: `Bearer ${ISAAC_API_KEY}`,
-        },
-        body: JSON.stringify({
-          model: "gpt-4.1-mini",
-          assistant_id: ISAAC_ASSISTANT_ID,
-          input: [{ role: "user", content: prompt }],
-        }),
-      });
+const solutions = [
+  {
+    title: "Tarifa fija para autónomos y pymes",
+    badges: ["Soporte y configuración", "Migración VeriFactu", "Asesoría y alta AEAT"],
+    accent: "fixed",
+    note: "*Todas las modalidades incluyen alta en VeriFactu",
+  },
+  {
+    title: "A medida para gestorías",
+    badges: ["Plataforma personalizada", "Accesos por cliente", "Presentación masiva"],
+    accent: "custom",
+  },
+];
 
-      const data = await response.json();
-      const text =
-        data?.output?.[0]?.content?.[0]?.text?.value ||
-        "Tengo dificultades para responder ahora mismo, ¿puedes intentarlo de nuevo en unos minutos?";
+const featureColumns = [
+  {
+    title: "Usabilidad",
+    items: [
+      "Tableros claros con métricas de negocio relevantes",
+      "Seguimiento de márgenes por factura, cliente y cuenta",
+      "Alertas y recordatorios preventivos",
+    ],
+  },
+  {
+    title: "Integraciones",
+    items: [
+      "Google Drive y correo para entrada de facturas",
+      "Conciliación bancaria bajo PSD2",
+      "Integración con sistemas de facturación",
+    ],
+  },
+  {
+    title: "Documentos",
+    items: [
+      "OCR avanzado con clasificación automática",
+      "Facturas y tickets de gasto en Drive y mail",
+      "Archivados automáticamente en la nube",
+    ],
+  },
+  {
+    title: "Preparado para AEAT",
+    items: [
+      "Conectado con VeriFactu",
+      "Libros contables y modelos fiscales",
+      "Presentación a la AEAT sin salir del panel",
+    ],
+  },
+];
 
-      setChatMessages((prev) => [
-        ...prev.filter((msg) => !msg.pending),
-        { from: "Isaak", text },
-      ]);
-    } catch (error) {
-      console.error("Error comunicando con Isaak", error);
-      setChatMessages((prev) => [
-        ...prev.filter((msg) => !msg.pending),
-        {
-          from: "Isaak",
-          text: "No puedo conectarme con Isaak ahora mismo. Inténtalo más tarde.",
-        },
-      ]);
-    }
-  };
+const deepFeatures = [
+  {
+    title: "OCR inteligente y conciliación",
+    description:
+      "Automatiza la entrada de facturas desde Drive y email, clasifícalas y concílialas con tus bancos sin esfuerzo.",
+  },
+  {
+    title: "Asesoramiento real-time",
+    description:
+      "Análisis de márgenes, previsión de impuestos y alertas de liquidez para decidir con datos fiables.",
+  },
+  {
+    title: "VeriFactu y modelos AEAT",
+    description:
+      "Emite facturas, lleva los libros oficiales y presenta modelos 303, 130, 111 y SOC sin abandonar la plataforma.",
+  },
+];
 
-  const handleChatSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
-    event.preventDefault();
-    const form = event.currentTarget;
-    const formData = new FormData(form);
-    const message = String(formData.get("message") || "").trim();
-    if (!message) return;
-    form.reset();
-    sendIsaakMessage(message);
-  };
+export default function Page() {
+  const { data: session } = useSession();
 
   return (
     <div className="page">
-      {mobileMenuOpen && (
-        <div
-          className="mobile-menu-backdrop"
-          onClick={() => setMobileMenuOpen(false)}
-          aria-hidden="true"
-        />
-      )}
       <header className="header">
         <div className="container header__inner">
           <a href="#hero" className="brand" aria-label="Volver al inicio">
             <img
-              src="/assets/verifactu-logo-animated.svg"
+              src="/assets/verifactu-business-logo.svg"
               alt="VeriFactu Business"
               className="brand__image"
             />
           </a>
-          <div className="header__nav-wrapper">
-            <button
-              className="header__mobile-toggle"
-              aria-label="Toggle menu"
-              aria-expanded={mobileMenuOpen}
-              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
-            >
-              <svg
-                width="24"
-                height="24"
-                viewBox="0 0 24 24"
-                fill="none"
-                xmlns="http://www.w3.org/2000/svg"
-              >
-                {mobileMenuOpen ? (
-                  <path
-                    d="M18 6L6 18M6 6l12 12"
-                    stroke="currentColor"
-                    strokeWidth="2"
-                    strokeLinecap="round"
-                    strokeLinejoin="round"
-                  />
-                ) : (
-                  <path
-                    d="M4 6h16M4 12h16M4 18h16"
-                    stroke="currentColor"
-                    strokeWidth="2"
-                    strokeLinecap="round"
-                    strokeLinejoin="round"
-                  />
-                )}
-              </svg>
-            </button>
-            <nav className={`nav ${mobileMenuOpen ? "is-open" : ""}`}>
-              <a href="#value" onClick={() => setMobileMenuOpen(false)}>
-                Propuesta
-              </a>
-              <a href="#key-features" onClick={() => setMobileMenuOpen(false)}>
-                Funcionalidades
-              </a>
-              <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>
-                Planes
-              </a>
-              <a href="#services" onClick={() => setMobileMenuOpen(false)}>
-                Servicios
-              </a>
-              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>
-                FAQ
-              </a>
-            </nav>
-          </div>
-          <div className={`header__cta ${mobileMenuOpen ? "is-open" : ""}`}>
+          <nav className="nav">
+            <a href="#platform">VeriFactu</a>
+            <a href="#process">Process</a>
+            <a href="#solutions">Planes</a>
+            <a href="#features">Características</a>
+            <a href="#contact">Contacto</a>
+          </nav>
+          <div className="header__cta">
             {session ? (
               <a className="btn btn--ghost" href="/dashboard">
                 Ir al panel
               </a>
             ) : (
               <a className="btn btn--ghost" href="/api/auth/signin">
-                Acceder
+                Accede
               </a>
             )}
-            <a className="btn btn--primary" href="/contact">
-              Solicitar demo
+            <a className="btn btn--primary" href="/auth/signup">
+              Comenzar gratis
             </a>
           </div>
         </div>
       </header>
 
       <main>
         <section id="hero" className="hero">
           <div className="hero__background" aria-hidden="true" />
-          <div className="container hero__inner">
-            <div className="hero__copy">
-              <p className="hero__eyebrow">LANDING COMPLETA – verifactu.business</p>
-              <h1>Gestión fiscal y contable automatizada para tu empresa</h1>
-              <h2 className="hero__subtitle">
-                La plataforma integral que conecta Verifactu, bancos, Google Drive y un asistente fiscal especializado en normativa española. Todo en un único panel inteligente.
-              </h2>
-              <p className="hero__description">
-                Control financiero en tiempo real, calendario fiscal automático y contabilidad generada por IA.
+          <div className="container hero__grid">
+            <div className="hero__content">
+              <p className="hero__badge">Verifactu Business</p>
+              <h1>
+                La forma más rápida y segura de cumplir con VeriFactu mientras crece tu negocio
+              </h1>
+              <p className="hero__lead">
+                Emite facturas, lleva tus libros y presenta modelos a la AEAT con la misma plataforma. Sin cambios en tu operativa.
               </p>
+              <ul className="hero__metrics">
+                {heroMetrics.map((metric) => (
+                  <li key={metric.label}>
+                    <strong>{metric.value}</strong>
+                    <span>{metric.label}</span>
+                  </li>
+                ))}
+              </ul>
+              <ul className="hero__bullets">
+                <li>Alta y validación con VeriFactu en 1 día.</li>
+                <li>Libros contables actualizados automáticamente.</li>
+                <li>Métricas de negocio y previsión de impuestos.</li>
+              </ul>
               <div className="hero__actions">
                 <a className="btn btn--primary" href="/auth/signup">
-                  Crear cuenta gratuita
+                  Comenzar gratis
                 </a>
-                <a className="btn btn--ghost" href="#key-features">
-                  Explorar funcionalidades
+                <a className="btn btn--ghost" href="/contact">
+                  Solicitar una demo
                 </a>
               </div>
-              <p className="hero__microcopy">Sin tarjeta. Configuración inicial en menos de 2 minutos.</p>
-              <p className="hero__description">
-                IA fiscal que entiende tu negocio, automatiza tus procesos y te prepara para cada obligación tributaria.
-              </p>
+              <p className="hero__microcopy">Sin fricción con AEAT. Sin modificar tus procesos actuales.</p>
             </div>
 
-            <div className="hero__mockup" aria-hidden="true">
-              <div className="mockup mockup--assistant">
-                <header className="mockup__header">
-                  <div>
-                    <span className="mockup__badge">Isaak</span>
-                    <p className="mockup__title">Respuestas inmediatas</p>
-                  </div>
-                  <span className="mockup__status">Conectado a AEAT</span>
-                </header>
-                <div className="mockup__body">
-                  <article className="mockup__message">
-                    <span className="mockup__avatar">🙋</span>
-                    <div>
-                      <p className="mockup__label">Usuario</p>
-                      <p className="mockup__text">
-                        “¿Cómo voy este trimestre? Necesito el IVA estimado y si hay riesgos de descuadre.”
-                      </p>
-                    </div>
-                  </article>
-                  <article className="mockup__message mockup__message--light">
-                    <span className="mockup__avatar">🤖</span>
-                    <div>
-                      <p className="mockup__label">Isaak</p>
-                      <p className="mockup__text">
-                        “Ingresos del 2T: 14.980 €. Gastos deducibles: 3.420 €. IVA devengado: 3.145 €. IVA soportado: 718 €. Previsión de cuota: 2.427 €. No detecto inconsistencias.”
-                      </p>
-                    </div>
-                  </article>
-                  <article className="mockup__message">
-                    <span className="mockup__avatar">🙋</span>
-                    <div>
-                      <p className="mockup__label">Usuario</p>
-                      <p className="mockup__text">
-                        “Subo estas 12 facturas de gasto. Clasifícalas y cuéntame si alguna no es deducible.”
-                      </p>
-                    </div>
-                  </article>
-                  <article className="mockup__message mockup__message--light">
-                    <span className="mockup__avatar">🤖</span>
-                    <div>
-                      <p className="mockup__label">Isaak</p>
-                      <p className="mockup__text">
-                        “11 facturas clasificadas correctamente. 1 factura no deducible: servicio de entretenimiento. Todo se ha registrado en tu libro de gastos.”
-                      </p>
-                    </div>
-                  </article>
-                  <article className="mockup__message">
-                    <span className="mockup__avatar">🙋</span>
-                    <div>
-                      <p className="mockup__label">Usuario</p>
-                      <p className="mockup__text">
-                        “Concíliame los movimientos bancarios de esta semana y dime si queda algo pendiente de cobrar.”
-                      </p>
-                    </div>
-                  </article>
-                  <article className="mockup__message mockup__message--light">
-                    <span className="mockup__avatar">🤖</span>
-                    <div>
-                      <p className="mockup__label">Isaak</p>
-                      <p className="mockup__text">
-                        “8 movimientos conciliados con tus facturas. 1 transferencia de 412 € pendiente de asociar. 2 facturas emitidas siguen sin cobro.”
-                      </p>
-                    </div>
-                  </article>
-                </div>
+            <div className="hero__card" aria-label="Formulario de interés">
+              <div className="card__header">
+                <p className="card__badge">Verifactu Business</p>
+                <p className="card__title">El asistente fiscal que no sólo envía.</p>
+                <p className="card__subtitle">
+                  Gestiona envíos, libros contables y modelos desde un único panel.
+                </p>
               </div>
+              <form className="card__form">
+                <label>
+                  <span>Nombre de tu negocio o marca*</span>
+                  <input type="text" placeholder="Ej. Bar Botafumeiro" required />
+                </label>
+                <label>
+                  <span>Número de facturas a la semana</span>
+                  <select>
+                    <option value="">Elige una opción</option>
+                    <option value="10">Hasta 10</option>
+                    <option value="25">11 - 25</option>
+                    <option value="50">26 - 50</option>
+                    <option value="100">Más de 50</option>
+                  </select>
+                </label>
+                <label>
+                  <span>Provincia</span>
+                  <input type="text" placeholder="Ej. Madrid" />
+                </label>
+                <button type="submit" className="btn btn--primary btn--full">
+                  Empezar ahora
+                </button>
+              </form>
+              <p className="card__footer">Nosotros nos encargamos del resto.</p>
             </div>
           </div>
         </section>
 
-        <section id="value" className="section features">
-          <div className="container">
-            <div className="section__header">
-              <h2>Centraliza toda la gestión fiscal y contable en un único sistema</h2>
-              <p>
-                Verifactu, bancos, gastos, documentos, calendario fiscal e inteligencia artificial especializada en España. Una infraestructura empresarial diseñada para maximizar control, eficiencia y seguridad.
-              </p>
-            </div>
-            <div className="features__grid">
-              <article className="feature-card">
-                <h3>Beneficios clave</h3>
-                <ul>
-                  <li>Automatización completa del ciclo fiscal y contable.</li>
-                  <li>Libros oficiales actualizados de forma continua.</li>
-                  <li>Eliminación de errores y duplicidades.</li>
-                  <li>Visión financiera 360º en tiempo real.</li>
-                  <li>Preparación automatizada de los modelos 303, 130, 111 e Impuesto de Sociedades.</li>
-                  <li>Cumplimiento nativo con Verifactu.</li>
-                </ul>
-              </article>
-              <article className="feature-card">
-                <h3>Core tecnológico</h3>
-                <ul>
-                  <li>Next.js (UI + API) sobre Cloud Run y Cloud SQL.</li>
-                  <li>Integraciones Drive, PSD2, Verifactu y Google Calendar.</li>
-                  <li>Isaak como asistente fiscal orquestado con datos en vivo.</li>
-                  <li>Roles multiempresa y acceso con identidad digital.</li>
-                </ul>
-              </article>
-            </div>
-          </div>
-        </section>
-
-        <section id="key-features" className="section features">
-          <div className="container">
-            <div className="section__header">
-              <h2>Funcionalidades clave</h2>
-              <p>Automatización VeriFactu, OCR, banca, contabilidad e IA fiscal en el mismo panel.</p>
-            </div>
-            <div className="features__grid">
-              <article className="feature-card">
-                <h3>Facturación Verifactu</h3>
-                <ul>
-                  <li>Emisión certificada y registro automático.</li>
-                  <li>Control de cobros y vencimientos.</li>
-                  <li>Envío profesional a clientes.</li>
-                </ul>
-              </article>
-              <article className="feature-card">
-                <h3>Gastos y OCR avanzado</h3>
-                <ul>
-                  <li>Integración con Google Drive.</li>
-                  <li>OCR inteligente y clasificación automática.</li>
-                  <li>Registro contable inmediato.</li>
-                </ul>
-              </article>
-              <article className="feature-card">
-                <h3>Integración bancaria (PSD2)</h3>
-                <ul>
-                  <li>Conexión segura con entidades españolas.</li>
-                  <li>Importación automática de movimientos.</li>
-                  <li>Conciliación con facturas y gastos.</li>
-                  <li>Alertas financieras y de liquidez.</li>
-                </ul>
+        <section className="section highlights">
+          <div className="container highlights__grid">
+            {activationHighlights.map((item) => (
+              <article key={item.title} className="tile">
+                <h3>{item.title}</h3>
+                <p>{item.description}</p>
               </article>
-              <article className="feature-card">
-                <h3>Contabilidad automática</h3>
-                <ul>
-                  <li>Libros diario, mayor e IVA.</li>
-                  <li>Conciliación completa.</li>
-                  <li>Resultados del periodo en tiempo real.</li>
-                  <li>Proyección de cierre anual.</li>
-                </ul>
-              </article>
-              <article className="feature-card">
-                <h3>Asistente fiscal “Isaak”</h3>
-                <p>Asesoramiento guiado, análisis documental, explicaciones normativas, cálculos automáticos y soporte integral.</p>
-              </article>
-              <article className="feature-card">
-                <h3>Calendario fiscal inteligente</h3>
-                <ul>
-                  <li>Generación automática de obligaciones.</li>
-                  <li>Sincronización con Google Calendar.</li>
-                  <li>Recordatorios previos a cada presentación.</li>
-                </ul>
-              </article>
-            </div>
+            ))}
           </div>
         </section>
 
-        <section id="audience" className="section features">
+        <section id="platform" className="section platform">
           <div className="container">
             <div className="section__header">
-              <h2>¿Para quién es?</h2>
-              <p>Experiencia adaptada a autónomos, pymes y gestorías con operativa multiempresa.</p>
+              <h2>Una plataforma creada para liderar la era VeriFactu</h2>
+              <p>Todo lo que necesitas para emitir, conciliar y presentar sin salir de un único panel.</p>
             </div>
-            <div className="features__grid">
-              <article className="feature-card">
-                <h3>Autónomos</h3>
-                <p>Gestión simple, automática y sin fricciones.</p>
-              </article>
-              <article className="feature-card">
-                <h3>Pymes</h3>
-                <p>Control completo de facturación, bancos, impuestos y documentación.</p>
-              </article>
-              <article className="feature-card">
-                <h3>Gestorías y despachos</h3>
-                <p>Operativa multiempresa con automatización contable y fiscal de alto nivel.</p>
-              </article>
+            <div className="platform__grid">
+              {platformFeatures.map((feature) => (
+                <article key={feature.title} className="card">
+                  <h3>{feature.title}</h3>
+                  <p>{feature.description}</p>
+                </article>
+              ))}
             </div>
           </div>
         </section>
 
-        <section id="pricing" className="section">
-          <PricingCalculator />
-          <div className="pricing-section__cta">
-            <a className="btn btn--ghost" href="/contact">
-              Comparar planes
-            </a>
-          </div>
-        </section>
-
-        <section id="services" className="section features">
+        <section id="process" className="section process">
           <div className="container">
             <div className="section__header">
-              <h2>Servicios adicionales on-demand</h2>
-              <p>Contratación directa desde la aplicación sin abandonar el panel.</p>
+              <h2>De la emisión al cobro en tres pasos</h2>
+              <p>
+                VeriFactu listo en 24 h, conciliación bancaria automática y calendarios fiscales con recordatorios.
+              </p>
             </div>
-            <div className="features__grid">
-              <article className="feature-card">
-                <ul>
-                  <li>Tramitación de certificados digitales.</li>
-                  <li>Constitución de sociedades.</li>
-                  <li>Servicios notariales online (más de 100 trámites).</li>
-                  <li>Modificaciones estatutarias.</li>
-                  <li>Altas de autónomos y cambios censales.</li>
-                  <li>Presentación de modelos especiales.</li>
-                  <li>Revisión documental y legalización.</li>
-                  <li>Representación ante AEAT y Seguridad Social.</li>
-                </ul>
-                <a className="btn btn--dark" href="/contact">Ver catálogo completo</a>
-              </article>
+            <div className="process__steps">
+              {steps.map((step, index) => (
+                <article key={step.title} className="step">
+                  <span className="step__number">{index + 1}</span>
+                  <div>
+                    <h3>{step.title}</h3>
+                    <p>{step.description}</p>
+                  </div>
+                </article>
+              ))}
             </div>
           </div>
         </section>
 
-        <section id="security" className="section features">
+        <section id="solutions" className="section solutions">
           <div className="container">
             <div className="section__header">
-              <h2>Seguridad</h2>
-              <p>Infraestructura diseñada para la normativa española.</p>
+              <h2>Elige la solución que mejor se adapta a tu organización</h2>
+              <p>Planes claros para equipos que quieren cumplir y crecer.</p>
             </div>
-            <div className="features__grid">
-              <article className="feature-card">
-                <ul>
-                  <li>Cumplimiento Verifactu nativo.</li>
-                  <li>Integración con bancos bajo PSD2.</li>
-                  <li>Tokens cifrados y comunicaciones seguras.</li>
-                  <li>Acceso con certificado digital en planes superiores.</li>
-                  <li>Infraestructura desplegada en Google Cloud.</li>
-                  <li>Control de accesos multiempresa.</li>
-                </ul>
-              </article>
+            <div className="solutions__grid">
+              {solutions.map((solution) => (
+                <article
+                  key={solution.title}
+                  className={`solution ${solution.accent === "custom" ? "solution--custom" : ""}`}
+                >
+                  <p className="solution__eyebrow">Verifactu Business</p>
+                  <h3>{solution.title}</h3>
+                  <ul>
+                    {solution.badges.map((badge) => (
+                      <li key={badge}>{badge}</li>
+                    ))}
+                  </ul>
+                  {solution.note && <p className="solution__note">{solution.note}</p>}
+                  <a className="btn btn--primary" href="/auth/signup">
+                    Comenzar ahora
+                  </a>
+                </article>
+              ))}
             </div>
           </div>
         </section>
 
-        <Faq />
-
-        <section className="section cta">
+        <section id="cta" className="cta">
           <div className="container cta__inner">
             <div>
-              <h2>Optimiza tu gestión fiscal y contable hoy mismo</h2>
-              <p>
-                Automatiza procesos, elimina errores y accede a una visión financiera completa.
-              </p>
+              <h2>Verifactu Business es la manera más rápida y segura de cumplir con VeriFactu</h2>
+              <p>Emite facturas, lleva tus libros y presenta modelos con la menor intervención humana.</p>
               <div className="cta__actions">
                 <a className="btn btn--primary" href="/auth/signup">
-                  Crear cuenta gratuita
+                  Empezar ahora
                 </a>
                 <a className="btn btn--ghost" href="/contact">
-                  Solicitar demostración
+                  Solicitar una demo
                 </a>
               </div>
             </div>
-            <div className="cta__badge" aria-hidden="true">
-              <p className="cta__label">Infraestructura fiscal-as-a-service</p>
-              <p className="cta__value">verifactu.business</p>
+            <div className="cta__badge">
+              <span className="cta__pill">Verifactu Business</span>
+              <strong>Cumplimiento y eficiencia con un menor coste.</strong>
             </div>
           </div>
         </section>
+
+        <section id="features" className="section columns">
+          <div className="container columns__grid">
+            {featureColumns.map((column) => (
+              <article key={column.title} className="column-card">
+                <p className="column__eyebrow">verifactu.business</p>
+                <h3>{column.title}</h3>
+                <ul>
+                  {column.items.map((item) => (
+                    <li key={item}>{item}</li>
+                  ))}
+                </ul>
+              </article>
+            ))}
+          </div>
+        </section>
+
+        <section className="section deep-features">
+          <div className="container deep-features__grid">
+            {deepFeatures.map((item) => (
+              <article key={item.title} className="deep-card">
+                <h3>{item.title}</h3>
+                <p>{item.description}</p>
+              </article>
+            ))}
+          </div>
+        </section>
       </main>
 
-      <footer className="footer">
+      <footer id="contact" className="footer">
         <div className="container footer__inner">
           <div>
             <img
-              src="/assets/verifactu-logo-animated.svg"
+              src="/assets/verifactu-business-logo.svg"
               alt="VeriFactu Business"
               className="footer__logo"
             />
-            <p className="footer__tagline">
-              Asistente IA Isaak · Cumple la normativa AEAT VeriFactu
-            </p>
+            <p className="footer__tagline">Asistente IA Isaak · Cumple la normativa AEAT VeriFactu</p>
           </div>
           <div className="footer__links">
-            <a href="mailto:soporte@verifactu.business">
-              soporte@verifactu.business
-            </a>
+            <a href="mailto:soporte@verifactu.business">soporte@verifactu.business</a>
             <a href="/privacy">Política de Privacidad</a>
             <a href="/terms">Condiciones de Uso</a>
             <a href="/cookies">Cookies</a>
           </div>
         </div>
         <p className="footer__legal">© 2025 Veri*Factu Business</p>
       </footer>
-
-      <button
-        className="isaak-fab"
-        type="button"
-        aria-controls="isaak-chat"
-        aria-expanded={chatOpen}
-        onClick={() => setChatOpen((state) => !state)}
-      >
-        <span className="isaak-fab__avatar">🤖</span>
-        <span className="isaak-fab__label">Habla con Isaak</span>
-      </button>
-
-      <section className="isaak-chat" id="isaak-chat" aria-hidden={!chatOpen}>
-        <header className="isaak-chat__header">
-          <div>
-            <span className="isaak-chat__avatar">🤖</span>
-            <div>
-              <p className="isaak-chat__title">Isaak, tu asistente fiscal</p>
-              <p className="isaak-chat__status">Proactivo · Conectado a AEAT</p>
-            </div>
-          </div>
-          <button
-            className="isaak-chat__close"
-            type="button"
-            aria-label="Cerrar chat"
-            onClick={() => setChatOpen(false)}
-          >
-            ×
-          </button>
-        </header>
-        <div className="isaak-chat__proactive" role="log" aria-live="polite">
-          {PROACTIVE_MESSAGES.map((text) => (
-            <div className="isaak-chat__proactive-bubble" key={text}>
-              {text}
-            </div>
-          ))}
-        </div>
-        <div className="isaak-chat__messages" role="list">
-          {chatMessages.map((message, index) => (
-            <div
-              key={`${message.from}-${index}-${message.text}`}
-              className={`isaak-chat__message ${message.from === "Isaak" ? "from-isaak" : "from-user"} ${
-                message.pending ? "is-pending" : ""
-              }`}
-            >
-              <span className="isaak-chat__message-avatar">
-                {message.from === "Isaak" ? "🤖" : "🙋"}
-              </span>
-              <div>
-                <p className="isaak-chat__message-label">{message.from}</p>
-                <p className="isaak-chat__message-text">{message.text}</p>
-              </div>
-            </div>
-          ))}
-        </div>
-        <form
-          className="isaak-chat__form"
-          autoComplete="off"
-          onSubmit={handleChatSubmit}
-        >
-          <label className="sr-only" htmlFor="isaak-input">
-            Escribe tu mensaje
-          </label>
-          <input
-            id="isaak-input"
-            name="message"
-            type="text"
-            placeholder="Pregunta a Isaak sobre tu facturación"
-            required
-          />
-          <button type="submit">Enviar</button>
-        </form>
-      </section>
     </div>
   );
 }
 
EOF
)