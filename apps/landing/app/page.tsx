"use client";

import PricingCalculator from "@/app/components/PricingCalculator";
import Faq from "@/app/components/Faq";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";

type ChatMessage = {
  from: "Isaak" | "Tú";
  text: string;
  pending?: boolean;
};

const PROACTIVE_MESSAGES = [
  "Hola 👋 soy Isaak. ¿Quieres que configuremos tus envíos VeriFactu?",
  "Puedo analizar tus márgenes y detectar ahorros fiscales en minutos.",
  "¿Te guío paso a paso para validar tu siguiente envío a la AEAT?",
];

const ISAAC_API_KEY = process.env.NEXT_PUBLIC_ISAAC_API_KEY;
const ISAAC_ASSISTANT_ID = process.env.NEXT_PUBLIC_ISAAC_ASSISTANT_ID;

export default function Page() {
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    setChatMessages(PROACTIVE_MESSAGES.map((text) => ({ from: "Isaak", text })));
  }, []);

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
              <a href="#value" onClick={() => setMobileMenuOpen(false)}>
                Propuesta
              </a>
              <a href="#key-features" onClick={() => setMobileMenuOpen(false)}>
                Funcionalidades
              </a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>
                Planes
              </a>
              <a href="#services" onClick={() => setMobileMenuOpen(false)}>
                Servicios
              </a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>
                FAQ
              </a>
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
              <p className="hero__eyebrow">LANDING COMPLETA – verifactu.business</p>
              <h1>Gestión fiscal y contable automatizada para tu empresa</h1>
              <h2 className="hero__subtitle">
                La plataforma integral que conecta Verifactu, bancos, Google Drive y un asistente fiscal especializado en normativa española. Todo en un único panel inteligente.
              </h2>
              <p className="hero__description">
                Control financiero en tiempo real, calendario fiscal automático y contabilidad generada por IA.
              </p>
              <div className="hero__actions">
                <a className="btn btn--primary" href="/auth/signup">
                  Crear cuenta gratuita
                </a>
                <a className="btn btn--ghost" href="#key-features">
                  Explorar funcionalidades
                </a>
              </div>
              <p className="hero__microcopy">Sin tarjeta. Configuración inicial en menos de 2 minutos.</p>
              <p className="hero__description">
                IA fiscal que entiende tu negocio, automatiza tus procesos y te prepara para cada obligación tributaria.
              </p>
            </div>

            <div className="hero__mockup" aria-hidden="true">
              <div className="mockup mockup--assistant">
                <header className="mockup__header">
                  <div>
                    <span className="mockup__badge">Isaak</span>
                    <p className="mockup__title">Respuestas inmediatas</p>
                  </div>
                  <span className="mockup__status">Conectado a AEAT</span>
                </header>
                <div className="mockup__body">
                  <article className="mockup__message">
                    <span className="mockup__avatar">🙋</span>
                    <div>
                      <p className="mockup__label">Usuario</p>
                      <p className="mockup__text">
                        “¿Cómo voy este trimestre? Necesito el IVA estimado y si hay riesgos de descuadre.”
                      </p>
                    </div>
                  </article>
                  <article className="mockup__message mockup__message--light">
                    <span className="mockup__avatar">🤖</span>
                    <div>
                      <p className="mockup__label">Isaak</p>
                      <p className="mockup__text">
                        “Ingresos del 2T: 14.980 €. Gastos deducibles: 3.420 €. IVA devengado: 3.145 €. IVA soportado: 718 €. Previsión de cuota: 2.427 €. No detecto inconsistencias.”
                      </p>
                    </div>
                  </article>
                  <article className="mockup__message">
                    <span className="mockup__avatar">🙋</span>
                    <div>
                      <p className="mockup__label">Usuario</p>
                      <p className="mockup__text">
                        “Subo estas 12 facturas de gasto. Clasifícalas y cuéntame si alguna no es deducible.”
                      </p>
                    </div>
                  </article>
                  <article className="mockup__message mockup__message--light">
                    <span className="mockup__avatar">🤖</span>
                    <div>
                      <p className="mockup__label">Isaak</p>
                      <p className="mockup__text">
                        “11 facturas clasificadas correctamente. 1 factura no deducible: servicio de entretenimiento. Todo se ha registrado en tu libro de gastos.”
                      </p>
                    </div>
                  </article>
                  <article className="mockup__message">
                    <span className="mockup__avatar">🙋</span>
                    <div>
                      <p className="mockup__label">Usuario</p>
                      <p className="mockup__text">
                        “Concíliame los movimientos bancarios de esta semana y dime si queda algo pendiente de cobrar.”
                      </p>
                    </div>
                  </article>
                  <article className="mockup__message mockup__message--light">
                    <span className="mockup__avatar">🤖</span>
                    <div>
                      <p className="mockup__label">Isaak</p>
                      <p className="mockup__text">
                        “8 movimientos conciliados con tus facturas. 1 transferencia de 412 € pendiente de asociar. 2 facturas emitidas siguen sin cobro.”
                      </p>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="value" className="section features">
          <div className="container">
            <div className="section__header">
              <h2>Centraliza toda la gestión fiscal y contable en un único sistema</h2>
              <p>
                Verifactu, bancos, gastos, documentos, calendario fiscal e inteligencia artificial especializada en España. Una infraestructura empresarial diseñada para maximizar control, eficiencia y seguridad.
              </p>
            </div>
            <div className="features__grid">
              <article className="feature-card">
                <h3>Beneficios clave</h3>
                <ul>
                  <li>Automatización completa del ciclo fiscal y contable.</li>
                  <li>Libros oficiales actualizados de forma continua.</li>
                  <li>Eliminación de errores y duplicidades.</li>
                  <li>Visión financiera 360º en tiempo real.</li>
                  <li>Preparación automatizada de los modelos 303, 130, 111 e Impuesto de Sociedades.</li>
                  <li>Cumplimiento nativo con Verifactu.</li>
                </ul>
              </article>
              <article className="feature-card">
                <h3>Core tecnológico</h3>
                <ul>
                  <li>Next.js (UI + API) sobre Cloud Run y Cloud SQL.</li>
                  <li>Integraciones Drive, PSD2, Verifactu y Google Calendar.</li>
                  <li>Isaak como asistente fiscal orquestado con datos en vivo.</li>
                  <li>Roles multiempresa y acceso con identidad digital.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section id="key-features" className="section features">
          <div className="container">
            <div className="section__header">
              <h2>Funcionalidades clave</h2>
              <p>Automatización VeriFactu, OCR, banca, contabilidad e IA fiscal en el mismo panel.</p>
            </div>
            <div className="features__grid">
              <article className="feature-card">
                <h3>Facturación Verifactu</h3>
                <ul>
                  <li>Emisión certificada y registro automático.</li>
                  <li>Control de cobros y vencimientos.</li>
                  <li>Envío profesional a clientes.</li>
                </ul>
              </article>
              <article className="feature-card">
                <h3>Gastos y OCR avanzado</h3>
                <ul>
                  <li>Integración con Google Drive.</li>
                  <li>OCR inteligente y clasificación automática.</li>
                  <li>Registro contable inmediato.</li>
                </ul>
              </article>
              <article className="feature-card">
                <h3>Integración bancaria (PSD2)</h3>
                <ul>
                  <li>Conexión segura con entidades españolas.</li>
                  <li>Importación automática de movimientos.</li>
                  <li>Conciliación con facturas y gastos.</li>
                  <li>Alertas financieras y de liquidez.</li>
                </ul>
              </article>
              <article className="feature-card">
                <h3>Contabilidad automática</h3>
                <ul>
                  <li>Libros diario, mayor e IVA.</li>
                  <li>Conciliación completa.</li>
                  <li>Resultados del periodo en tiempo real.</li>
                  <li>Proyección de cierre anual.</li>
                </ul>
              </article>
              <article className="feature-card">
                <h3>Asistente fiscal “Isaak”</h3>
                <p>Asesoramiento guiado, análisis documental, explicaciones normativas, cálculos automáticos y soporte integral.</p>
              </article>
              <article className="feature-card">
                <h3>Calendario fiscal inteligente</h3>
                <ul>
                  <li>Generación automática de obligaciones.</li>
                  <li>Sincronización con Google Calendar.</li>
                  <li>Recordatorios previos a cada presentación.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section id="audience" className="section features">
          <div className="container">
            <div className="section__header">
              <h2>¿Para quién es?</h2>
              <p>Experiencia adaptada a autónomos, pymes y gestorías con operativa multiempresa.</p>
            </div>
            <div className="features__grid">
              <article className="feature-card">
                <h3>Autónomos</h3>
                <p>Gestión simple, automática y sin fricciones.</p>
              </article>
              <article className="feature-card">
                <h3>Pymes</h3>
                <p>Control completo de facturación, bancos, impuestos y documentación.</p>
              </article>
              <article className="feature-card">
                <h3>Gestorías y despachos</h3>
                <p>Operativa multiempresa con automatización contable y fiscal de alto nivel.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="pricing" className="section">
          <PricingCalculator />
          <div className="pricing-section__cta">
            <a className="btn btn--ghost" href="/contact">
              Comparar planes
            </a>
          </div>
        </section>

        <section id="services" className="section features">
          <div className="container">
            <div className="section__header">
              <h2>Servicios adicionales on-demand</h2>
              <p>Contratación directa desde la aplicación sin abandonar el panel.</p>
            </div>
            <div className="features__grid">
              <article className="feature-card">
                <ul>
                  <li>Tramitación de certificados digitales.</li>
                  <li>Constitución de sociedades.</li>
                  <li>Servicios notariales online (más de 100 trámites).</li>
                  <li>Modificaciones estatutarias.</li>
                  <li>Altas de autónomos y cambios censales.</li>
                  <li>Presentación de modelos especiales.</li>
                  <li>Revisión documental y legalización.</li>
                  <li>Representación ante AEAT y Seguridad Social.</li>
                </ul>
                <a className="btn btn--dark" href="/contact">Ver catálogo completo</a>
              </article>
            </div>
          </div>
        </section>

        <section id="security" className="section features">
          <div className="container">
            <div className="section__header">
              <h2>Seguridad</h2>
              <p>Infraestructura diseñada para la normativa española.</p>
            </div>
            <div className="features__grid">
              <article className="feature-card">
                <ul>
                  <li>Cumplimiento Verifactu nativo.</li>
                  <li>Integración con bancos bajo PSD2.</li>
                  <li>Tokens cifrados y comunicaciones seguras.</li>
                  <li>Acceso con certificado digital en planes superiores.</li>
                  <li>Infraestructura desplegada en Google Cloud.</li>
                  <li>Control de accesos multiempresa.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <Faq />

        <section className="section cta">
          <div className="container cta__inner">
            <div>
              <h2>Optimiza tu gestión fiscal y contable hoy mismo</h2>
              <p>
                Automatiza procesos, elimina errores y accede a una visión financiera completa.
              </p>
              <div className="cta__actions">
                <a className="btn btn--primary" href="/auth/signup">
                  Crear cuenta gratuita
                </a>
                <a className="btn btn--ghost" href="/contact">
                  Solicitar demostración
                </a>
              </div>
            </div>
            <div className="cta__badge" aria-hidden="true">
              <p className="cta__label">Infraestructura fiscal-as-a-service</p>
              <p className="cta__value">verifactu.business</p>
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
