export type PricingInput = {
  companies: number;     // min 1
  invoices: number;      // min 1
  movements: number;     // min 0
  bankingEnabled: boolean;
};

export function clampInt(n: number, min: number, max: number) {
  const x = Math.floor(Number.isFinite(n) ? n : min);
  return Math.max(min, Math.min(max, x));
}

export function normalizeInput(raw: PricingInput): PricingInput {
  return {
    companies: clampInt(raw.companies, 1, 50),
    invoices: clampInt(raw.invoices, 1, 2000),
    movements: raw.bankingEnabled ? clampInt(raw.movements, 0, 5000) : 0,
    bankingEnabled: !!raw.bankingEnabled,
  };
}

export function invoiceTierKey(invoices: number):
  | null
  | "INVOICES_51_200_MONTHLY"
  | "INVOICES_201_500_MONTHLY"
  | "INVOICES_501_1000_MONTHLY"
  | "INVOICES_1001_2000_MONTHLY" {
  if (invoices <= 50) return null;
  if (invoices <= 200) return "INVOICES_51_200_MONTHLY";
  if (invoices <= 500) return "INVOICES_201_500_MONTHLY";
  if (invoices <= 1000) return "INVOICES_501_1000_MONTHLY";
  return "INVOICES_1001_2000_MONTHLY";
}

export function movementTierKey(movements: number):
  | null
  | "MOV_1_200_MONTHLY"
  | "MOV_201_800_MONTHLY"
  | "MOV_801_2000_MONTHLY"
  | "MOV_2001_5000_MONTHLY" {
  if (movements <= 0) return null;
  if (movements <= 200) return "MOV_1_200_MONTHLY";
  if (movements <= 800) return "MOV_201_800_MONTHLY";
  if (movements <= 2000) return "MOV_801_2000_MONTHLY";
  return "MOV_2001_5000_MONTHLY";
}

export function estimateNetEur(input: PricingInput) {
  const i = normalizeInput(input);
  let total = 19; // base

  // empresas extra
  total += Math.max(0, i.companies - 1) * 7;

  // facturas tier add-on
  if (i.invoices > 50 && i.invoices <= 200) total += 6;
  else if (i.invoices <= 500) total += 15;
  else if (i.invoices <= 1000) total += 29;
  else total += 49;

  // movimientos tier add-on (solo si banca)
  if (i.bankingEnabled) {
    const m = i.movements;
    if (m > 0 && m <= 200) total += 6;
    else if (m <= 800) total += 15;
    else if (m <= 2000) total += 35;
    else if (m <= 5000) total += 69;
  }

  return total;
}
