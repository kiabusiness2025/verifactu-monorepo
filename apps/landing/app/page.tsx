"use client";

import React, { useEffect, useState } from "react";
import PricingCalculator from "./components/PricingCalculator";
import Faq from "./components/Faq";

export default function Page() {
  const ISAAC_MESSAGES = [
    {
      type: "info",
      text:
        "Hoy tus ingresos van un 18% por encima del mes anterior. ¿Quieres ver el detalle por cliente o por servicio?",
    },
    {
      type: "success",
      text:
        "Todas las facturas emitidas hoy cumplen con VeriFactu y han sido validadas correctamente.",
    },
    {
      type: "action",
      text:
        "He registrado 3 gastos nuevos desde documentos subidos a Drive. Impacto estimado en el beneficio: –420 €.",
    },
    {
      type: "warning",
      text: "En 5 días vence un plazo fiscal. ¿Quieres que lo preparemos con antelación?",
    },
    {
      type: "insight",
      text: "Si mantienes este ritmo, tu beneficio mensual estimado será de 12.400 €.",
    },
  ];

  const [index, setIndex] = useState(0);
  const visibleCount = 3;
  const rolling = Array.from({ length: visibleCount }, (_, i) => ISAAC_MESSAGES[(index + i) % ISAAC_MESSAGES.length]);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % ISAAC_MESSAGES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="page">
      <header className="header">
        <div className="container header__inner">
          <a className="brand" href="/" aria-label="Inicio">
            <img
              className="brand__image"
              src="/verifactu.business%20logo.png"
              alt="Verifactu Business"
            />
          </a>
          <nav className="nav" aria-label="Principal">
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#dashboard">Dashboard</a>
            <a href="#pricing">Precios</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="header__cta">
            <a className="btn btn--ghost" href="mailto:hello@verifactu.business">Solicitar demo</a>
            <a className="btn btn--primary" href="#pricing">Empezar 30 días gratis</a>
          </div>
        </div>
      </header>

      <main>
        <section id="hero" className="hero">
          <div className="container hero__inner">
            <div className="hero__content">
              <p className="hero__badge">Verifactu Business</p>
              <h1 className="hero__title">Automatiza tu facturación hoy, entiende tu negocio mejor mañana.</h1>
              <p className="hero__lead">
                Empieza simple: emite y valida facturas cumpliendo VeriFactu. Añade OCR para gastos y visualiza <strong>ventas – gastos = beneficio</strong> sin contabilidad compleja.
              </p>
              <ul className="hero__bullets">
                <li>Sin tarjeta</li>
                <li>Cumplimiento VeriFactu</li>
                <li>Cancelación libre</li>
              </ul>
              <div className="hero__actions">
                <a className="btn btn--primary" href="#pricing">Probar gratis</a>
                <a className="btn btn--ghost" href="mailto:hello@verifactu.business">Solicitar demo</a>
              </div>
            </div>

            <aside className="isaak-panel" aria-label="Mensajes de Isaak">
              <div className="isaak-panel__header">
                <span className="isaak-panel__avatar" aria-hidden="true">🤖</span>
                <div>
                  <p className="isaak-panel__title">Isaak</p>
                  <p className="isaak-panel__subtitle">Asistente de facturación y control financiero</p>
                </div>
              </div>
              <div className="isaak-panel__messages">
                {rolling.map((m, i) => (
                  <div key={`${m.type}-${i}`} className={`isaak-msg isaak-msg--${m.type}`}>
                    <span className="isaak-msg__icon" aria-hidden="true">
                      {m.type === "success" && "✔️"}
                      {m.type === "warning" && "⚠️"}
                      {m.type === "insight" && "📈"}
                      {m.type === "action" && "📄"}
                      {m.type === "info" && "ℹ️"}
                    </span>
                    <p className="isaak-msg__text">{m.text}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="section social-proof">
          <div className="container">
            <div className="social-proof__grid">
              <div className="kpi"><span className="kpi__value">+40%</span><span className="kpi__label">productividad</span></div>
              <div className="kpi"><span className="kpi__value">100%</span><span className="kpi__label">VeriFactu</span></div>
              <div className="kpi"><span className="kpi__value">24/7</span><span className="kpi__label">asistencia con Isaak</span></div>
            </div>
          </div>
        </section>

        <section id="problema" className="section problem">
          <div className="container">
            <div className="section__header">
              <h2>Qué problema resolvemos</h2>
              <p>Caos de facturas, gastos desordenados y poca visibilidad del beneficio. Isaak lo orquesta de forma responsable.</p>
            </div>
            <div className="cards3">
              <div className="card"><h3>Facturas</h3><p>Emite y valida cumpliendo VeriFactu. Sin fricción.</p></div>
              <div className="card"><h3>Gastos</h3><p>Sube tickets y facturas. OCR para clasificación automática.</p></div>
              <div className="card"><h3>Beneficio</h3><p>Ventas – gastos = beneficio. Visión clara, sin “contabilidad” compleja.</p></div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="section process">
          <div className="container">
            <div className="section__header">
              <h2>Cómo funciona</h2>
              <p>3 pasos sencillos para empezar hoy. Diseñado para crecer.</p>
            </div>
            <ol className="steps">
              <li className="step"><div className="step__index">1</div><div className="step__content"><h3>Emite y valida facturas</h3><p>Cumplimiento VeriFactu desde el primer día.</p></div></li>
              <li className="step"><div className="step__index">2</div><div className="step__content"><h3>Registra gastos (OCR)</h3><p>Clasificación automática con documentos subidos.</p></div></li>
              <li className="step"><div className="step__index">3</div><div className="step__content"><h3>Visualiza ventas – gastos = beneficio</h3><p>Información útil, sin contabilidad compleja.</p></div></li>
            </ol>
          </div>
        </section>

        <section id="dashboard" className="section dashboard">
          <div className="container">
            <div className="section__header">
              <h2>Dashboard inteligente</h2>
              <p>Ves ventas, gastos y beneficio. Isaak se encarga del resto: preparar informes cuando los necesites.</p>
            </div>
            <div className="cards3">
              <div className="card"><h3>Ventas</h3><p>Resumen claro por periodo.</p></div>
              <div className="card"><h3>Gastos</h3><p>Clasificados automáticamente.</p></div>
              <div className="card"><h3>Beneficio</h3><p>Tu margen sin complicaciones.</p></div>
            </div>
          </div>
        </section>

        <section id="pricing" className="section">
          <div className="container">
            <div className="section__header">
              <h2>Planes y precios</h2>
              <p>Empieza gratis. Decide después. Prueba de 30 días en todos los planes.</p>
            </div>
            <PricingCalculator />
          </div>
        </section>

        <section id="roadmap" className="section roadmap">
          <div className="container">
            <div className="section__header">
              <h2>Diseñado para crecer contigo</h2>
              <p>Funcionalidades en evolución, previstas y en próximas fases. Sin prometer de más.</p>
            </div>
            <div className="cards3">
              <div className="card"><h3>Contabilidad completa</h3><p>Previsto.</p></div>
              <div className="card"><h3>Declaraciones</h3><p>En próximas fases.</p></div>
              <div className="card"><h3>Integración bancaria</h3><p>Próximamente.</p></div>
            </div>
          </div>
        </section>

        <section id="recursos" className="section resources">
          <div className="container">
            <div className="section__header">
              <h2>Recursos y confianza</h2>
              <p>Guías, onboarding con Isaak y checklist de cumplimiento para acompañarte.</p>
            </div>
            <Faq />
          </div>
        </section>

        <section id="cta-final" className="section final-cta">
          <div className="container final-cta__inner">
            <h2>Factura menos. Entiende más. Vive mejor.</h2>
            <div className="final-cta__actions">
              <a className="btn btn--primary" href="#pricing">Registrarse</a>
              <a className="btn btn--ghost" href="mailto:hello@verifactu.business">Solicitar demo</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <p>© {new Date().getFullYear()} Verifactu Business</p>
          <nav className="footer__nav">
            <a href="#faq">FAQ</a>
            <a href="#pricing">Precios</a>
            <a href="mailto:hello@verifactu.business">Contacto</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

