export type PricingInput = {
  companies: number;     // min 1
  invoices: number;      // min 1
  movements: number;     // min 0
  bankingEnabled: boolean;
};

const BASE_PRICE_EUR = 19;
const COMPANY_UNIT_EUR = 7;

const INVOICE_TIER_PRICES_EUR: Record<string, number> = {
  INVOICES_11_50_MONTHLY: 4,
  INVOICES_51_200_MONTHLY: 6,
  INVOICES_201_500_MONTHLY: 15,
  INVOICES_501_1000_MONTHLY: 29,
  INVOICES_1001_2000_MONTHLY: 49,
};

const MOVEMENT_TIER_PRICES_EUR: Record<string, number> = {
  MOV_1_100_MONTHLY: 3,
  MOV_101_200_MONTHLY: 4,
  MOV_201_300_MONTHLY: 5,
  MOV_301_400_MONTHLY: 6,
  MOV_401_500_MONTHLY: 7,
  MOV_501_1000_MONTHLY: 12,
  MOV_1001_2000_MONTHLY: 19,
  MOV_2001_3000_MONTHLY: 29,
  MOV_3001_4000_MONTHLY: 39,
  MOV_4001_5000_MONTHLY: 49,
  MOV_5001_6000_MONTHLY: 59,
  MOV_6001_7000_MONTHLY: 69,
  MOV_7001_8000_MONTHLY: 79,
  MOV_8001_9000_MONTHLY: 89,
  MOV_9001_10000_MONTHLY: 99,
};

export function clampInt(n: number, min: number, max: number) {
  const x = Math.floor(Number.isFinite(n) ? n : min);
  return Math.max(min, Math.min(max, x));
}

export function normalizeInput(raw: PricingInput): PricingInput {
  return {
    companies: clampInt(raw.companies, 1, 50),
    invoices: clampInt(raw.invoices, 1, 2000),
    movements: raw.bankingEnabled ? clampInt(raw.movements, 0, 10000) : 0,
    bankingEnabled: !!raw.bankingEnabled,
  };
}

export function invoiceTierKey(invoices: number):
  | null
  | "INVOICES_11_50_MONTHLY"
  | "INVOICES_51_200_MONTHLY"
  | "INVOICES_201_500_MONTHLY"
  | "INVOICES_501_1000_MONTHLY"
  | "INVOICES_1001_2000_MONTHLY" {
  if (invoices <= 10) return null;
  if (invoices <= 50) return "INVOICES_11_50_MONTHLY";
  if (invoices <= 200) return "INVOICES_51_200_MONTHLY";
  if (invoices <= 500) return "INVOICES_201_500_MONTHLY";
  if (invoices <= 1000) return "INVOICES_501_1000_MONTHLY";
  return "INVOICES_1001_2000_MONTHLY";
}

export function movementTierKey(movements: number):
  | null
  | "MOV_1_100_MONTHLY"
  | "MOV_101_200_MONTHLY"
  | "MOV_201_300_MONTHLY"
  | "MOV_301_400_MONTHLY"
  | "MOV_401_500_MONTHLY"
  | "MOV_501_1000_MONTHLY"
  | "MOV_1001_2000_MONTHLY"
  | "MOV_2001_3000_MONTHLY"
  | "MOV_3001_4000_MONTHLY"
  | "MOV_4001_5000_MONTHLY"
  | "MOV_5001_6000_MONTHLY"
  | "MOV_6001_7000_MONTHLY"
  | "MOV_7001_8000_MONTHLY"
  | "MOV_8001_9000_MONTHLY"
  | "MOV_9001_10000_MONTHLY" {
  if (movements <= 0) return null;
  if (movements <= 100) return "MOV_1_100_MONTHLY";
  if (movements <= 200) return "MOV_101_200_MONTHLY";
  if (movements <= 300) return "MOV_201_300_MONTHLY";
  if (movements <= 400) return "MOV_301_400_MONTHLY";
  if (movements <= 500) return "MOV_401_500_MONTHLY";
  if (movements <= 1000) return "MOV_501_1000_MONTHLY";
  if (movements <= 2000) return "MOV_1001_2000_MONTHLY";
  if (movements <= 3000) return "MOV_2001_3000_MONTHLY";
  if (movements <= 4000) return "MOV_3001_4000_MONTHLY";
  if (movements <= 5000) return "MOV_4001_5000_MONTHLY";
  if (movements <= 6000) return "MOV_5001_6000_MONTHLY";
  if (movements <= 7000) return "MOV_6001_7000_MONTHLY";
  if (movements <= 8000) return "MOV_7001_8000_MONTHLY";
  if (movements <= 9000) return "MOV_8001_9000_MONTHLY";
  return "MOV_9001_10000_MONTHLY";
}

export function estimateNetEur(input: PricingInput) {
  const i = normalizeInput(input);
  let total = 19; // base

  // empresas extra
  total += Math.max(0, i.companies - 1) * 7;

  // facturas: aplicar SOLO si hay tier (>50)
  const invTier = invoiceTierKey(i.invoices);
  if (invTier === "INVOICES_11_50_MONTHLY") total += 4;
  else if (invTier === "INVOICES_51_200_MONTHLY") total += 6;
  else if (invTier === "INVOICES_201_500_MONTHLY") total += 15;
  else if (invTier === "INVOICES_501_1000_MONTHLY") total += 29;
  else if (invTier === "INVOICES_1001_2000_MONTHLY") total += 49;

  // movimientos: aplicar SOLO si hay tier (>0) y banca activada
  if (i.bankingEnabled) {
    const movTier = movementTierKey(i.movements);
    if (movTier) total += MOVEMENT_TIER_PRICES_EUR[movTier] ?? 0;
  }

  return total;
}

export function estimateBreakdown(input: PricingInput) {
  const i = normalizeInput(input);
  const base = BASE_PRICE_EUR;
  const companiesExtra = Math.max(0, i.companies - 1) * COMPANY_UNIT_EUR;

  const invTier = invoiceTierKey(i.invoices);
  const invoiceAddon = invTier ? INVOICE_TIER_PRICES_EUR[invTier] : 0;

  const movTier = i.bankingEnabled ? movementTierKey(i.movements) : null;
  const movementAddon = movTier ? MOVEMENT_TIER_PRICES_EUR[movTier] : 0;

  const total = base + companiesExtra + invoiceAddon + movementAddon;

  return {
    base,
    companiesExtra,
    invoiceAddon,
    movementAddon,
    total,
  };
}
