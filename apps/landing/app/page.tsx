"use client";

import PricingCalculator from "@/app/components/PricingCalculator";
import Faq from "@/app/components/Faq";
import { useSession } from "next-auth/react";
import React, { useEffect, useMemo, useState } from "react";

type Plan = {
  name: string;
  price: number;
  variablePct: number;
  users: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  highlight?: boolean;
  priceId?: string;
};

type ChatMessage = {
  from: "Isaak" | "Tú";
  text: string;
  pending?: boolean;
};

type LeadStatus = {
  tone: "idle" | "success" | "error";
  message: string;
};

const PROACTIVE_MESSAGES = [
  "Hola 👋 soy Isaak. ¿Quieres que configuremos tus envíos VeriFactu?",
  "Puedo analizar tus márgenes y detectar ahorros fiscales en minutos.",
  "¿Te guío paso a paso para validar tu siguiente envío a la AEAT?",
];

const ISAAC_API_KEY = process.env.NEXT_PUBLIC_ISAAC_API_KEY;
const ISAAC_ASSISTANT_ID = process.env.NEXT_PUBLIC_ISAAC_ASSISTANT_ID;

function sanitizeSales(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export default function Page() {
  const [monthlySales, setMonthlySales] = useState(10000);
  const [leadInterest, setLeadInterest] = useState("register");
  const [leadStatus, setLeadStatus] = useState<LeadStatus>({
    tone: "idle",
    message: "",
  });
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    setChatMessages(
      PROACTIVE_MESSAGES.map((text) => ({ from: "Isaak", text })),
    );
  }, []);

  const handleLeadSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    setLeadSubmitting(true);
    setLeadStatus({ tone: "idle", message: "" });

    try {
      const response = await fetch("/api/send-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error || "No se pudo enviar tu solicitud. Inténtalo de nuevo.",
        );
      }

      setLeadStatus({
        tone: "success",
        message: "Solicitud enviada. Te contactaremos en breve.",
      });
      form.reset();
    } catch (error) {
      setLeadStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "No hemos podido enviar la solicitud. Revisa los datos o inténtalo en unos minutos.",
      });
    } finally {
      setLeadSubmitting(false);
    }
  };

  const sendIsaakMessage = async (prompt: string) => {
    setChatMessages((prev) => [...prev, { from: "Tú", text: prompt }]);

    const placeholder: ChatMessage = {
      from: "Isaak",
      text: "Isaak está escribiendo...",
      pending: true,
    };
    setChatMessages((prev) => [...prev, placeholder]);

    if (!ISAAC_API_KEY || !ISAAC_ASSISTANT_ID) {
      setChatMessages((prev) => [
        ...prev,
        {
          from: "Isaak",
          text: "Configura las variables NEXT_PUBLIC_ISAAC_API_KEY y NEXT_PUBLIC_ISAAC_ASSISTANT_ID.",
        },
      ]);
      return;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ISAAC_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          assistant_id: ISAAC_ASSISTANT_ID,
          input: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      const text =
        data?.output?.[0]?.content?.[0]?.text?.value ||
        "Tengo dificultades para responder ahora mismo, ¿puedes intentarlo de nuevo en unos minutos?";

      setChatMessages((prev) => [
        ...prev.filter((msg) => !msg.pending),
        { from: "Isaak", text },
      ]);
    } catch (error) {
      console.error("Error comunicando con Isaak", error);
      setChatMessages((prev) => [
        ...prev.filter((msg) => !msg.pending),
        {
          from: "Isaak",
          text: "No puedo conectarme con Isaak ahora mismo. Inténtalo más tarde.",
        },
      ]);
    }
  };

  const handleChatSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const message = String(formData.get("message") || "").trim();
    if (!message) return;
    form.reset();
    sendIsaakMessage(message);
  };

  return (
    <div className="page">
      {mobileMenuOpen && (
        <div
          className="mobile-menu-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <header className="header">
        <div className="container header__inner">
          <a href="#hero" className="brand" aria-label="Volver al inicio">
            <img
              src="/assets/verifactu-logo-animated.svg"
              alt="VeriFactu Business"
              className="brand__image"
            />
          </a>
           <div className="header__nav-wrapper">
             <button
              className="header__mobile-toggle"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {mobileMenuOpen ? (
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M4 6h16M4 12h16M4 18h16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </button>
             <nav className={`nav ${mobileMenuOpen ? "is-open" : ""}`}>
               <a href="#features" onClick={() => setMobileMenuOpen(false)}>Producto</a>
               <a href="#workflow" onClick={() => setMobileMenuOpen(false)}>VeriFactu</a>
               <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Planes</a>
               <a href="#resources" onClick={() => setMobileMenuOpen(false)}>Recursos</a>
             </nav>
           </div>
           <div className={`header__cta ${mobileMenuOpen ? "is-open" : ""}`}>
            {session ? (
              <a className="btn btn--ghost" href="/dashboard">
                Ir al panel
              </a>
            ) : (
              <a className="btn btn--ghost" href="/api/auth/signin">
                Acceder
              </a>
            )}
            <a className="btn btn--primary" href="/contact">
              Solicitar demo
            </a>
          </div>
        </div>
      </header>

      <main>
        <section id="hero" className="hero">
          <div className="hero__background" aria-hidden="true" />
          <div className="container hero__inner">
            <div className="hero__copy">
              <p className="hero__eyebrow">
                Cumple con VeriFactu y haz crecer tu negocio.
              </p>
              <h1>La forma más inteligente de automatizar tu facturación.</h1>
              <h2 className="hero__subtitle">
                Software VeriFactu certificado con IA para asesorías, pymes y autónomos.
              </h2>
              <p className="hero__description">
                Isaak centraliza la emisión, valida con la AEAT y te sugiere cómo
                mejorar tus márgenes automáticamente.
              </p>
              <div className="hero__actions">
                <a className="btn btn--primary" href="/auth/signup">
                  Probar gratis 30 días
                </a>
                <a className="btn btn--ghost" href="/contact">
                  Solicitar demo
                </a>
              </div>
              <div className="hero__trust">
                <span>
                  Equipos fiscales, asesorías y despachos confían en Isaak.
                </span>
              </div>
            </div>

            <div className="hero__mockup" aria-hidden="true">
              <div className="mockup mockup--assistant">
                <header className="mockup__header">
                  <div>
                    <span className="mockup__badge">Isaak</span>
                    <p className="mockup__title">Estado diario del negocio</p>
                  </div>
                  <span className="mockup__status">Conectado</span>
                </header>
                <div className="mockup__body">
                  <article className="mockup__message">
                    <span className="mockup__avatar">🤖</span>
                    <div>
                      <p className="mockup__label">Isaak</p>
                      <p className="mockup__text">
                        Ingresos del mes +12% vs. objetivo. ¿Agendamos revisión
                        para impuestos?
                      </p>
                    </div>
                  </article>
                  <article className="mockup__message mockup__message--light">
                    <span className="mockup__avatar">🤖</span>
                    <div>
                      <p className="mockup__label">Isaak</p>
                      <p className="mockup__text">
                        Tu envío VeriFactu se ha validado. Preparando el informe de
                        márgenes.
                      </p>
                    </div>
                  </article>
                  <article className="mockup__message">
                    <span className="mockup__avatar">🤖</span>
                    <div>
                      <p className="mockup__label">Isaak</p>
                      <p className="mockup__text">
                        Detecté suscripciones duplicadas. Ahorro potencial de 240€
                        trimestrales.
                      </p>
                    </div>
                  </article>
                </div>
              </div>

              <div className="mockup mockup--snapshot">
                <header>
                  <span className="snapshot__title">Resumen VeriFactu</span>
                  <span className="snapshot__chip">Cumplimiento 100%</span>
                </header>
                <div className="snapshot__grid">
                  <div>
                    <p className="snapshot__label">Beneficio neto</p>
                    <p className="snapshot__value">8.450€</p>
                    <span className="snapshot__trend snapshot__trend--up">
                      +12% mensual
                    </span>
                  </div>
                  <div>
                    <p className="snapshot__label">Facturas enviadas</p>
                    <p className="snapshot__value">156</p>
                    <span className="snapshot__trend">
                      VeriFactu automático
                    </span>
                  </div>
                  <div>
                    <p className="snapshot__label">Alertas activas</p>
                    <p className="snapshot__value">0</p>
                    <span className="snapshot__trend snapshot__trend--safe">
                      Isaak vigila
                    </span>
                  </div>
                </div>
              </div>

              <div className="mockup mockup--invoice">
                <header>
                  <div>
                    <span className="invoice__title">Factura VF-2031</span>
                    <p className="invoice__subtitle">Estudio Creativo Nova</p>
                  </div>
                  <span className="invoice__status">Pagada</span>
                </header>
                <dl className="invoice__details">
                  <div>
                    <dt>Emisión</dt>
                    <dd>12 Feb 2025</dd>
                  </div>
                  <div>
                    <dt>Importe</dt>
                    <dd>1.250,00 €</dd>
                  </div>
                  <div>
                    <dt>AEAT</dt>
                    <dd>Validada</dd>
                  </div>
                </dl>
                <div className="invoice__footer">
                  <div
                    className="invoice__qr"
                    role="img"
                    aria-label="Código QR factura"
                  />
                  <p>Isaak confirma la validez VeriFactu y el cobro.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="hero__stats">
            <div className="container hero__stats-grid">
              <div>
                <p className="stat__value">+350%</p>
                <p className="stat__label">Productividad en equipos fiscales</p>
              </div>
              <div>
                <p className="stat__value">100%</p>
                <p className="stat__label">
                  Cumplimiento Real Decreto 1007/2023
                </p>
              </div>
              <div>
                <p className="stat__value">24/7</p>
                <p className="stat__label">
                  Asistencia y recomendaciones con IA
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section features">
          <div className="container">
            <div className="section__header">
              <h2>Una plataforma para liderar tu cumplimiento VeriFactu.</h2>
              <p>
                Centraliza la emisión, validación y análisis de tu facturación
                con paneles diseñados para asesorías, despachos y empresas que
                necesitan precisión.
              </p>
            </div>
            <div className="features__grid">
              <article className="feature-card">
                <h3>Automatización total</h3>
                <p>
                  Emite facturas con plantillas inteligentes y sincroniza tus
                  libros con un clic.
                </p>
                <span>Firmas digitales incluidas</span>
              </article>
              <article className="feature-card">
                <h3>VeriFactu integrado</h3>
                <p>
                  Envío y validación en tiempo real con seguimiento de estados y
                  evidencias legales.
                </p>
                <span>Notificaciones automáticas</span>
              </article>
              <article className="feature-card">
                <h3>Insights accionables</h3>
                <p>
                  Analiza márgenes, flujo de caja y proyecciones con escenarios
                  sugeridos por IA.
                </p>
                <span>Informes listos para clientes</span>
              </article>
              <article className="feature-card">
                <h3>Colaboración segura</h3>
                <p>
                  Roles, permisos y auditoría completa con copias cifradas en la
                  nube.
                </p>
                <span>Certificado digital incluido</span>
              </article>
            </div>
          </div>
        </section>

        <section id="workflow" className="section workflow">
          <div className="container">
            <div className="section__header">
              <h2>Del envío al cobro en tres pasos.</h2>
              <p>
                Conecta tu ERP o empieza desde cero. Isaak guía a tu equipo,
                automatiza verificaciones y mantiene el control fiscal sin
                esfuerzo.
              </p>
            </div>
            <div className="workflow__steps">
              <article className="step">
                <span className="step__number">1</span>
                <h3>Configura Isaak</h3>
                <p>
                  Importa tus datos, define reglas de facturación y activa
                  recordatorios personalizados.
                </p>
              </article>
              <article className="step">
                <span className="step__number">2</span>
                <h3>Emite y valida</h3>
                <p>
                  Genera la factura, fírmala automáticamente y envíala a la AEAT
                  VeriFactu sin abandonar la plataforma.
                </p>
              </article>
              <article className="step">
                <span className="step__number">3</span>
                <h3>Cobra y analiza</h3>
                <p>
                  Isaak monitoriza el cobro, detecta incidencias y propone
                  acciones para mejorar tus márgenes.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="verifactu-explainer" className="section">
          <div className="container section__header">
            <h2>¿Qué es VeriFactu y cómo te afecta?</h2>
            <p style={{lineHeight: 1.7}}>
              VeriFactu es el nuevo sistema de facturación electrónica obligatorio en España, regulado por el Real Decreto 1007/2023. Su objetivo es digitalizar y estandarizar la emisión de facturas para luchar contra el fraude fiscal. Afecta a prácticamente todas las empresas y autónomos, que deberán usar un software de facturación certificado que cumpla con los requisitos técnicos de la Agencia Tributaria (AEAT), como la inclusión de un código QR y la firma digital de cada factura.
            </p>
            <p style={{marginTop: "1rem", lineHeight: 1.7}}>
              Con VeriFactu Business, no solo cumples con la normativa, sino que aprovechas la transición para automatizar tus procesos, reducir errores y obtener una visión financiera más clara gracias al análisis de Isaak.
            </p>
          </div>
        </section>

        <section id="dashboard" className="section dashboard">
          <div className="container">
            <div className="section__header">
              <h2>Un dashboard que aprende de tu negocio.</h2>
              <p>
                Isaak acompaña a tu equipo con soporte, formación y
                automatizaciones que detectan necesidades de facturación,
                contabilidad y tesorería en tiempo real.
              </p>
            </div>
            <div className="dashboard__layout">
              <div className="dashboard__preview" aria-hidden="true">
                <div className="dashboard__screen">
                  <div className="dashboard__screen-header">
                    <span>Isaak Control Center</span>
                    <span className="dashboard__badge">
                      Suscripción Business Plus
                    </span>
                  </div>
                  <div className="dashboard__metrics">
                    <div className="dashboard__metric">
                      <span className="dashboard__metric-label">
                        Ventas del mes
                      </span>
                      <strong className="dashboard__metric-value">€48.230</strong>
                      <span className="dashboard__metric-trend">
                        +8,2% vs. febrero
                      </span>
                    </div>
                    <div className="dashboard__metric">
                      <span className="dashboard__metric-label">
                        Cobros con Stripe
                      </span>
                      <strong className="dashboard__metric-value">€36.900</strong>
                      <span className="dashboard__metric-trend">
                        12 facturas por conciliar
                      </span>
                    </div>
                    <div className="dashboard__metric">
                      <span className="dashboard__metric-label">
                        Beneficio Neto
                      </span>
                      <strong className="dashboard__metric-value">€8.450</strong>
                      <span className="dashboard__metric-trend">
                        Impuesto estimado: 2.136€
                      </span>
                    </div>
                  </div>
                  <div className="dashboard__assistant-bubble">
                    <p>
                      Hola, soy Isaak 👋 He detectado tickets pendientes de
                      gasto. ¿Quieres que los contabilice y programe
                      recordatorios?
                    </p>
                    <div className="dashboard__actions">
                      <button type="button">Revisar con Isaak</button>
                      <button type="button" className="ghost">
                        Recordar más tarde
                      </button>
                    </div>
                  </div>
                  <div className="dashboard__panels">
                    <div className="dashboard__panel">
                      <h4>Importaciones activas</h4>
                      <ul>
                        <li>
                          <strong>Clientes</strong> · 1.240 registros
                          sincronizados
                        </li>
                        <li>
                          <strong>Proveedores</strong> · Integración Drive
                          completada
                        </li>
                        <li>
                          <strong>Productos</strong> · Nuevos artículos listos
                          para venta
                        </li>
                      </ul>
                    </div>
                    <div className="dashboard__panel">
                      <h4>Acciones sugeridas</h4>
                      <ul>
                        <li>
                          Generar presupuesto rápido para «Proyecto Atlas»
                        </li>
                        <li>Emitir factura proforma y envío automático AEAT</li>
                        <li>
                          Planificar formación onboarding para nuevo asesor
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="dashboard__content">
                <h3>
                  Soporte proactivo y gestión total desde cualquier dispositivo.
                </h3>
                <p>
                  Accede con tu email o Google y deja que
                  Isaak personalice el espacio de trabajo: bases de datos,
                  flujos de cobros y toda la documentación disponible para tu
                  equipo.
                </p>
                <ul className="dashboard__list">
                  <li>
                    <strong>Suscripciones bajo control:</strong> gestiona
                    planes, límites de usuarios y permisos sin salir del panel.
                  </li>
                  <li>
                    <strong>Importación / exportación guiada:</strong> Isaak
                    limpia y clasifica datos de clientes, proveedores y
                    y tarifas.
                  </li>
                  <li>
                    <strong>Operativa contable asistida:</strong> crea
                    presupuestos, proformas y contabiliza tickets reconocidos
                    desde móvil o email.
                  </li>
                  <li>
                    <strong>Finanzas al día:</strong> integra Stripe para
                    cobros, visualiza impagos, gastos, beneficio neto e
                    impuestos sugeridos.
                  </li>
                </ul>
                <div className="dashboard__cta">
                  <a className="btn btn--primary" href="/auth/signup">
                    Probar gratis 30 días
                  </a>
                  <p>
                    Sin compromiso. Isaak te guía en soporte,
                    formación y automatización desde el primer acceso.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section compliance">
          <div className="container compliance__inner">
            <div className="compliance__content">
              <h2>100% cumplimiento VeriFactu certificado.</h2>
              <p>
                Desarrollado por Expertia Asesores S.L.U.,
                colaborador social de la AEAT, Veri*Factu Business cumple con el
                Real Decreto 1007/2023 y mantiene tu evidencia fiscal siempre
                actualizada.
              </p>
              <ul className="compliance__list">
                <li>✅ Firma digital automática</li>
                <li>✅ Comunicación cifrada con AEAT</li>
                <li>✅ Copias de seguridad en la nube</li>
                <li>✅ Certificado digital incluido</li>
              </ul>
            </div>
            <div className="compliance__badge" aria-hidden="true">
              <img src="/assets/verifactu-oficial.svg" alt="Logo oficial de VeriFactu" style={{width: "160px", height: "auto"}} />
              <p>Cumplimiento verificado</p>
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="section"
        >
          <PricingCalculator />
        </section>

        <Faq />

        <section id="resources" className="section resources">
          <div className="container">
            <div className="section__header">
              <h2>Recursos y casos de éxito</h2>
              <p>
                Comparte la landing con tu equipo, descarga guías VeriFactu y
                revisa historias de clientes que ya operan con Isaak.
              </p>
            </div>
            <div className="resources__grid">
              <article className="resource-card">
                <h3>Guía de puesta en marcha</h3>
                <p>
                  Checklist para activar VeriFactu en menos de 1 día.
                </p>
                <a href="/docs/guia-verifactu.pdf">Descargar</a>
              </article>
              <article className="resource-card">
                <h3>Casos de éxito</h3>
                <p>
                  Cómo asesorías y despachos ahorran 8 h/semana con
                  automatización.
                </p>
                <a href="/docs/casos-verifactu.pdf">Ver historias</a>
              </article>
              <article className="resource-card">
                <h3>Integraciones</h3>
                <p>
                  Conecta Drive, OneDrive, Dropbox y Stripe para cobros rápidos.
                </p>
                <a href="/integrations">Explorar integraciones</a>
              </article>
            </div>
          </div>
        </section>

        <section className="section cta">
          <div className="container cta__inner">
            <div>
              <h2>Factura menos. Vive más.</h2>
              <p>
                Isaak IA automatiza tu contabilidad y te devuelve tiempo para lo
                importante.
              </p>
              <div className="cta__actions">
                <a className="btn btn--primary" href="/auth/signup">
                  Probar gratis 30 días
                </a>
                <a className="btn btn--ghost" href="/contact">
                  Solicitar demo
                </a>
              </div>
            </div>
            <div className="cta__badge" aria-hidden="true">
              <p className="cta__label">Cumplimiento AEAT VeriFactu</p>
              <p className="cta__value">100%</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <div>
            <img
              src="/assets/verifactu-logo-animated.svg"
              alt="VeriFactu Business"
              className="footer__logo"
            />
            <p className="footer__tagline">
              Asistente IA Isaak · Cumple la normativa AEAT VeriFactu
            </p>
          </div>
          <div className="footer__links">
            <a href="mailto:soporte@verifactu.business">
              soporte@verifactu.business
            </a>
            <a href="/privacy">Política de Privacidad</a>
            <a href="/terms">Condiciones de Uso</a>
            <a href="/cookies">Cookies</a>
          </div>
        </div>
        <p className="footer__legal">© 2025 Veri*Factu Business</p>
      </footer>

      {leadOpen && (
        <div
          className="lead-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-modal-title"
        >
          <div
            className="lead-modal__overlay"
            onClick={() => setLeadOpen(false)}
          />
          <div className="lead-modal__content">
            <button
              className="lead-modal__close"
              type="button"
              aria-label="Cerrar formulario"
              onClick={() => setLeadOpen(false)}
            >
              ×
            </button>
            <h2 id="lead-modal-title">Conversemos sobre Veri*Factu Business</h2>
            <p className="lead-modal__intro">
              Déjanos tus datos y activaremos el flujo adecuado: acceso a la
              plataforma, demo con Isaak o configuración guiada.
            </p>
            <form
              className="lead-form"
              onSubmit={handleLeadSubmit}
              autoComplete="on"
            >
              <input type="hidden" name="interest" value={leadInterest} />
              <div className="lead-form__grid">
                <label className="lead-form__field">
                  <span>Nombre completo</span>
                  <input
                    type="text"
                    name="name"
                    placeholder="María García"
                    required
                  />
                </label>
                <label className="lead-form__field">
                  <span>Correo electrónico</span>
                  <input
                    type="email"
                    name="email"
                    placeholder="tu @empresa.com"
                    required
                  />
                </label>
              </div>
              <label className="lead-form__field">
                <span>Empresa</span>
                <input
                  type="text"
                  name="company"
                  placeholder="Nombre de tu empresa"
                />
              </label>
              <label className="lead-form__field">
                <span>Cuéntanos qué necesitas</span>
                <textarea
                  name="message"
                  rows={4}
                  placeholder="Quiero automatizar mis facturas y validar con AEAT..."
                />
              </label>
              <div className="lead-form__footer">
                <p className="lead-form__hint">
                  Usaremos estos datos para responder desde{" "}
                  <strong>soporte @verifactu.bisiness</strong>. Puedes solicitar
                  la eliminación en cualquier momento.
                </p>
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={leadSubmitting}
                >
                  {leadSubmitting ? "Enviando..." : "Enviar solicitud"}
                </button>
              </div>
              {leadStatus.message ? (
                <p
                  className={`lead-form__status lead-form__status--${leadStatus.tone}`}
                  role="status"
                  aria-live="polite"
                >
                  {leadStatus.message}
                </p>
              ) : (
                <p
                  className="lead-form__status"
                  role="status"
                  aria-live="polite"
                />
              )}
            </form>
          </div>
        </div>
      )}

      <button
        className="isaak-fab"
        type="button"
        aria-controls="isaak-chat"
        aria-expanded={chatOpen}
        onClick={() => setChatOpen((state) => !state)}
      >
        <span className="isaak-fab__avatar">🤖</span>
        <span className="isaak-fab__label">Habla con Isaak</span>
      </button>

      <section className="isaak-chat" id="isaak-chat" aria-hidden={!chatOpen}>
        <header className="isaak-chat__header">
          <div>
            <span className="isaak-chat__avatar">🤖</span>
            <div>
              <p className="isaak-chat__title">Isaak, tu asistente fiscal</p>
              <p className="isaak-chat__status">Proactivo · Conectado a AEAT</p>
            </div>
          </div>
          <button
            className="isaak-chat__close"
            type="button"
            aria-label="Cerrar chat"
            onClick={() => setChatOpen(false)}
          >
            ×
          </button>
        </header>
        <div className="isaak-chat__proactive" role="log" aria-live="polite">
          {PROACTIVE_MESSAGES.map((text) => (
            <div className="isaak-chat__proactive-bubble" key={text}>
              {text}
            </div>
          ))}
        </div>
        <div className="isaak-chat__messages" role="list">
          {chatMessages.map((message, index) => (
            <div
              key={`${message.from}-${index}-${message.text}`}
              className={`isaak-chat__message ${message.from === "Isaak" ? "from-isaak" : "from-user"} ${
                message.pending ? "is-pending" : ""
              }`}
            >
              <span className="isaak-chat__message-avatar">
                {message.from === "Isaak" ? "🤖" : "🙋"}
              </span>
              <div>
                <p className="isaak-chat__message-label">{message.from}</p>
                <p className="isaak-chat__message-text">{message.text}</p>
              </div>
            </div>
          ))}
        </div>
        <form
          className="isaak-chat__form"
          autoComplete="off"
          onSubmit={handleChatSubmit}
        >
          <label className="sr-only" htmlFor="isaak-input">
            Escribe tu mensaje
          </label>
          <input
            id="isaak-input"
            name="message"
            type="text"
            placeholder="Pregunta a Isaak sobre tu facturación"
            required
          />
          <button type="submit">Enviar</button>
        </form>
      </section>
    </div>
  );
}
