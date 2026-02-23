import type { IsaakMsg, Plan } from "./types";

export const ISAAK_MESSAGES: IsaakMsg[] = [
  {
    type: "ok",
    title: "Estado del negocio",
    body: "Esta semana tu beneficio va +8%. ¿Quieres ver qué clientes lo están impulsando?",
  },
  {
    type: "ok",
    title: "Gasto deducible",
    body: "He detectado un gasto de combustible. Para tu actividad, es deducible. Ya está registrado.",
  },
  {
    type: "warn",
    title: "Gasto a revisar",
    body: "Este ticket parece 'comida'. Para tu actividad puede requerir justificación. ¿Lo marcamos como 'a revisar'?",
  },
  {
    type: "ok",
    title: "Factura emitida",
    body: "Factura VF-2031 creada y validada. ¿La envío al cliente o la programo para mañana?",
  },
  {
    type: "ok",
    title: "Informe a un clic",
    body: "¿Te preparo un resumen mensual con ventas, gastos y beneficio en PDF o Excel?",
  },
];

export const PRICING_PLANS: Plan[] = [
  {
    name: "Básico",
    priceMonthly: 19,
    priceYearly: 190,
    users: "Autónomos y microempresas",
    features: [
      "Hasta 10 facturas/mes incluidas",
      "Export AEAT (Excel)",
      "Emisión y registro",
      "Isaak",
    ],
    checkoutMonthly: "/#planes",
    checkoutYearly: "/#planes",
  },
  {
    name: "PYME",
    priceMonthly: 39,
    priceYearly: 390,
    users: "Negocios con más volumen",
    features: [
      "Hasta 100 facturas/mes incluidas",
      "Export AEAT (Excel)",
      "Control diario",
      "Emisión y registro",
    ],
    highlight: true,
    checkoutMonthly: "/#planes",
    checkoutYearly: "/#planes",
  },
  {
    name: "Empresa",
    priceMonthly: 69,
    priceYearly: 690,
    users: "Equipos con asesoría y procesos",
    features: [
      "Hasta 300 facturas/mes incluidas",
      "Export AEAT (Excel)",
      "Control diario",
      "Integración contable (si tiene API)",
    ],
    checkoutMonthly: "/#planes",
    checkoutYearly: "/#planes",
  },
  {
    name: "Pro",
    priceMonthly: 99,
    priceYearly: 990,
    users: "Operaciones de alto volumen",
    features: [
      "Hasta 1.000 facturas/mes incluidas",
      "Export AEAT (Excel)",
      "Control diario",
      "Onboarding y soporte prioritario",
    ],
    checkoutMonthly: "/#planes",
    checkoutYearly: "/#planes",
  },
];
