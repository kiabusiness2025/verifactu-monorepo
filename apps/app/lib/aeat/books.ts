import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

type SalesRow = {
  fecha: string;
  numeroFactura: string;
  cliente: string;
  nif: string;
  base: number;
  tipoIva: number;
  cuotaIva: number;
  total: number;
  claveOperacion: string;
  pais: string;
};

type PurchasesRow = {
  fecha: string;
  numeroJustificante: string;
  proveedor: string;
  nif: string;
  base: number;
  tipoIva: number;
  cuotaIva: number;
  total: number;
  docType: string;
  taxCategory: string;
  aeatConcept: string;
  aeatKey: string;
};

function toNum(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : value.toNumber();
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
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
      fecha: toIsoDate(invoice.issueDate),
      numeroFactura: invoice.number,
      cliente: invoice.customerName,
      nif: invoice.customerNif || '',
      base,
      tipoIva,
      cuotaIva: tax,
      total: gross,
      claveOperacion: 'F1',
      pais: 'ES',
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

  return expenses.map((expense) => {
    const total = toNum(expense.amount);
    const taxRate = toNum(expense.taxRate);
    const baseRaw = taxRate > 0 ? total / (1 + taxRate) : total;
    const taxRaw = total - baseRaw;

    const notes = expense.notes || '';
    const docType = /DocType:([^|]+)/i.exec(notes)?.[1]?.trim() || 'invoice';
    const taxCategory = /TaxCategory:([^|]+)/i.exec(notes)?.[1]?.trim() || 'iva_deducible';
    const aeatConcept = /AEATConcept:([^|]+)/i.exec(notes)?.[1]?.trim() || '';
    const aeatKey = /AEATKey:([^|]+)/i.exec(notes)?.[1]?.trim() || '';

    const nonDeductible = taxCategory === 'iva_no_deducible';

    return {
      fecha: toIsoDate(expense.date),
      numeroJustificante: expense.reference || expense.id,
      proveedor: expense.supplier?.name || 'Proveedor no informado',
      nif: expense.supplier?.nif || '',
      base: Number(baseRaw.toFixed(2)),
      tipoIva: Number((taxRate * 100).toFixed(2)),
      cuotaIva: nonDeductible ? 0 : Number(taxRaw.toFixed(2)),
      total: Number(total.toFixed(2)),
      docType,
      taxCategory,
      aeatConcept,
      aeatKey,
    };
  });
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
  const cuotaVentas = sales.reduce((sum, row) => sum + row.cuotaIva, 0);
  const baseGastosDeducibles = purchases
    .filter((row) => row.taxCategory !== 'iva_no_deducible')
    .reduce((sum, row) => sum + row.base, 0);
  const cuotaGastosDeducibles = purchases
    .filter((row) => row.taxCategory !== 'iva_no_deducible')
    .reduce((sum, row) => sum + row.cuotaIva, 0);

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
  const gastos = purchases.reduce((sum, row) => sum + row.total, 0);
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
