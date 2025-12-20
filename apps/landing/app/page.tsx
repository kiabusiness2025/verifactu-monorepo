"use client";

import PricingCalculator from "./components/PricingCalculator";
import Faq from "./components/Faq";
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

const heroMetrics = [
  { label: "Alta y validación VeriFactu", value: "1 día" },
  { label: "Libros contables actualizados", value: "24/7" },
  { label: "Métricas de negocio", value: "En minutos" },
];

const activationHighlights = [
  {
    title: "Activación inmediata",
    description:
      "Alta, configuración y validación con VeriFactu en menos de 24 h.",
  },
  {
    title: "Gana en eficiencia y seguridad",
    description:
      "Ciclo fiscal y contable automatizado, reducción de errores y duplicidades.",
  },
  {
    title: "Ventaja competitiva",
    description:
      "Información para decidir: facturación, margenes, previsión y pagos en tiempo real.",
  },
];

const platformFeatures = [
  {
    title: "Libros contables siempre listos",
    description:
      "Libros de ingresos, gastos e IVA actualizados automáticamente con cada operación.",
  },
  {
    title: "Contabilidad automática con banca integrada",
    description:
      "Conciliación y registro contable conectado a tus bancos y tarjetas bajo PSD2.",
  },
  {
    title: "Carga masiva de documentos",
    description:
      "Importa facturas y tickets desde Drive y correo con OCR avanzado y clasificación.",
  },
  {
    title: "Estadísticas en tiempo real",
    description:
      "Panel financiero y calendario fiscal con alertas previas a cada obligación.",
  },
];

const steps = [
  {
    title: "Te damos de alta en VeriFactu",
    description:
      "Configuración y documentación completa para que puedas emitir sin fricciones.",
  },
  {
    title: "Conectamos tus sistemas",
    description:
      "Bancos, Drive y email listos para conciliar facturas, gastos y movimientos.",
  },
  {
    title: "Modelos presentados",
    description:
      "Libros contables al día, modelos generados y calendario fiscal con alertas.",
  },
];

const solutions = [
  {
    title: "Tarifa fija para autónomos y pymes",
    badges: ["Soporte y configuración", "Migración VeriFactu", "Asesoría y alta AEAT"],
    accent: "fixed",
    note: "*Todas las modalidades incluyen alta en VeriFactu",
  },
  {
    title: "A medida para gestorías",
    badges: ["Plataforma personalizada", "Accesos por cliente", "Presentación masiva"],
    accent: "custom",
  },
];

const featureColumns = [
  {
    title: "Usabilidad",
    items: [
      "Tableros claros con métricas de negocio relevantes",
      "Seguimiento de márgenes por factura, cliente y cuenta",
      "Alertas y recordatorios preventivos",
    ],
  },
  {
    title: "Integraciones",
    items: [
      "Google Drive y correo para entrada de facturas",
      "Conciliación bancaria bajo PSD2",
      "Integración con sistemas de facturación",
    ],
  },
  {
    title: "Documentos",
    items: [
      "OCR avanzado con clasificación automática",
      "Facturas y tickets de gasto en Drive y mail",
      "Archivados automáticamente en la nube",
    ],
  },
  {
    title: "Preparado para AEAT",
    items: [
      "Conectado con VeriFactu",
      "Libros contables y modelos fiscales",
      "Presentación a la AEAT sin salir del panel",
    ],
  },
];

const deepFeatures = [
  {
    title: "OCR inteligente y conciliación",
    description:
      "Automatiza la entrada de facturas desde Drive y email, clasifícalas y concílialas con tus bancos sin esfuerzo.",
  },
  {
    title: "Asesoramiento real-time",
    description:
      "Análisis de márgenes, previsión de impuestos y alertas de liquidez para decidir con datos fiables.",
  },
  {
    title: "VeriFactu y modelos AEAT",
    description:
      "Emite facturas, lleva los libros oficiales y presenta modelos 303, 130, 111 y SOC sin abandonar la plataforma.",
  },
];

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
        ...prev.filter((msg) => !msg.pending),
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
              src="/assets/verifactu-business-logo.svg"
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
              <a href="#platform" onClick={() => setMobileMenuOpen(false)}>VeriFactu</a>
              <a href="#process" onClick={() => setMobileMenuOpen(false)}>Process</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Planes</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>Características</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            </nav>
          </div>
          <div className={`header__cta ${mobileMenuOpen ? "is-open" : ""}`}>
            {session ? (
              <a className="btn btn--ghost" href="/dashboard">
                Ir al panel
              </a>
            ) : (
              <a className="btn btn--ghost" href="/api/auth/signin">
                Accede
              </a>
            )}
            <a className="btn btn--primary" href="/auth/signup">
              Comenzar gratis
            </a>
          </div>
        </div>
      </header>

      <main>
        <section id="hero" className="hero">
          <div className="hero__background" aria-hidden="true" />
          <div className="container hero__grid">
            <div className="hero__content">
              <p className="hero__badge">Verifactu Business</p>
              <h1>
                La forma más rápida y segura de cumplir con VeriFactu mientras crece tu negocio
              </h1>
              <p className="hero__lead">
                Emite facturas, lleva tus libros y presenta modelos a la AEAT con la misma plataforma. Sin cambios en tu operativa.
              </p>
              <ul className="hero__metrics">
                {heroMetrics.map((metric) => (
                  <li key={metric.label}>
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                  </li>
                ))}
              </ul>
              <ul className="hero__bullets">
                <li>Alta y validación con VeriFactu en 1 día.</li>
                <li>Libros contables actualizados automáticamente.</li>
                <li>Métricas de negocio y previsión de impuestos.</li>
              </ul>
              <div className="hero__actions">
                <a className="btn btn--primary" href="/auth/signup">
                  Comenzar gratis
                </a>
                <a className="btn btn--ghost" href="/contact">
                  Solicitar una demo
                </a>
              </div>
              <p className="hero__microcopy">Sin fricción con AEAT. Sin modificar tus procesos actuales.</p>
            </div>

            <div className="hero__card" aria-label="Formulario de interés">
              <div className="card__header">
                <p className="card__badge">Verifactu Business</p>
                <p className="card__title">El asistente fiscal que no sólo envía.</p>
                <p className="card__subtitle">
                  Gestiona envíos, libros contables y modelos desde un único panel.
                </p>
              </div>
              <form className="card__form">
                <label>
                  <span>Nombre de tu negocio o marca*</span>
                  <input type="text" placeholder="Ej. Bar Botafumeiro" required />
                </label>
                <label>
                  <span>Número de facturas a la semana</span>
                  <select>
                    <option value="">Elige una opción</option>
                    <option value="10">Hasta 10</option>
                    <option value="25">11 - 25</option>
                    <option value="50">26 - 50</option>
                    <option value="100">Más de 50</option>
                  </select>
                </label>
                <label>
                  <span>Provincia</span>
                  <input type="text" placeholder="Ej. Madrid" />
                </label>
                <button type="submit" className="btn btn--primary btn--full">
                  Empezar ahora
                </button>
              </form>
              <p className="card__footer">Nosotros nos encargamos del resto.</p>
            </div>
          </div>
        </section>

        <section className="section highlights">
          <div className="container highlights__grid">
            {activationHighlights.map((item) => (
              <article key={item.title} className="tile">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="platform" className="section platform">
          <div className="container">
            <div className="section__header">
              <h2>Una plataforma creada para liderar la era VeriFactu</h2>
              <p>Todo lo que necesitas para emitir, conciliar y presentar sin salir de un único panel.</p>
            </div>
            <div className="platform__grid">
              {platformFeatures.map((feature) => (
                <article key={feature.title} className="card">
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="process" className="section process">
          <div className="container">
            <div className="section__header">
              <h2>De la emisión al cobro en tres pasos</h2>
              <p>
                VeriFactu listo en 24 h, conciliación bancaria automática y calendarios fiscales con recordatorios.
              </p>
            </div>
            <div className="process__steps">
              {steps.map((step, index) => (
                <article key={step.title} className="step">
                  <span className="step__number">{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="solutions" className="section solutions">
          <div className="container">
            <div className="section__header">
              <h2>Elige la solución que mejor se adapta a tu organización</h2>
              <p>Planes claros para equipos que quieren cumplir y crecer.</p>
            </div>
            <div className="solutions__grid">
              {solutions.map((solution) => (
                <article
                  key={solution.title}
                  className={`solution ${solution.accent === "custom" ? "solution--custom" : ""}`}
                >
                  <p className="solution__eyebrow">Verifactu Business</p>
                  <h3>{solution.title}</h3>
                  <ul>
                    {solution.badges.map((badge) => (
                      <li key={badge}>{badge}</li>
                    ))}
                  </ul>
                  {solution.note && <p className="solution__note">{solution.note}</p>}
                  <a className="btn btn--primary" href="/auth/signup">
                    Comenzar ahora
                  </a>
                </article>
              ))}
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

        <section id="cta" className="cta">
          <div className="container cta__inner">
            <div>
              <h2>Verifactu Business es la manera más rápida y segura de cumplir con VeriFactu</h2>
              <p>Emite facturas, lleva tus libros y presenta modelos con la menor intervención humana.</p>
              <div className="cta__actions">
                <a className="btn btn--primary" href="/auth/signup">
                  Empezar ahora
                </a>
                <a className="btn btn--ghost" href="/contact">
                  Solicitar una demo
                </a>
              </div>
            </div>
            <div className="cta__badge">
              <span className="cta__pill">Verifactu Business</span>
              <strong>Cumplimiento y eficiencia con un menor coste.</strong>
            </div>
          </div>
        </section>

        <section id="features" className="section columns">
          <div className="container columns__grid">
            {featureColumns.map((column) => (
              <article key={column.title} className="column-card">
                <p className="column__eyebrow">verifactu.business</p>
                <h3>{column.title}</h3>
                <ul>
                  {column.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="section deep-features">
          <div className="container deep-features__grid">
            {deepFeatures.map((item) => (
              <article key={item.title} className="deep-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <Faq />
      </main>

      <footer id="contact" className="footer">
        <div className="container footer__inner">
          <div>
            <img
              src="/assets/verifactu-business-logo.svg"
              alt="VeriFactu Business"
              className="footer__logo"
            />
            <p className="footer__tagline">Asistente IA Isaak · Cumple la normativa AEAT VeriFactu</p>
          </div>
          <div className="footer__links">
            <a href="mailto:soporte@verifactu.business">soporte@verifactu.business</a>
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
