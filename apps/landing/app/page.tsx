"use client";

import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();

  return (
    <div className="page">
      <header className="header">
        <div className="container header__inner">
          <a href="#hero" className="brand" aria-label="Volver al inicio">
            <img
              src="/assets/verifactu-business-logo.svg"
              alt="VeriFactu Business"
              className="brand__image"
            />
          </a>
          <nav className="nav">
            <a href="#platform">VeriFactu</a>
            <a href="#process">Process</a>
            <a href="#solutions">Planes</a>
            <a href="#features">Características</a>
            <a href="#contact">Contacto</a>
          </nav>
          <div className="header__cta">
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
    </div>
  );
}
