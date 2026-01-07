import Stripe from "stripe";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function eurosToCents(amount) {
  return Math.round(amount * 100);
}

const STRIPE_SECRET_KEY = requireEnv("STRIPE_SECRET_KEY");
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

const PRODUCT = {
  planKey: "calculator-v1",
  name: "Verifactu Business · Suscripción mensual (calculadora)",
};

// IMPORTANT: aquí definimos los "addons" como precios recurrentes.
// Base siempre (19€). Empresas extra: 7€/empresa (cantidad = empresas-1).
// Facturas y movimientos: "flat add-on" por tramo (solo añadimos el tramo que aplique).
const PRICES = [
  { priceKey: "base-monthly", unitAmountEur: 19, interval: "month" },
  { priceKey: "company-unit-monthly", unitAmountEur: 7, interval: "month" },

  // Facturas (solo >50)
  { priceKey: "invoices-51-200-monthly", unitAmountEur: 6, interval: "month" },
  { priceKey: "invoices-201-500-monthly", unitAmountEur: 15, interval: "month" },
  { priceKey: "invoices-501-1000-monthly", unitAmountEur: 29, interval: "month" },
  { priceKey: "invoices-1001-2000-monthly", unitAmountEur: 49, interval: "month" },

  // Movimientos (solo >0)
  { priceKey: "mov-1-200-monthly", unitAmountEur: 6, interval: "month" },
  { priceKey: "mov-201-800-monthly", unitAmountEur: 15, interval: "month" },
  { priceKey: "mov-801-2000-monthly", unitAmountEur: 35, interval: "month" },
  { priceKey: "mov-2001-5000-monthly", unitAmountEur: 69, interval: "month" },
];

async function findOrCreateProduct({ planKey, name }) {
  const existing = await stripe.products.search({
    query: `metadata['verifactu_plan_key']:'${planKey}' AND active:'true'`,
    limit: 1,
  });

  if (existing.data[0]) {
    const product = existing.data[0];
    if (product.name !== name) {
      return stripe.products.update(product.id, { name });
    }
    return product;
  }

  return stripe.products.create({
    name,
    active: true,
    metadata: {
      verifactu_plan_key: planKey,
      verifactu_source: "verifactu-monorepo",
    },
  });
}

function priceMatchesExpected({ existingPrice, unit_amount, interval }) {
  if (existingPrice.currency !== "eur") return false;
  if (existingPrice.unit_amount !== unit_amount) return false;
  if (!existingPrice.recurring) return false;
  if (existingPrice.recurring.interval !== interval) return false;
  return true;
}

async function deprecatePrice({ existingPrice, priceKey }) {
  const now = new Date().toISOString();
  await stripe.prices.update(existingPrice.id, {
    active: false,
    metadata: {
      ...(existingPrice.metadata || {}),
      verifactu_price_key_deprecated_from: priceKey,
      verifactu_price_key_deprecated_at: now,
      // Important: change the key so future searches don't keep matching this old price.
      verifactu_price_key: `deprecated:${priceKey}:${now}`,
    },
  });
}

async function findOrCreatePrice({ productId, priceKey, unitAmountEur, interval }) {
  const unit_amount = eurosToCents(unitAmountEur);

  // Search by metadata key first.
  const existing = await stripe.prices.search({
    query: `metadata['verifactu_price_key']:'${priceKey}' AND active:'true'`,
    limit: 10,
  });

  if (existing.data.length > 0) {
    const matching = existing.data.find((p) =>
      priceMatchesExpected({ existingPrice: p, unit_amount, interval }),
    );
    if (matching) return matching;

    // We have at least one active price with this key, but it doesn't match
    // what we want (amount/interval). Deprecate them and create a new one.
    for (const p of existing.data) {
      await deprecatePrice({ existingPrice: p, priceKey });
    }
  }

  return stripe.prices.create({
    currency: "eur",
    unit_amount,
    recurring: { interval },
    product: productId,
    active: true,
    metadata: {
      verifactu_price_key: priceKey,
      verifactu_source: "verifactu-monorepo",
    },
  });
}

async function main() {
  const result = { productId: "", prices: {} };

  const product = await findOrCreateProduct(PRODUCT);
  result.productId = product.id;

  for (const p of PRICES) {
    const created = await findOrCreatePrice({
      productId: product.id,
      priceKey: p.priceKey,
      unitAmountEur: p.unitAmountEur,
      interval: p.interval,
    });
    result.prices[p.priceKey] = created.id;
  }

  console.log("\nStripe sync complete. Configure these env vars in apps/landing:\n");
  for (const [k, v] of Object.entries(result.prices)) {
    const env = "STRIPE_PRICE_" + k.toUpperCase().replace(/-/g, "_");
    console.log(`${env}=${v}`);
  }
  console.log("\nProduct:", result.productId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
