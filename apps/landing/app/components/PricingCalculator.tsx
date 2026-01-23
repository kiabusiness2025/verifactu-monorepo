"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

type Plan = {
  name: string;
  price: number | null;
  period: string;
  users: string;
  features: string[];
  highlight?: boolean;
};

const PRICING_PLANS: Plan[] = [
  {
    name: "Gratis",
    price: 0,
    period: "Siempre",
    users: "1 empresa - 1 usuario",
    features: [
      "Facturacion basica",
      "Hasta 20 documentos/mes",
      "Chat Isaak limitado",
      "Dashboard esencial",
    ],
  },
  {
    name: "Profesional",
    price: 29,
    period: "/mes o 290 EUR/año",
    users: "1 empresa - usuarios ilimitados",
    features: [
      "Facturacion VeriFactu completa",
      "Gastos ilimitados con reconocimiento automatico",
      "Integracion bancaria",
      "Calendario fiscal",
      "Chat Isaak completo",
      "Informes bajo demanda",
    ],
    highlight: true,
  },
  {
    name: "Business",
    price: 69,
    period: "/mes o 690 EUR/año",
    users: "Multiempresa (hasta 3)",
    features: [
      "Todo en Profesional",
      "Varias cuentas bancarias",
      "Conciliacion avanzada",
      "Libros contables",
      "Dashboard financiero",
      "Soporte prioritario",
    ],
  },
  {
    name: "Enterprise",
    price: null,
    period: "A medida",
    users: "Multiempresa ilimitada",
    features: [
      "Configuracion personalizada",
      "Integracion completa con tu sistema",
      "Firma electrónica",
      "Flujos automaticos",
      "SLA garantizado",
      "Equipo dedicado",
    ],
  },
];

function PriceDisplay({ price, period }: { price: number | null; period: string }) {
  if (price === null) {
    return (
      <div>
        <div className="text-2xl font-bold text-slate-900">Personalizado</div>
        <div className="text-sm text-slate-500">{period}</div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-4xl font-bold text-slate-900">
        {price === 0 ? "Gratis" : `EUR ${price}`}
      </div>
      <div className="text-sm text-slate-500">{period}</div>
    </div>
  );
}

export default function PricingCalculator() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
            Empieza gratis. Paga solo cuando tu negocio crece.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            <strong>Todos los planes incluyen:</strong> Acceso permanente a tus datos - Prueba gratuita de 30 dias -
            Posibilidad de cambiar o pausar sin perder información
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PRICING_PLANS.map((plan, idx) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className={[
                "relative flex flex-col rounded-2xl border p-6 shadow-sm transition",
                plan.highlight
                  ? "border-blue-200 bg-white ring-2 ring-blue-100"
                  : "border-slate-200 bg-white hover:shadow-md",
              ].join(" ")}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-[#2361d8] px-3 py-1 text-xs font-semibold text-white">
                    Mas popular
                  </span>
                </div>
              )}

              <div>
                <div className="text-lg font-semibold text-slate-900">{plan.name}</div>
                <div className="mt-1 text-sm text-slate-500">{plan.users}</div>
              </div>

              <div className="mt-4">
                <PriceDisplay price={plan.price} period={plan.period} />
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-sm text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={[
                  "mt-6 w-full rounded-full px-4 py-2.5 text-sm font-semibold shadow-md transition",
                  plan.highlight
                    ? "bg-[#2361d8] text-white hover:bg-[#1f55c0]"
                    : "border border-[#2361d8] bg-white text-[#2361d8] hover:bg-[#2361d8]/10",
                ].join(" ")}
              >
                {plan.price === null ? "Contactar" : "Comenzar"}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-slate-500">
          Todos los planes incluyen activacion VeriFactu y soporte de onboarding.
        </div>
      </div>
    </section>
  );
}


