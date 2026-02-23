"use client";

import Link from "next/link";
import React from "react";
import { Check } from "lucide-react";
import { PLAN_LIST } from "../lib/plans";

export default function PricingCalculator() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
            Planes y uso con una sola lógica de precio
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            La cuota mensual combina plan base y uso. Puedes revisar el detalle completo en la
            política de precios y estimarlo con la calculadora del sitio.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLAN_LIST.map((plan) => (
            <article
              key={plan.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div>
                <div className="text-lg font-semibold text-slate-900">{plan.name}</div>
                <div className="mt-1 text-sm text-slate-500">{plan.audience}</div>
              </div>

              <div className="mt-4">
                <div className="text-4xl font-bold text-slate-900">{plan.priceEur} EUR</div>
                <div className="text-sm text-slate-500">/mes</div>
              </div>

              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <span className="text-sm text-slate-600">Hasta {plan.includedInvoices} facturas/mes</span>
                </li>
                {plan.includes.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span className="text-sm text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/politica-de-precios"
            className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
          >
            Ver política de precios
          </Link>
        </div>
      </div>
    </section>
  );
}
