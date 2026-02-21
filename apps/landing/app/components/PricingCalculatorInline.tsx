"use client";

import { useMemo, useState } from "react";
import {
  EXCESS_DISCLAIMER,
  INCLUDED_BY_PLAN,
  PLAN_LIST,
  type PlanId,
} from "../lib/plans";

const TIERS = [
  { upto: 25, price: 0.5 },
  { upto: 100, price: 0.35 },
  { upto: 500, price: 0.2 },
  { upto: null, price: 0.12 },
] as const;

function calcOverageAmount(excess: number) {
  let remaining = Math.max(0, Math.floor(excess));
  let prevCap = 0;
  let amount = 0;
  const breakdown: Array<{
    from: number;
    to: number | null;
    units: number;
    unitPrice: number;
    subtotal: number;
  }> = [];

  for (const tier of TIERS) {
    if (remaining <= 0) break;

    const cap = tier.upto ?? Infinity;
    const tierSize = cap === Infinity ? remaining : cap - prevCap;
    const units = Math.min(remaining, tierSize);

    const subtotal = units * tier.price;
    amount += subtotal;

    breakdown.push({
      from: prevCap + 1,
      to: cap === Infinity ? null : prevCap + units,
      units,
      unitPrice: tier.price,
      subtotal: Math.round(subtotal * 100) / 100,
    });

    remaining -= units;
    if (cap !== Infinity) prevCap = cap;
  }

  amount = Math.round(amount * 100) / 100;
  return { amount, breakdown };
}

export default function PricingCalculatorInline({ showBreakdown = true }: { showBreakdown?: boolean }) {
  const [plan, setPlan] = useState<PlanId>("basico");
  const [issuedInvoices, setIssuedInvoices] = useState<number>(10);
  const included = INCLUDED_BY_PLAN[plan];
  const excess = Math.max(0, Math.floor(issuedInvoices) - included);
  const result = useMemo(() => calcOverageAmount(excess), [excess]);
  const planPrice = PLAN_LIST.find((item) => item.id === plan)?.priceEur ?? 0;
  const subtotal = Math.round((planPrice + result.amount) * 100) / 100;
  const iva = Math.round(subtotal * 0.21 * 100) / 100;
  const total = Math.round((subtotal + iva) * 100) / 100;

  const fmtCurrency = (value: number) =>
    value.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const planName = PLAN_LIST.find((item) => item.id === plan)?.name ?? "Básico";

  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-semibold text-[#011c67]">Calcula tu precio</h3>
          <p className="mt-2 text-sm text-slate-600">
            Estima tu cuota mensual final con plan, exceso e IVA.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Plan</span>
            <select
              value={plan}
              onChange={(event) => setPlan(event.target.value as PlanId)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#2361d8] focus:outline-none"
            >
              {PLAN_LIST.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Facturas emitidas (mes)</span>
            <input
              type="number"
              min={0}
              max={100000}
              step={1}
              value={issuedInvoices}
              onChange={(event) => setIssuedInvoices(Number(event.target.value) || 0)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#2361d8] focus:outline-none"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cuota del plan
            </div>
            <div className="mt-2 text-2xl font-bold text-[#011c67]">{fmtCurrency(planPrice)} EUR</div>
            <div className="mt-1 text-xs text-slate-500">{planName}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Incluidas / Exceso
            </div>
            <div className="mt-2 text-2xl font-bold text-[#011c67]">
              {included} / {excess}
            </div>
            <div className="mt-1 text-xs text-slate-500">Facturas plan / facturas extra</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-[#2361d8]/10 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Importe estimado exceso
            </div>
            <div className="mt-2 text-2xl font-bold text-[#2361d8]">
              {fmtCurrency(result.amount)} EUR
            </div>
            <div className="mt-1 text-xs text-slate-500">Se factura al mes siguiente</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-[#011c67]">Resumen de cuota mensual estimada</h4>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>Cuota plan ({planName})</span>
              <span className="font-semibold">{fmtCurrency(planPrice)} EUR</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Exceso estimado</span>
              <span className="font-semibold">{fmtCurrency(result.amount)} EUR</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Subtotal sin IVA</span>
              <span className="font-semibold">{fmtCurrency(subtotal)} EUR</span>
            </div>
            <div className="flex items-center justify-between">
              <span>IVA (21%)</span>
              <span className="font-semibold">{fmtCurrency(iva)} EUR</span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-[#2361d8]/10 px-3 py-2 text-[#011c67]">
              <span className="font-semibold">Total mensual estimado</span>
              <span className="text-lg font-bold">{fmtCurrency(total)} EUR</span>
            </div>
          </div>
        </div>

        {showBreakdown && result.breakdown.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-[#011c67]">Desglose por tramos</h4>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {result.breakdown.map((line) => (
                <div
                  key={`${line.from}-${line.to ?? "plus"}`}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                >
                  <span>
                    {line.to ? `${line.from}-${line.to}` : `${line.from}+`} ({line.units} uds x{" "}
                    {fmtCurrency(line.unitPrice)} EUR)
                  </span>
                  <span className="font-semibold">{fmtCurrency(line.subtotal)} EUR</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          {EXCESS_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
