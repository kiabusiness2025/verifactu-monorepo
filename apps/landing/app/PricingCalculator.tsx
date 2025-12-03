"use client";

import React from "react";

type Plan = {
  name: string;
  price: number;
  users: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  highlight?: boolean;
  note?: string;
};

const PRICING_PLANS: Plan[] = [
  {
    name: "FREE",
    price: 0,
    users: "1 empresa · 1 usuario",
    ctaLabel: "Crear cuenta",
    ctaHref: "/auth/signup",
    features: [
      "Facturación básica",
      "Subida manual de documentos",
      "Hasta 20 documentos al mes",
      "Chat Isaak limitado",
    ],
    note: "Para probar la plataforma sin compromiso.",
  },
  {
    name: "ESENCIAL",
    price: 29,
    users: "1 empresa · 1 cuenta bancaria",
    ctaLabel: "Empezar ahora",
    ctaHref: "/auth/signup",
    features: [
      "Drive integrado",
      "Facturación Verifactu completa",
      "OCR + gastos automáticos",
      "Integración bancaria (1 cuenta)",
      "Calendario fiscal sincronizado",
      "Resultados e impuestos estimados",
    ],
    note: "29 €/mes o 290 €/año.",
  },
  {
    name: "PROFESIONAL",
    price: 69,
    users: "Multiempresa (2 incluidas)",
    ctaLabel: "Solicitar demo",
    ctaHref: "/contact",
    features: [
      "Varias cuentas bancarias",
      "Conciliación avanzada",
      "Prevalidación de modelos 303/130/111",
      "Libros contables automáticos",
      "Dashboard financiero avanzado",
      "Estimación del Impuesto de Sociedades",
    ],
    highlight: true,
    note: "69 €/mes o 690 €/año.",
  },
  {
    name: "ENTERPRISE",
    price: 149,
    users: "149 €/mes por empresa",
    ctaLabel: "Hablar con ventas",
    ctaHref: "/contact",
    features: [
      "Multiempresa ilimitada",
      "Acceso por certificado digital",
      "Firma electrónica integrada",
      "API privada",
      "Delegaciones electrónicas automáticas",
      "Soporte prioritario",
    ],
    note: "Infraestructura fiscal completa para grupos y franquicias.",
  },
];

function currency(value: number) {
  return value.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export default function PricingCalculator() {
  return (
    <section id="pricing" className="pricing-section">
      <div className="section__header">
        <h2>Planes y precios</h2>
        <p>Infraestructura fiscal-as-a-service con bancos, Drive, Verifactu e Isaak.</p>
        <p className="pricing-section__sub-header">Todos los planes incluyen demo guiada y activación VeriFactu.</p>
      </div>

      <div className="pricing-grid">
        {PRICING_PLANS.map((plan) => (
          <div key={plan.name} className={`pricing-card ${plan.highlight ? "is-highlight" : ""}`}>
            <div className="pricing-card__header">
              <h3>{plan.name}</h3>
              <span>{plan.users}</span>
            </div>
            <div className="pricing-card__price-details">
              <div className="pricing-card__price">
                {plan.price === 0 ? "Gratis" : `${currency(plan.price)} /mes`}
              </div>
              {plan.note && <p className="pricing-card__note">{plan.note}</p>}
            </div>
            <ul className="pricing-card__features">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <a href={plan.ctaHref} className={`btn ${plan.highlight ? "btn--primary" : "btn--dark"}`}>
              {plan.ctaLabel}
            </a>
          </div>
        ))}
      </div>

        <p className="pricing-section__disclaimer">
          * Precios mensuales sin permanencia. Incluye soporte de activación, cumplimiento VeriFactu y actualizaciones.
        </p>
    </section>
  );
}