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

// Keep this aligned with the pricing shown on the landing page.
// We only create paid plans in Stripe.
const PLANS = [
  {
    planKey: "pro",
    name: "Verifactu Business · Profesional",
    prices: [
      { priceKey: "pro-monthly", unitAmountEur: 29, interval: "month" },
      { priceKey: "pro-yearly", unitAmountEur: 290, interval: "year" },
    ],
  },
  {
    planKey: "business",
    name: "Verifactu Business · Business",
    prices: [
      { priceKey: "business-monthly", unitAmountEur: 69, interval: "month" },
      { priceKey: "business-yearly", unitAmountEur: 690, interval: "year" },
    ],
  },
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
  const result = {
    products: {},
    prices: {},
  };

  for (const plan of PLANS) {
    const product = await findOrCreateProduct(plan);
    result.products[plan.planKey] = product.id;

    for (const price of plan.prices) {
      const created = await findOrCreatePrice({
        productId: product.id,
        priceKey: price.priceKey,
        unitAmountEur: price.unitAmountEur,
        interval: price.interval,
      });
      result.prices[price.priceKey] = created.id;
    }
  }

  console.log("\nStripe sync complete. Configure these env vars in apps/landing (.env.local / Vercel):\n");
  console.log(`STRIPE_PRICE_PRO_MONTHLY=${result.prices["pro-monthly"]}`);
  console.log(`STRIPE_PRICE_PRO_YEARLY=${result.prices["pro-yearly"]}`);
  console.log(`STRIPE_PRICE_BUSINESS_MONTHLY=${result.prices["business-monthly"]}`);
  console.log(`STRIPE_PRICE_BUSINESS_YEARLY=${result.prices["business-yearly"]}`);

  console.log("\n(Products)");
  console.log(JSON.stringify(result.products, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
