type DemoTenant = {
  id: string;
  name: string;
  nif: string;
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

type DemoKpis = {
  revenueMonth: number;
  expensesMonth: number;
  profitMonth: number;
  vatEstimated: number;
  invoicesCount: number;
  lastUpdated: string;
};

type DemoPnl = {
  periodLabel: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  vatEstimated: number;
};

type DemoIsaakExample = {
  prompt: string;
  answer: string;
};

export type DemoData = {
  tenant: DemoTenant;
  kpis: DemoKpis;
  pnl: DemoPnl;
  invoices: DemoInvoice[];
  payments: DemoPayment[];
  isaakExamples: DemoIsaakExample[];
};

const customers = [
  { name: "Nova Retail SL", nif: "B10981234" },
  { name: "Cima Logistics", nif: "B45892017" },
  { name: "Luna Tech", nif: "B76234109" },
  { name: "Alba Studio", nif: "B30129844" },
  { name: "Mercurio Labs", nif: "B88765012" },
  { name: "Eco Servicios", nif: "B21340098" },
  { name: "Orion Media", nif: "B56890321" },
  { name: "Sierra Consult", nif: "B11234567" },
  { name: "Delta Foods", nif: "B99001122" },
  { name: "Tramo Energia", nif: "B77112233" },
  { name: "Kite Market", nif: "B66004591" },
  { name: "Arco Creativo", nif: "B54007891" },
];

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

const invoices = buildInvoices(42);
const payments = buildPayments(invoices, 16);

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

export const demoData: DemoData = {
  tenant: {
    id: "demo-tenant",
    name: "Empresa Demo SL",
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
  },
  pnl: {
    periodLabel: "Mes actual",
    revenue: Math.round(revenueMonth * 100) / 100,
    expenses: expensesMonth,
    profit: profitMonth,
    margin: Math.round(marginMonth * 10000) / 100,
    vatEstimated: Math.round(vatEstimated * 100) / 100,
  },
  invoices,
  payments,
  isaakExamples: [
    {
      prompt: "Resume ventas y gastos del mes actual",
      answer: "Ventas netas 18.420 EUR, gastos 5.890 EUR y beneficio estimado 12.530 EUR.",
    },
    {
      prompt: "Que facturas estan pendientes de cobro?",
      answer: "Hay 4 facturas pendientes por un total de 8.210 EUR. Quieres enviar recordatorios?",
    },
    {
      prompt: "Prepara un resumen para mi asesoria",
      answer: "Listo: ventas, gastos y beneficio acumulado con IVA estimado. Puedo compartirlo en un enlace seguro.",
    },
    {
      prompt: "Revisa el IVA estimado del trimestre",
      answer: "IVA repercutido estimado: 3.870 EUR. Puedo marcar gastos deducibles si faltan tickets.",
    },
    {
      prompt: "Detecta variaciones frente al mes pasado",
      answer: "Ventas +12%, gastos +7%. El margen sube al 68%.",
    },
    {
      prompt: "Emite una factura VeriFactu para Nova Retail SL",
      answer: "He preparado el borrador VF-2026-0043 con 21% IVA. Solo falta confirmar la fecha.",
    },
    {
      prompt: "Valida si una factura cumple VeriFactu",
      answer: "La factura tiene numeracion correlativa y hash correcto. Lista para envio.",
    },
    {
      prompt: "Sube las escrituras y vincula al expediente",
      answer: "Documento cargado y etiquetado como societario. Quieres avisar a tu asesor?",
    },
    {
      prompt: "Guarda el CIF de la empresa",
      answer: "CIF guardado y asociado al perfil. Puedo usarlo en futuras facturas.",
    },
    {
      prompt: "Muéstrame los documentos del ultimo trimestre",
      answer: "Tengo 18 documentos: 10 facturas, 6 gastos y 2 contratos. Los ordeno por fecha?",
    },
    {
      prompt: "Calcula el beneficio estimado hoy",
      answer: "Beneficio estimado hoy: 12.530 EUR. Margen 68,0%.",
    },
    {
      prompt: "Genera un aviso de cierre trimestral",
      answer: "Aviso programado para el dia 20 con checklist de ventas y gastos.",
    },
    {
      prompt: "Conecta movimientos bancarios de enero",
      answer: "En demo no puedo conectar bancos, pero te muestro como quedaria la conciliacion.",
    },
    {
      prompt: "Comparte un resumen con mi gestoria",
      answer: "Resumen listo con ventas, gastos e IVA estimado. Puedo compartir por enlace seguro.",
    },
    {
      prompt: "Detecta gastos duplicados",
      answer: "He encontrado 2 gastos similares del mismo proveedor en 48h.",
    },
    {
      prompt: "Crea una factura recurrente mensual",
      answer: "Plantilla recurrente creada. Se emitira el dia 1 de cada mes.",
    },
    {
      prompt: "Exporta libros de facturas",
      answer: "Exportacion preparada con trazabilidad VeriFactu y fechas.",
    },
    {
      prompt: "Marca esta factura como cobrada",
      answer: "En demo no puedo registrar cobros reales, pero actualizaria el estado a cobrada.",
    },
    {
      prompt: "Que impuestos tengo aproximados?",
      answer: "IVA estimado 3.870 EUR. IRPF/IS depende de tu configuracion y gastos deducibles.",
    },
    {
      prompt: "Organiza gastos por proyecto",
      answer: "Proyecto 'Web 2026' tiene 12 gastos y margen 62%.",
    },
    {
      prompt: "Revisa vencimientos proximos",
      answer: "3 facturas vencen en 7 dias. Puedo programar recordatorios.",
    },
    {
      prompt: "Mostrar facturas emitidas en febrero",
      answer: "En febrero emitiste 9 facturas por 14.200 EUR netos.",
    },
    {
      prompt: "Ver documentos pendientes de revisar",
      answer: "Tienes 4 tickets sin categoria. Te los muestro para clasificar.",
    },
    {
      prompt: "Ayudame con una rectificativa",
      answer: "Te guiare paso a paso: motivo, numero original y nueva base imponible.",
    },
  ],
};
