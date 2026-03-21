import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import type { ExpenseCanonicalV2 } from '@verifactu/utils/expenses/canonical';

type SalesRow = {
  fechaExpedicion: string;
  numeroFactura: string;
  destinatario: string;
  nifDestinatario: string;
  baseImponible: number;
  tipoIva: number;
  cuotaIvaRepercutida: number;
  retencionIrpf: number;
  totalFactura: number;
  claveOperacion: string;
  periodoLiquidacion: string;
  observaciones: string;
};

type PurchasesRow = {
  fechaFactura: string;
  fechaRegistro: string;
  numeroFacturaProveedor: string;
  proveedor: string;
  nifProveedor: string;
  baseImponible: number;
  tipoIva: number;
  cuotaIvaSoportado: number;
  ivaDeducible: 'SI' | 'NO';
  totalFactura: number;
  claveGasto: string;
  observaciones: string;
  // Campos internos para cálculo de modelos fiscales.
  docType: string;
  taxCategory: string;
  aeatConcept: string;
  aeatKey: string;
};

type InvestmentRow = {
  descripcionBien: string;
  fechaAdquisicion: string;
  valorAdquisicion: number;
  valorSuelo: number;
  valorConstruccion: number;
  baseAmortizable: number;
  porcentajeAmortizacion: number;
  amortizacionAnual: number;
  amortizacionAcumulada: number;
  valorPendiente: number;
  ejercicio: number;
  observaciones: string;
};

function toNum(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : value.toNumber();
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toPeriodLabel(value: Date): string {
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  return `${value.getUTCFullYear()}-${month}`;
}

const EXPENSE_CANONICAL_MIGRATION_CUTOFF = new Date('2026-03-02T00:00:00.000Z');

function parseLegacyMeta(notes: string) {
  return {
    docType: /DocType:([^|]+)/i.exec(notes)?.[1]?.trim() || 'invoice',
    taxCategory: /TaxCategory:([^|]+)/i.exec(notes)?.[1]?.trim() || 'iva_deducible',
    aeatConcept: /AEATConcept:([^|]+)/i.exec(notes)?.[1]?.trim() || '',
    aeatKey: /AEATKey:([^|]+)/i.exec(notes)?.[1]?.trim() || '',
  };
}

function readCanonicalV2(json: unknown): ExpenseCanonicalV2 | null {
  if (!json || typeof json !== 'object') return null;
  const candidate = json as Partial<ExpenseCanonicalV2>;
  if (
    typeof candidate.issueDate === 'string' &&
    typeof candidate.totalAmount === 'number' &&
    typeof candidate.docType === 'string' &&
    typeof candidate.taxCategory === 'string'
  ) {
    return candidate as ExpenseCanonicalV2;
  }
  return null;
}

export async function getSalesBookRows(tenantId: string, from: Date, to: Date): Promise<SalesRow[]> {
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      issueDate: { gte: from, lte: to },
    },
    orderBy: { issueDate: 'asc' },
  });

  return invoices.map((invoice) => {
    const base = toNum(invoice.amountNet);
    const tax = toNum(invoice.amountTax);
    const gross = toNum(invoice.amountGross);
    const tipoIva = base > 0 ? Number(((tax / base) * 100).toFixed(2)) : 0;

    return {
      fechaExpedicion: toIsoDate(invoice.issueDate),
      numeroFactura: invoice.number,
      destinatario: invoice.customerName,
      nifDestinatario: invoice.customerNif || '',
      baseImponible: base,
      tipoIva,
      cuotaIvaRepercutida: tax,
      retencionIrpf: 0,
      totalFactura: gross,
      claveOperacion: 'F1',
      periodoLiquidacion: toPeriodLabel(invoice.issueDate),
      observaciones: '',
    };
  });
}

export async function getPurchasesBookRows(tenantId: string, from: Date, to: Date): Promise<PurchasesRow[]> {
  const expenses = await prisma.expenseRecord.findMany({
    where: {
      tenantId,
      date: { gte: from, lte: to },
    },
    include: {
      supplier: {
        select: { name: true, nif: true },
      },
    },
    orderBy: { date: 'asc' },
  });

  return expenses
    .filter((expense) => {
      const withMeta = expense as typeof expense & { canonicalStatus?: string | null };
      const canonicalStatus = withMeta.canonicalStatus ?? undefined;
      if (!canonicalStatus) {
        return expense.createdAt < EXPENSE_CANONICAL_MIGRATION_CUTOFF;
      }
      return canonicalStatus === 'confirmed';
    })
    .map((expense) => {
    const total = toNum(expense.amount);
    const legacy = parseLegacyMeta(expense.notes || '');
    const withMeta = expense as typeof expense & { canonicalV2Json?: unknown };
    const canonical = readCanonicalV2(withMeta.canonicalV2Json);

    const docType = expense.docType || canonical?.docType || legacy.docType;
    const taxCategory = expense.taxCategory || canonical?.taxCategory || legacy.taxCategory;
    const aeatConcept = expense.aeatConcept || canonical?.aeatConcept || legacy.aeatConcept;
    const aeatKey = expense.aeatKey || canonical?.aeatKey || legacy.aeatKey;
    const tipoIva =
      canonical?.vatRate !== undefined && canonical.vatRate !== null
        ? canonical.vatRate
        : Number((toNum(expense.taxRate) * 100).toFixed(2));

    const baseRaw =
      canonical?.netAmount !== undefined && canonical.netAmount !== null
        ? canonical.netAmount
        : tipoIva > 0
          ? total / (1 + tipoIva / 100)
          : total;
    const taxRaw =
      canonical?.vatAmount !== undefined && canonical.vatAmount !== null
        ? canonical.vatAmount
        : Number((total - baseRaw).toFixed(2));

    const nonDeductible = taxCategory === 'iva_no_deducible';

    return {
      fechaFactura: toIsoDate(expense.date),
      fechaRegistro: toIsoDate(expense.createdAt),
      numeroFacturaProveedor: expense.reference || expense.id,
      proveedor: expense.supplier?.name || 'Proveedor no informado',
      nifProveedor: expense.supplier?.nif || '',
      baseImponible: Number(baseRaw.toFixed(2)),
      tipoIva: Number(tipoIva.toFixed(2)),
      cuotaIvaSoportado: nonDeductible ? 0 : Number(taxRaw.toFixed(2)),
      ivaDeducible: nonDeductible ? 'NO' : 'SI',
      totalFactura: Number(total.toFixed(2)),
      claveGasto: aeatKey || expense.category || '',
      observaciones: expense.notes || '',
      docType,
      taxCategory,
      aeatConcept,
      aeatKey,
    };
  });
}

export async function getInvestmentBookRows(_tenantId: string, _from: Date, _to: Date): Promise<InvestmentRow[]> {
  // Aun no existe una tabla de activos fijos + cuadro de amortizaciones en el modelo de datos.
  // Devolvemos una colección vacía para que la exportación produzca la plantilla AEAT con cabeceras.
  return [];
}

export type Preview303 = {
  period: string;
  baseVentas: number;
  cuotaVentas: number;
  baseGastosDeducibles: number;
  cuotaGastosDeducibles: number;
  resultado: number;
};

export async function getPreview303(tenantId: string, from: Date, to: Date, period: string): Promise<Preview303> {
  const [sales, purchases] = await Promise.all([
    getSalesBookRows(tenantId, from, to),
    getPurchasesBookRows(tenantId, from, to),
  ]);

  const baseVentas = sales.reduce((sum, row) => sum + row.base, 0);
  const cuotaVentas = sales.reduce((sum, row) => sum + row.cuotaIvaRepercutida, 0);
  const baseGastosDeducibles = purchases
    .filter((row) => row.taxCategory !== 'iva_no_deducible')
    .reduce((sum, row) => sum + row.baseImponible, 0);
  const cuotaGastosDeducibles = purchases
    .filter((row) => row.taxCategory !== 'iva_no_deducible')
    .reduce((sum, row) => sum + row.cuotaIvaSoportado, 0);

  return {
    period,
    baseVentas: Number(baseVentas.toFixed(2)),
    cuotaVentas: Number(cuotaVentas.toFixed(2)),
    baseGastosDeducibles: Number(baseGastosDeducibles.toFixed(2)),
    cuotaGastosDeducibles: Number(cuotaGastosDeducibles.toFixed(2)),
    resultado: Number((cuotaVentas - cuotaGastosDeducibles).toFixed(2)),
  };
}

export type Preview130 = {
  period: string;
  ingresos: number;
  gastos: number;
  rendimientoNeto: number;
  pagoFraccionadoEstimado: number;
  porcentajeAplicado: number;
};

export async function getPreview130(tenantId: string, from: Date, to: Date, period: string): Promise<Preview130> {
  const [sales, purchases] = await Promise.all([
    getSalesBookRows(tenantId, from, to),
    getPurchasesBookRows(tenantId, from, to),
  ]);

  const ingresos = sales.reduce((sum, row) => sum + row.base, 0);
  const gastos = purchases.reduce((sum, row) => sum + row.totalFactura, 0);
  const rendimientoNeto = ingresos - gastos;
  const porcentajeAplicado = 0.2;
  const pagoFraccionadoEstimado = Math.max(0, rendimientoNeto * porcentajeAplicado);

  return {
    period,
    ingresos: Number(ingresos.toFixed(2)),
    gastos: Number(gastos.toFixed(2)),
    rendimientoNeto: Number(rendimientoNeto.toFixed(2)),
    pagoFraccionadoEstimado: Number(pagoFraccionadoEstimado.toFixed(2)),
    porcentajeAplicado,
  };
}
