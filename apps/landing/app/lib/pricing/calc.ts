export type PricingInput = {
  invoices: number; // min 1
  movements: number; // min 0
  bankingEnabled: boolean;
};

const BASE_PRICE_EUR = 19;
const INVOICE_INCLUDED = 10;

const INVOICE_TIER_PRICES_EUR: Record<string, number> = {
  INVOICES_11_50_MONTHLY: 4,
  INVOICES_51_200_MONTHLY: 6,
  INVOICES_201_500_MONTHLY: 15,
};

const MOVEMENT_TIER_PRICES_EUR: Record<string, number> = {
  MOV_1_100_MONTHLY: 3,
  MOV_101_200_MONTHLY: 5,
  MOV_201_500_MONTHLY: 9,
  MOV_501_1000_MONTHLY: 15,
};

export function clampInt(n: number, min: number, max: number) {
  const x = Math.floor(Number.isFinite(n) ? n : min);
  return Math.max(min, Math.min(max, x));
}

export function normalizeInput(raw: PricingInput): PricingInput {
  return {
    invoices: clampInt(raw.invoices, 1, 500),
    movements: raw.bankingEnabled ? clampInt(raw.movements, 0, 1000) : 0,
    bankingEnabled: !!raw.bankingEnabled,
  };
}

export function invoiceTierKey(invoices: number):
  | null
  | "INVOICES_11_50_MONTHLY"
  | "INVOICES_51_200_MONTHLY"
  | "INVOICES_201_500_MONTHLY" {
  if (invoices <= INVOICE_INCLUDED) return null;
  if (invoices <= 50) return "INVOICES_11_50_MONTHLY";
  if (invoices <= 200) return "INVOICES_51_200_MONTHLY";
  return "INVOICES_201_500_MONTHLY";
}

export function movementTierKey(movements: number):
  | null
  | "MOV_1_100_MONTHLY"
  | "MOV_101_200_MONTHLY"
  | "MOV_201_500_MONTHLY"
  | "MOV_501_1000_MONTHLY" {
  if (movements <= 0) return null;
  if (movements <= 100) return "MOV_1_100_MONTHLY";
  if (movements <= 200) return "MOV_101_200_MONTHLY";
  if (movements <= 500) return "MOV_201_500_MONTHLY";
  return "MOV_501_1000_MONTHLY";
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
