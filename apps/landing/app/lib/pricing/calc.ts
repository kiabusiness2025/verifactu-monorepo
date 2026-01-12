export type PricingInput = {
  invoices: number; // min 1
  movements: number; // min 0
  bankingEnabled: boolean;
};

const BASE_PRICE_EUR = 19;
const INVOICE_INCLUDED = 10;

const INVOICE_TIER_PRICES_EUR: Record<string, number> = {
  INVOICES_11_20_MONTHLY: 5,
  INVOICES_21_30_MONTHLY: 10,
  INVOICES_31_40_MONTHLY: 15,
  INVOICES_41_50_MONTHLY: 20,
  INVOICES_51_100_MONTHLY: 25,
  INVOICES_101_200_MONTHLY: 35,
  INVOICES_201_300_MONTHLY: 45,
  INVOICES_301_400_MONTHLY: 55,
  INVOICES_401_500_MONTHLY: 65,
  INVOICES_501_1000_MONTHLY: 85,
};

const MOVEMENT_TIER_PRICES_EUR: Record<string, number> = {
  MOV_1_20_MONTHLY: 5,
  MOV_21_30_MONTHLY: 10,
  MOV_31_40_MONTHLY: 15,
  MOV_41_50_MONTHLY: 20,
  MOV_51_100_MONTHLY: 25,
  MOV_101_200_MONTHLY: 35,
  MOV_201_300_MONTHLY: 45,
  MOV_301_400_MONTHLY: 55,
  MOV_401_500_MONTHLY: 65,
  MOV_501_1000_MONTHLY: 85,
  MOV_1001_2000_MONTHLY: 105,
};

export function clampInt(n: number, min: number, max: number) {
  const x = Math.floor(Number.isFinite(n) ? n : min);
  return Math.max(min, Math.min(max, x));
}

export function normalizeInput(raw: PricingInput): PricingInput {
  return {
    invoices: clampInt(raw.invoices, 1, 1000),
    movements: raw.bankingEnabled ? clampInt(raw.movements, 0, 2000) : 0,
    bankingEnabled: !!raw.bankingEnabled,
  };
}

export function invoiceTierKey(invoices: number):
  | null
  | "INVOICES_11_20_MONTHLY"
  | "INVOICES_21_30_MONTHLY"
  | "INVOICES_31_40_MONTHLY"
  | "INVOICES_41_50_MONTHLY"
  | "INVOICES_51_100_MONTHLY"
  | "INVOICES_101_200_MONTHLY"
  | "INVOICES_201_300_MONTHLY"
  | "INVOICES_301_400_MONTHLY"
  | "INVOICES_401_500_MONTHLY"
  | "INVOICES_501_1000_MONTHLY" {
  if (invoices <= INVOICE_INCLUDED) return null;
  if (invoices <= 20) return "INVOICES_11_20_MONTHLY";
  if (invoices <= 30) return "INVOICES_21_30_MONTHLY";
  if (invoices <= 40) return "INVOICES_31_40_MONTHLY";
  if (invoices <= 50) return "INVOICES_41_50_MONTHLY";
  if (invoices <= 100) return "INVOICES_51_100_MONTHLY";
  if (invoices <= 200) return "INVOICES_101_200_MONTHLY";
  if (invoices <= 300) return "INVOICES_201_300_MONTHLY";
  if (invoices <= 400) return "INVOICES_301_400_MONTHLY";
  if (invoices <= 500) return "INVOICES_401_500_MONTHLY";
  return "INVOICES_501_1000_MONTHLY";
}

export function movementTierKey(movements: number):
  | null
  | "MOV_1_20_MONTHLY"
  | "MOV_21_30_MONTHLY"
  | "MOV_31_40_MONTHLY"
  | "MOV_41_50_MONTHLY"
  | "MOV_51_100_MONTHLY"
  | "MOV_101_200_MONTHLY"
  | "MOV_201_300_MONTHLY"
  | "MOV_301_400_MONTHLY"
  | "MOV_401_500_MONTHLY"
  | "MOV_501_1000_MONTHLY"
  | "MOV_1001_2000_MONTHLY" {
  if (movements <= 0) return null;
  if (movements <= 20) return "MOV_1_20_MONTHLY";
  if (movements <= 30) return "MOV_21_30_MONTHLY";
  if (movements <= 40) return "MOV_31_40_MONTHLY";
  if (movements <= 50) return "MOV_41_50_MONTHLY";
  if (movements <= 100) return "MOV_51_100_MONTHLY";
  if (movements <= 200) return "MOV_101_200_MONTHLY";
  if (movements <= 300) return "MOV_201_300_MONTHLY";
  if (movements <= 400) return "MOV_301_400_MONTHLY";
  if (movements <= 500) return "MOV_401_500_MONTHLY";
  if (movements <= 1000) return "MOV_501_1000_MONTHLY";
  return "MOV_1001_2000_MONTHLY";
}

export function estimateNetEur(input: PricingInput) {
  const i = normalizeInput(input);
  const invTier = invoiceTierKey(i.invoices);
  const invoiceAddon = invTier ? (INVOICE_TIER_PRICES_EUR[invTier] ?? 0) : 0;

  const movTier = i.bankingEnabled ? movementTierKey(i.movements) : null;
  const movementAddon = movTier ? (MOVEMENT_TIER_PRICES_EUR[movTier] ?? 0) : 0;

  return BASE_PRICE_EUR + invoiceAddon + movementAddon;
}

export function estimateBreakdown(input: PricingInput) {
  const i = normalizeInput(input);
  const invTier = invoiceTierKey(i.invoices);
  const invoiceAddon = invTier ? (INVOICE_TIER_PRICES_EUR[invTier] ?? 0) : 0;

  const movTier = i.bankingEnabled ? movementTierKey(i.movements) : null;
  const movementAddon = movTier ? (MOVEMENT_TIER_PRICES_EUR[movTier] ?? 0) : 0;

  return {
    base: BASE_PRICE_EUR,
    invoiceAddon,
    movementAddon,
    total: BASE_PRICE_EUR + invoiceAddon + movementAddon,
  };
}
