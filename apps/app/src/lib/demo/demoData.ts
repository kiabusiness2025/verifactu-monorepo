type DemoTenant = {
  id: string;
  name: string;
  nif: string;
  legalName: string;
  createdAt: string;
};

export type DemoInvoice = {
  id: string;
  number: string;
  issueDate: string;
  customerName: string;
  customerNif?: string;
  amountNet: number;
  amountTax: number;
  amountGross: number;
  status: "paid" | "pending" | "overdue" | "sent";
  verifactuStatus?: string | null;
  verifactuQr?: string | null;
  verifactuHash?: string | null;
};

export type DemoPayment = {
  id: string;
  invoiceId: string;
  amount: number;
  method: "bank_transfer";
  reference: string;
  paidAt: string;
};

export type DemoCustomer = {
  id: string;
  name: string;
  nif: string;
  email?: string;
};

export type DemoBankMovement = {
  id: string;
  date: string;
  concept: string;
  amount: number;
  reconciled: boolean;
};

export type DemoDocument = {
  id: string;
  type: "AEAT" | "SS" | "Contrato" | "Factura" | "Otro";
  date: string;
  name: string;
  status: "valid" | "pending" | "archived";
  statusLabel: string;
};

export type DemoCalendarItem = {
  id: string;
  date: string;
  title: string;
  description: string;
  status: "soon" | "due" | "ok";
  statusLabel: string;
};

export type DemoIsaakExample = {
  prompt: string;
  answer: string;
};

export type DemoIsaakCard = {
  id: string;
  title: string;
  badge: string;
  tone: "info" | "ok" | "warn";
  message: string;
  response: string;
  footer: string;
};

type DemoKpis = {
  revenueMonth: number;
  expensesMonth: number;
  profitMonth: number;
  vatEstimated: number;
  invoicesCount: number;
  lastUpdated: string;
  ventasMes: number;
  gastosMes: number;
  beneficioMes: number;
  ivaEstimado: number;
  facturasPendientes: number;
};

type DemoPnl = {
  periodLabel: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  vatEstimated: number;
};

export type DemoData = {
  tenant: DemoTenant;
  kpis: DemoKpis;
  pnl: DemoPnl;
  invoices: DemoInvoice[];
  payments: DemoPayment[];
  customers: DemoCustomer[];
  bankMovements: DemoBankMovement[];
  documents: DemoDocument[];
  calendarItems: DemoCalendarItem[];
  isaakExamples: DemoIsaakExample[];
  isaakCards: DemoIsaakCard[];
};

const rawCustomers = [
  { name: "Nova Retail SL", nif: "B10981234", email: "contabilidad@novaretail.es" },
  { name: "Cima Logistics", nif: "B45892017", email: "finanzas@cimalogistics.es" },
  { name: "Luna Tech", nif: "B76234109", email: "pagos@lunatech.es" },
  { name: "Alba Studio", nif: "B30129844", email: "hola@alba.studio" },
  { name: "Mercurio Labs", nif: "B88765012", email: "conta@mercuriolabs.es" },
  { name: "Eco Servicios", nif: "B21340098", email: "facturacion@ecoservicios.es" },
  { name: "Orion Media", nif: "B56890321", email: "payments@orionmedia.es" },
  { name: "Sierra Consult", nif: "B11234567", email: "info@sierraconsult.es" },
  { name: "Delta Foods", nif: "B99001122", email: "admin@deltafoods.es" },
  { name: "Tramo Energia", nif: "B77112233", email: "cobros@tramoenergia.es" },
];

const customers: DemoCustomer[] = rawCustomers.map((customer, index) => ({
  id: `cust-${index + 1}`,
  name: customer.name,
  nif: customer.nif,
  email: customer.email,
}));

const statusCycle: DemoInvoice["status"][] = ["paid", "paid", "pending", "sent", "overdue"];

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function buildInvoices(count: number): DemoInvoice[] {
  const invoices: DemoInvoice[] = [];
  const buildDemoQr = (label: string) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <rect width="160" height="160" fill="#fff"/>
  <rect x="12" y="12" width="36" height="36" fill="#111"/>
  <rect x="112" y="12" width="36" height="36" fill="#111"/>
  <rect x="12" y="112" width="36" height="36" fill="#111"/>
  <rect x="64" y="64" width="32" height="32" fill="#111"/>
  <text x="80" y="150" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="#111">${label}</text>
</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };
  const buildHash = (seed: string) => {
    const base = seed.replace(/[^A-Z0-9]/gi, "") || "VF";
    let out = "";
    for (let i = 0; i < 64; i += 1) {
      const code = base.charCodeAt(i % base.length) || 65;
      out += ((code + i) % 16).toString(16);
    }
    return out;
  };

  for (let i = 0; i < count; i += 1) {
    const customer = customers[i % customers.length];
    const issueDate = daysAgo(2 + i * 3);
    const amountNet = 180 + ((i * 47) % 920) + (i % 3) * 35;
    const amountTax = Math.round(amountNet * 0.21 * 100) / 100;
    const amountGross = Math.round((amountNet + amountTax) * 100) / 100;
    const verifactuStatus =
      i % 4 === 0 ? "validated" : i % 4 === 1 ? "sent" : i % 4 === 2 ? "pending" : "error";
    const verifactuQr =
      verifactuStatus === "validated" || verifactuStatus === "sent"
        ? buildDemoQr(`VF-2026-${(i + 1).toString().padStart(4, "0")}`)
        : null;
    const verifactuHash =
      verifactuStatus === "validated" || verifactuStatus === "sent"
        ? buildHash(`VF-2026-${(i + 1).toString().padStart(4, "0")}`)
        : null;
    invoices.push({
      id: `inv-${i + 1}`,
      number: `VF-2026-${(i + 1).toString().padStart(4, "0")}`,
      issueDate: formatDate(issueDate),
      customerName: customer.name,
      customerNif: customer.nif,
      amountNet,
      amountTax,
      amountGross,
      status: statusCycle[i % statusCycle.length],
      verifactuStatus,
      verifactuQr,
      verifactuHash,
    });
  }
  return invoices;
}

function buildPayments(invoices: DemoInvoice[], count: number): DemoPayment[] {
  const payments: DemoPayment[] = [];
  const paidInvoices = invoices.filter((inv) => inv.status === "paid");
  for (let i = 0; i < count && i < paidInvoices.length; i += 1) {
    const invoice = paidInvoices[i];
    const paidAt = daysAgo(1 + i * 4);
    payments.push({
      id: `pay-${i + 1}`,
      invoiceId: invoice.id,
      amount: invoice.amountGross,
      method: "bank_transfer",
      reference: `TRF-${invoice.number}`,
      paidAt: formatDate(paidAt),
    });
  }
  return payments;
}

function buildBankMovements(count: number): DemoBankMovement[] {
  const concepts = [
    "Cobro factura",
    "Cuota software",
    "Pago proveedor",
    "Nomina equipo",
    "Impuesto trimestral",
    "Cobro tarjeta",
    "Alquiler oficina",
  ];
  return Array.from({ length: count }, (_, index) => {
    const date = daysAgo(index);
    const amount = Math.round((index % 2 === 0 ? 1 : -1) * (120 + (index * 17) % 980) * 100) / 100;
    return {
      id: `mov-${index + 1}`,
      date: formatDate(date),
      concept: `${concepts[index % concepts.length]} ${index + 1}`,
      amount,
      reconciled: index % 3 !== 0,
    };
  });
}

function buildDocuments(count: number): DemoDocument[] {
  const types: DemoDocument["type"][] = ["AEAT", "SS", "Contrato", "Factura", "Otro"];
  return Array.from({ length: count }, (_, index) => {
    const date = daysAgo(4 + index * 2);
    const status = index % 4 === 0 ? "pending" : index % 5 === 0 ? "archived" : "valid";
    return {
      id: `doc-${index + 1}`,
      type: types[index % types.length],
      date: formatDate(date),
      name: `Documento ${index + 1} - ${types[index % types.length]}`,
      status,
      statusLabel: status === "valid" ? "Validado" : status === "pending" ? "Pendiente" : "Archivado",
    };
  });
}

function buildCalendarItems(): DemoCalendarItem[] {
  return [
    {
      id: "cal-1",
      date: formatDate(daysFromNow(3)),
      title: "Modelo 303 - IVA",
      description: "Presentacion trimestral de IVA",
      status: "soon",
      statusLabel: "Proximo",
    },
    {
      id: "cal-2",
      date: formatDate(daysFromNow(7)),
      title: "Modelo 111",
      description: "Retenciones de profesionales",
      status: "soon",
      statusLabel: "Proximo",
    },
    {
      id: "cal-3",
      date: formatDate(daysFromNow(1)),
      title: "Envio VeriFactu",
      description: "Envio diario de facturas emitidas",
      status: "due",
      statusLabel: "Hoy",
    },
    {
      id: "cal-4",
      date: formatDate(daysFromNow(12)),
      title: "Cierre mensual",
      description: "Revisar conciliaciones y gastos",
      status: "ok",
      statusLabel: "Programado",
    },
    {
      id: "cal-5",
      date: formatDate(daysFromNow(20)),
      title: "Pago seguro social",
      description: "Cuota de autonomos y equipo",
      status: "ok",
      statusLabel: "Programado",
    },
    {
      id: "cal-6",
      date: formatDate(daysFromNow(5)),
      title: "Cobros pendientes",
      description: "Seguimiento de facturas vencidas",
      status: "soon",
      statusLabel: "Proximo",
    },
    {
      id: "cal-7",
      date: formatDate(daysFromNow(9)),
      title: "Actualizacion contable",
      description: "Exportar datos para tu gestor",
      status: "ok",
      statusLabel: "Programado",
    },
    {
      id: "cal-8",
      date: formatDate(daysFromNow(2)),
      title: "Conciliar banco",
      description: "Revisar movimientos pendientes",
      status: "due",
      statusLabel: "Hoy",
    },
    {
      id: "cal-9",
      date: formatDate(daysFromNow(14)),
      title: "Factura recurrente",
      description: "Emitir factura mensual",
      status: "ok",
      statusLabel: "Programado",
    },
    {
      id: "cal-10",
      date: formatDate(daysFromNow(6)),
      title: "Registro de gastos",
      description: "Subir tickets pendientes",
      status: "soon",
      statusLabel: "Proximo",
    },
  ];
}

const invoices = buildInvoices(42);
const payments = buildPayments(invoices, 16);
const bankMovements = buildBankMovements(50);
const documents = buildDocuments(20);
const calendarItems = buildCalendarItems();

function inLastDays(dateStr: string, days: number) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff <= days * 24 * 60 * 60 * 1000;
}

const invoicesMonth = invoices.filter((inv) => inLastDays(inv.issueDate, 30));
const revenueMonth = invoicesMonth.reduce((sum, inv) => sum + inv.amountNet, 0);
const vatEstimated = invoicesMonth.reduce((sum, inv) => sum + inv.amountTax, 0);
const expensesMonth = Math.round(revenueMonth * 0.32 * 100) / 100;
const profitMonth = Math.round((revenueMonth - expensesMonth) * 100) / 100;
const marginMonth = revenueMonth > 0 ? profitMonth / revenueMonth : 0;
const facturasPendientes = invoices.filter((inv) => inv.status !== "paid").length;

const isaakExamples: DemoIsaakExample[] = [
  {
    prompt: "Cual es mi beneficio estimado este mes?",
    answer: "En demo vemos un beneficio estimado de 7.160 EUR y margen del 31%.",
  },
  {
    prompt: "Tengo facturas vencidas?",
    answer: "Hay 3 facturas vencidas. Puedo preparar recordatorios automaticos.",
  },
  {
    prompt: "Que documentos faltan para cerrar el trimestre?",
    answer: "Faltan 2 tickets y 1 contrato firmado para completar el cierre.",
  },
  {
    prompt: "Puedes resumirme los gastos mas altos?",
    answer: "Claro: proveedores (34%), alquiler (18%) y herramientas (12%).",
  },
  {
    prompt: "Prepara un informe para mi gestor",
    answer: "Listo: ventas, gastos, IVA estimado y notas para revisar.",
  },
];

const isaakCards: DemoIsaakCard[] = [
  {
    id: "isaak-1",
    title: "Resumen diario",
    badge: "Hoy",
    tone: "ok",
    message: "Ventas +12% y margen estable.",
    response: "He detectado 3 cobros pendientes. Te preparo recordatorios.",
    footer: "Isaak usa tus datos reales cuando activas la prueba.",
  },
  {
    id: "isaak-2",
    title: "Cierre trimestral",
    badge: "Prioridad",
    tone: "warn",
    message: "Faltan 2 facturas y 1 ticket por registrar.",
    response: "Te aviso hoy y manana para llegar al cierre 2025 sin sorpresas.",
    footer: "Simulacion demo para mostrar flujo de trabajo.",
  },
  {
    id: "isaak-3",
    title: "IVA estimado",
    badge: "Info",
    tone: "info",
    message: "IVA estimado del periodo: 3.420 EUR.",
    response: "Puedo revisar si hay gastos deducibles pendientes.",
    footer: "Activa la prueba para conectar tu banco.",
  },
  {
    id: "isaak-4",
    title: "Clientes clave",
    badge: "OK",
    tone: "ok",
    message: "Tus 3 clientes principales concentran el 48% de ingresos.",
    response: "Quieres que programe alertas para sus cobros?",
    footer: "En demo los clientes son simulados.",
  },
];

export const demoData: DemoData = {
  tenant: {
    id: "demo-tenant",
    name: "Empresa Demo SL",
    legalName: "Empresa Demo SL",
    nif: "B12345678",
    createdAt: formatDate(daysAgo(200)),
  },
  kpis: {
    revenueMonth: Math.round(revenueMonth * 100) / 100,
    expensesMonth,
    profitMonth,
    vatEstimated: Math.round(vatEstimated * 100) / 100,
    invoicesCount: invoicesMonth.length,
    lastUpdated: new Date().toISOString(),
    ventasMes: Math.round(revenueMonth * 100) / 100,
    gastosMes: expensesMonth,
    beneficioMes: profitMonth,
    ivaEstimado: Math.round(vatEstimated * 100) / 100,
    facturasPendientes,
  },
  pnl: {
    periodLabel: "Periodo actual",
    revenue: Math.round(revenueMonth * 100) / 100,
    expenses: expensesMonth,
    profit: profitMonth,
    margin: marginMonth,
    vatEstimated: Math.round(vatEstimated * 100) / 100,
  },
  invoices,
  payments,
  customers,
  bankMovements,
  documents,
  calendarItems,
  isaakExamples,
  isaakCards,
};
