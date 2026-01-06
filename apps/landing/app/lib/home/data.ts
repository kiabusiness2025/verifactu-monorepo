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
    name: "Gratis",
    priceMonthly: 0,
    priceYearly: 0,
    users: "1 empresa · 1 usuario",
    features: [
      "Facturación básica",
      "Hasta 20 documentos/mes",
      "Chat Isaak limitado",
      "Dashboard esencial",
    ],
    checkoutMonthly: "/api/checkout?plan=free",
    checkoutYearly: "/api/checkout?plan=free",
  },
  {
    name: "Profesional",
    priceMonthly: 29,
    priceYearly: 290,
    users: "1 empresa · usuarios ilimitados",
    features: [
      "Facturación VeriFactu completa",
      "Gastos ilimitados con reconocimiento automático",
      "Integración bancaria (próximamente)",
      "Calendario fiscal",
      "Chat Isaak completo",
      "Informes bajo demanda",
    ],
    highlight: true,
    checkoutMonthly: "/api/checkout?plan=pro-monthly",
    checkoutYearly: "/api/checkout?plan=pro-yearly",
  },
  {
    name: "Business",
    priceMonthly: 69,
    priceYearly: 690,
    users: "Multiempresa (hasta 3)",
    features: [
      "Todo en Profesional",
      "Varias cuentas bancarias (próximamente)",
      "Conciliación avanzada (próximamente)",
      "Libros contables",
      "Dashboard financiero",
      "Soporte prioritario",
    ],
    checkoutMonthly: "/api/checkout?plan=business-monthly",
    checkoutYearly: "/api/checkout?plan=business-yearly",
  },
  {
    name: "Enterprise",
    priceMonthly: null,
    priceYearly: null,
    users: "Multiempresa ilimitada",
    features: [
      "Configuración personalizada",
      "Integración completa con tu sistema",
      "Firma electrónica",
      "Flujos automáticos",
      "SLA garantizado",
      "Equipo dedicado",
    ],
    checkoutMonthly: "/api/checkout?plan=enterprise",
    checkoutYearly: "/api/checkout?plan=enterprise",
  },
];
