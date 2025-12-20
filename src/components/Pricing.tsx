"use client";

import { useMemo, useState } from "react";

type Plan = {
  name: string;
  price: number;
  variablePct: number;
  users: string;
  ctaLabel: string;
  ctaHref: string;
  features: string[];
  highlight?: boolean;
};

function eur(n: number) {
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export function Pricing() {
  const [sales, setSales] = useState(10000);

  const plans = useMemo<Plan[]>(
    () => [
      {
        name: "Starter",
        price: 9.9,
        variablePct: 0.005,
        users: "1 usuario",
        ctaLabel: "Probar gratis",
        ctaHref: "/app/signup",
        features: ["Envío AEAT VeriFactu", "Soporte básico", "Isaak IA (básico)", "30 días gratis. Sin compromiso ni datos de pago."],
      },
      {
        name: "Professional",
        price: 24.9,
        variablePct: 0.003,
        users: "3 usuarios",
        ctaLabel: "Empezar",
        ctaHref: "/app/signup",
        features: ["Dashboard avanzado", "Informes automáticos IA", "Integración nubes/correos", "30 días gratis. Sin compromiso ni datos de pago."],
        highlight: true,
      },
      {
        name: "Business Plus",
        price: 49.9,
        variablePct: 0.002,
        users: "Hasta 10 usuarios",
        ctaLabel: "Solicitar demo",
        ctaHref: "/demo",
        features: ["Multiempresa", "API avanzada", "Soporte prioritario", "30 días gratis. Sin compromiso ni datos de pago."],
      },
      {
        name: "Enterprise",
        price: 0,
        variablePct: 0.001,
        users: "Ilimitado",
        ctaLabel: "Contactar",
        ctaHref: "/contact",
        features: ["Integraciones a medida", "Auditoría fiscal avanzada", "Agente Isaak dedicado", "30 días gratis. Sin compromiso ni datos de pago."],
      },
    ],
    [],
  );

  return (
    <section id="pricing" className="section">
      <div className="container">
        <div className="pricing__header">
          <h2>Planes y precios</h2>
          <p>Elige cuota fija y deja que Isaak calcule el % sobre tus ventas.</p>
          <p className="pricing__sub">Todos los planes incluyen 30 días gratis, sin compromiso y sin datos de pago.</p>
        </div>

        <div className="pricing__control">
          <label htmlFor="vf-sales">Ventas mensuales estimadas</label>
          <div className="pricing__control-right">
            <input
              id="vf-sales"
              type="number"
              min={0}
              step={100}
              value={sales}
              onChange={(e) => setSales(Math.max(0, Number(e.target.value) || 0))}
            />
            <span>€</span>
          </div>
        </div>

        <div className="pricing__grid">
          {plans.map((p) => {
            const variableFee = p.variablePct * sales;
            const total = (p.price || 0) + variableFee;

            return (
              <div key={p.name} className{"pricing-card" + (p.highlight ? " pricing-card--highlight" : "")}>
                <div className="pricing-card__top">
                  <h3>{p.name}</h3>
                  <span>{p.users}</span>
                </div>

                <div className="pricing-card__price">
                  <div className="price">
                    {p.price > 0 ? (
                      <>
                        {eur(p.price)} <small>/mes</small>
                      </>
                    ) : (
                      "A medida"
                    )}
                  </div>
                  <div className="line">
                    Comisión variable: <b>{(p.variablePct * 100).toFixed(1)}%</b> sobre ventas
                  </div>
                  <div className="line">
                    Estimación variable: <b>{eur(variableFee)}</b> / mes
                  </div>
                  <div className="line total">
                    Total estimado: <b>{eur(total)}</b> / mes
                  </div>
                </div>

                <ul className="pricing-card__list">
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>

                <a className="pricing-card__cta" href={p.ctaHref}>
                  {p.ctaLabel}
                </a>
              </div>
            );
          })}
        </div>

        <div className="pricing__note">* El % se aplica únicamente a ventas facturadas en la app. Cálculo orientativo.</div>
      </div>
    </section>
  );
}