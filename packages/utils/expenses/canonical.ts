import { z } from "zod";

export const EXPENSE_SOURCES = ["pdf", "photo", "excel", "voice", "manual", "isaak"] as const;
export type ExpenseSource = (typeof EXPENSE_SOURCES)[number];
export type ExpenseSourceType = "upload" | "email" | "bank";

export const ExpenseDocTypeSchema = z.enum([
  "invoice",
  "ticket",
  "receipt",
  "bank_fee",
  "payroll",
  "other",
]);
export type ExpenseDocType = z.infer<typeof ExpenseDocTypeSchema>;

export const ExpenseTaxCategorySchema = z.enum([
  "iva_deducible",
  "iva_no_deducible",
  "suplido",
  "exento",
  "no_sujeto",
  "pendiente_confirmacion",
]);
export type ExpenseTaxCategory = z.infer<typeof ExpenseTaxCategorySchema>;

export const ExpenseCanonicalV2Schema = z.object({
  supplierName: z.string().min(1),
  supplierTaxId: z.string().nullable().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  documentNumber: z.string().nullable().optional(),
  currency: z.string().default("EUR"),
  totalAmount: z.number().nonnegative(),
  netAmount: z.number().nonnegative().nullable().optional(),
  vatAmount: z.number().nonnegative().nullable().optional(),
  vatRate: z.number().nonnegative().nullable().optional(),
  docType: ExpenseDocTypeSchema,
  taxCategory: ExpenseTaxCategorySchema,
  aeatConcept: z.string().nullable().optional(),
  aeatKey: z.string().nullable().optional(),
  confidence: z.record(z.string(), z.number().min(0).max(1)).default({}),
  warnings: z.array(z.string()).default([]),
  source: z.object({
    type: z.enum(["upload", "email", "bank"]),
    fileId: z.string().optional(),
  }),
});

export type ExpenseCanonicalV2 = z.infer<typeof ExpenseCanonicalV2Schema>;

export type CanonicalExpenseInput = {
  tenantId: string;
  date?: string;
  issueDate?: string;
  uploadDate?: string;
  description: string;
  amount?: number;
  totalAmount?: number;
  netAmount?: number | null;
  vatAmount?: number | null;
  taxRate?: number;
  vatRate?: number | null;
  currency?: string;
  supplierName?: string;
  supplierTaxId?: string | null;
  documentNumber?: string | null;
  categoryId?: number;
  categoryName?: string;
  deductible?: boolean;
  docType?: ExpenseDocType;
  taxCategory?: ExpenseTaxCategory;
  aeatConcept?: string | null;
  aeatKey?: string | null;
  confidence?: Record<string, number>;
  warnings?: string[];
  reference?: string;
  notes?: string;
  source?: ExpenseSource;
  sourceType?: ExpenseSourceType;
  fileId?: string;
};

export type CanonicalExpense = {
  tenantId: string;
  date: string;
  description: string;
  amount: number;
  taxRate: number;
  categoryId?: number;
  categoryName?: string;
  deductible?: boolean;
  reference?: string;
  notes?: string;
  source: ExpenseSource;
  canonicalV2: ExpenseCanonicalV2;
  docType: ExpenseDocType;
  taxCategory: ExpenseTaxCategory;
  warnings: string[];
  confidence: Record<string, number>;
};

function parseIsoDate(value: string | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function normalizeSourceType(source?: ExpenseSource, sourceType?: ExpenseSourceType): ExpenseSourceType {
  if (sourceType) return sourceType;
  if (!source) return "upload";
  if (source === "manual" || source === "voice" || source === "isaak") return "upload";
  return "upload";
}

function normalizeVatRatePercent(vatRate?: number | null, taxRate?: number): number | null {
  const raw = vatRate ?? taxRate;
  if (raw === undefined || raw === null || !Number.isFinite(raw) || raw < 0) return null;
  return raw <= 1 ? Number((raw * 100).toFixed(2)) : Number(raw.toFixed(2));
}

function vatPercentToFraction(vatRatePercent: number | null): number {
  if (vatRatePercent === null || !Number.isFinite(vatRatePercent)) return 0;
  return Number((vatRatePercent / 100).toFixed(4));
}

function pushUniqueWarning(warnings: string[], warning: string) {
  if (!warnings.includes(warning)) warnings.push(warning);
}

export function normalizeCanonicalExpense(input: CanonicalExpenseInput): CanonicalExpense {
  if (!input.tenantId) throw new Error("Missing tenantId");
  if (!input.description || !input.description.trim()) throw new Error("Missing description");

  const warnings = [...(input.warnings ?? [])];
  const parsedIssueDate = parseIsoDate(input.issueDate);
  const parsedDate = parseIsoDate(input.date);
  const parsedUploadDate = parseIsoDate(input.uploadDate);
  const issueDate =
    parsedIssueDate || parsedDate || parsedUploadDate || new Date().toISOString().slice(0, 10);

  if (!parsedIssueDate && !parsedDate && parsedUploadDate) pushUniqueWarning(warnings, "issueDate_inferred_from_upload");
  if (!parsedIssueDate && !parsedDate && !parsedUploadDate) pushUniqueWarning(warnings, "issueDate_defaulted_to_today");

  const totalAmount = Number.isFinite(input.totalAmount) ? Number(input.totalAmount) : Number(input.amount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new Error("Invalid amount");

  const docType = input.docType ?? "other";
  let taxCategory = input.taxCategory ?? "pendiente_confirmacion";
  let vatRatePercent = normalizeVatRatePercent(input.vatRate, input.taxRate);

  if (docType === "bank_fee" || docType === "payroll") {
    if (vatRatePercent === null) vatRatePercent = 0;
    if (!input.taxCategory) taxCategory = "iva_no_deducible";
    if (vatRatePercent > 0) pushUniqueWarning(warnings, "unexpected_vat_for_bank_fee_or_payroll");
  }

  let netAmount = Number.isFinite(input.netAmount as number) ? Number(input.netAmount) : null;
  let vatAmount = Number.isFinite(input.vatAmount as number) ? Number(input.vatAmount) : null;

  if (netAmount === null && vatAmount === null) {
    if (docType === "bank_fee" || docType === "payroll" || vatRatePercent === 0) {
      netAmount = totalAmount;
      vatAmount = 0;
    } else if (vatRatePercent !== null) {
      const rateFraction = vatPercentToFraction(vatRatePercent);
      if (rateFraction > 0) {
        netAmount = Number((totalAmount / (1 + rateFraction)).toFixed(2));
        vatAmount = Number((totalAmount - netAmount).toFixed(2));
        pushUniqueWarning(warnings, "amounts_estimated");
      } else {
        netAmount = totalAmount;
        vatAmount = 0;
      }
    } else {
      pushUniqueWarning(warnings, "missing_tax_breakdown");
    }
  }

  if (docType !== "invoice" && taxCategory === "iva_deducible") {
    pushUniqueWarning(warnings, "non_invoice_marked_deductible_check");
  }

  const supplierNameInput = input.supplierName?.trim() || "";
  const supplierName = supplierNameInput || "Proveedor no informado";
  const supplierTaxId = input.supplierTaxId?.trim() || null;
  if (!supplierTaxId) pushUniqueWarning(warnings, "missing_supplier_tax_id");

  const confidence: Record<string, number> = {
    supplierName: supplierNameInput ? 1 : 0.2,
    supplierTaxId: input.supplierTaxId ? 1 : 0.3,
    issueDate: parsedIssueDate || parsedDate ? 1 : parsedUploadDate ? 0.6 : 0.2,
    totalAmount: Number.isFinite(input.totalAmount) || Number.isFinite(input.amount) ? 1 : 0.3,
    netAmount: input.netAmount !== undefined && input.netAmount !== null ? 1 : vatRatePercent !== null ? 0.6 : 0.3,
    vatAmount: input.vatAmount !== undefined && input.vatAmount !== null ? 1 : vatRatePercent !== null ? 0.6 : 0.3,
    vatRate: vatRatePercent !== null ? 0.8 : 0.3,
    docType: input.docType ? 1 : 0.6,
    taxCategory: input.taxCategory ? 1 : 0.6,
    aeatConcept: input.aeatConcept ? 1 : 0.3,
    aeatKey: input.aeatKey ? 1 : 0.3,
    ...(input.confidence ?? {}),
  };

  const canonicalV2: ExpenseCanonicalV2 = ExpenseCanonicalV2Schema.parse({
    supplierName,
    supplierTaxId,
    issueDate,
    documentNumber: input.documentNumber ?? input.reference ?? null,
    currency: input.currency || "EUR",
    totalAmount,
    netAmount,
    vatAmount,
    vatRate: vatRatePercent,
    docType,
    taxCategory,
    aeatConcept: input.aeatConcept ?? input.categoryName ?? null,
    aeatKey: input.aeatKey ?? null,
    confidence,
    warnings,
    source: {
      type: normalizeSourceType(input.source, input.sourceType),
      fileId: input.fileId,
    },
  });

  const normalizedSource = EXPENSE_SOURCES.includes(input.source ?? "manual")
    ? (input.source ?? "manual")
    : "manual";

  return {
    tenantId: input.tenantId,
    date: canonicalV2.issueDate,
    description: input.description.trim(),
    amount: canonicalV2.totalAmount,
    taxRate: vatPercentToFraction(canonicalV2.vatRate ?? 0),
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    deductible: input.deductible,
    reference: input.reference?.trim() || canonicalV2.documentNumber || undefined,
    notes: input.notes?.trim() || undefined,
    source: normalizedSource,
    canonicalV2,
    docType: canonicalV2.docType,
    taxCategory: canonicalV2.taxCategory,
    warnings: canonicalV2.warnings,
    confidence: canonicalV2.confidence,
  };
}
