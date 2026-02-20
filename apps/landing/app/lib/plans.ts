export type PlanId = "basico" | "pyme" | "empresa" | "pro";

export type PlanInfo = {
  id: PlanId;
  name: string;
  priceEur: number;
  includedInvoices: number;
  audience: string;
  includes: string[];
  hasAccountingIntegration: boolean;
};

export const INCLUDED_BY_PLAN: Record<PlanId, number> = {
  basico: 10,
  pyme: 100,
  empresa: 300,
  pro: 1000,
} as const;

export const PLAN_LIST: PlanInfo[] = [
  {
    id: "basico",
    name: "Básico",
    priceEur: 19,
    includedInvoices: INCLUDED_BY_PLAN.basico,
    audience: "Autónomos y microempresas",
    includes: ["Export AEAT (Excel)", "Isaak", "Emisión y registro"],
    hasAccountingIntegration: false,
  },
  {
    id: "pyme",
    name: "PYME",
    priceEur: 39,
    includedInvoices: INCLUDED_BY_PLAN.pyme,
    audience: "Negocios con más volumen",
    includes: ["Export AEAT (Excel)", "Control diario", "Emisión y registro"],
    hasAccountingIntegration: false,
  },
  {
    id: "empresa",
    name: "Empresa",
    priceEur: 69,
    includedInvoices: INCLUDED_BY_PLAN.empresa,
    audience: "Equipos con asesoría y procesos",
    includes: ["Export AEAT (Excel)", "Control diario", "Emisión y registro"],
    hasAccountingIntegration: true,
  },
  {
    id: "pro",
    name: "Pro",
    priceEur: 99,
    includedInvoices: INCLUDED_BY_PLAN.pro,
    audience: "Operaciones de alto volumen",
    includes: [
      "Export AEAT (Excel)",
      "Control diario",
      "Onboarding y soporte prioritario",
    ],
    hasAccountingIntegration: true,
  },
];

export const EXCESS_TEXT_TITLE =
  "¿Y si necesitas emitir más facturas de las incluidas en tu plan?";

export const EXCESS_TEXT_LINES = [
  "No pasa nada: puedes seguir facturando aunque superes la cantidad incluida.",
  "En tu siguiente factura mensual verás la cuota de tu plan y, además, el importe del exceso de facturas emitidas del mes anterior.",
  "Abajo puedes calcular el importe exacto según las facturas extra que necesites (con descuento por volumen).",
];

export const EXCESS_DISCLAIMER =
  "Calculadora informativa. Esta estimación calcula el exceso. El cargo final se calculará con las facturas emitidas realmente y se reflejará en tu siguiente factura mensual junto con la cuota del plan.";
