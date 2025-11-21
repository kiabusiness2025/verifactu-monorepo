"use client";

import React, { useMemo, useState } from "react";

type Plan = {
  name: string;
  price: number;
  variablePct: number;
  users: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  highlight?: boolean;
};

const FREE_TRIAL_COPY = "30 días gratis. Sin compromiso ni datos de pago.";

const PRICING_PLANS: Plan[] = [
  {
    name: "Starter",
    price: 9.9,
    variablePct: 0.005,
    users: "1 usuario",
    ctaLabel: "Probar gratis",
    ctaHref: "/auth/signup",
    features: ["Envío AEAT VeriFactu", "Soporte básico", "Isaak IA (básico)", FREE_TRIAL_COPY],
  },
  {
    name: "Professional",
    price: 24.9,
    variablePct: 0.003,
    users: "3 usuarios",
    ctaLabel: "Empezar",
    ctaHref: "/auth/signup",
    features: ["Dashboard avanzado", "Informes automáticos IA", "Integración nubes/correos", FREE_TRIAL_COPY],
    highlight: true,
  },
  {
    name: "Business Plus",
    price: 49.9,
    variablePct: 0.002,
    users: "Hasta 10 usuarios",
    ctaLabel: "Solicitar demo",
    ctaHref: "/demo",
    features: ["Multiempresa", "API avanzada", "Soporte prioritario", FREE_TRIAL_COPY],
  },
  {
    name: "Enterprise",
    price: 0,
    variablePct: 0.001,
    users: "Ilimitado",
    ctaLabel: "Contactar",
    ctaHref: "/contact",
    features: ["Integraciones a medida", "Auditoría fiscal avanzada", "Agente Isaak dedicado", FREE_TRIAL_COPY],
  },
];

function currency(value: number) {
  return value.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export default function PricingCalculator() {
  const [monthlySales, setMonthlySales] = useState(10000);

  const computedPlans = useMemo(
    () =>
      PRICING_PLANS.map((plan) => {
        const variableFee = plan.variablePct * monthlySales;
        const total = (plan.price || 0) + variableFee;
        return { ...plan, variableFee, total };
      }),
    [monthlySales],
  );

  return (
    <section id="pricing" className="pricing-section">
      <div className="section__header">
        <h2>Planes y precios</h2>
        <p>Elige cuota fija y deja que Isaak calcule el % sobre tus ventas.</p>
        <p className="pricing-section__sub-header">
          Todos los planes incluyen 30 días gratis, sin compromiso y sin datos de pago.
        </p>
      </div>

      <div className="pricing-calculator">
        <label htmlFor="vf-sales">Ventas mensuales estimadas</label>
        <input
          id="vf-sales"
          type="number"
          min={0}
          step={100}
          value={monthlySales}
          onChange={(e) => setMonthlySales(Number(e.target.value))}
        />
        <span>€</span>
      </div>

      <div className="pricing-grid">
        {computedPlans.map((plan) => (
          <div key={plan.name} className={`pricing-card ${plan.highlight ? "is-highlight" : ""}`}>
            <div className="pricing-card__header">
              <h3>{plan.name}</h3>
              <span>{plan.users}</span>
            </div>
            <div className="pricing-card__price-details">
              {plan.price > 0 ? (
                <div className="pricing-card__price">
                  {currency(plan.price)} <span>/mes</span>
                </div>
              ) : (
                <div className="pricing-card__price">A medida</div>
              )}
              {plan.variablePct > 0 && (
                <>
                  <div className="pricing-card__fee">
                    Comisión variable: <strong>{(plan.variablePct * 100).toFixed(1)}%</strong> sobre ventas
                  </div>
                  <div className="pricing-card__fee">
                    Estimación variable: <strong>{currency(plan.variableFee)}</strong> / mes
                  </div>
                  <div className="pricing-card__total">
                    Total estimado: <strong>{currency(plan.total)}</strong> / mes
                  </div>
                </>
              )}
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
        * El % se aplica únicamente a ventas facturadas en la app. Cálculo orientativo.
      </p>
    </section>
  );
}