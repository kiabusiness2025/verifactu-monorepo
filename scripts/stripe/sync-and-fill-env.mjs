import fs from "node:fs";
import path from "node:path";
import Stripe from "stripe";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function eurosToCents(amount) {
  return Math.round(amount * 100);
}

function envNameFromPriceKey(priceKey) {
  // base-monthly -> STRIPE_PRICE_BASE_MONTHLY
  return "STRIPE_PRICE_" + priceKey.toUpperCase().replace(/-/g, "_");
}

function upsertEnvFile(filePath, kv) {
  let content = "";
  if (fs.existsSync(filePath)) content = fs.readFileSync(filePath, "utf8");

  const lines = content.split(/\r?\n/);
  const out = [];
  const seen = new Set();

  for (let line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (m) {
      const key = m[1];
      if (Object.prototype.hasOwnProperty.call(kv, key)) {
        out.push(`${key}=${kv[key]}`);
        seen.add(key);
        continue;
      }
    }
    out.push(line);
  }

  // append missing keys at end
  if (out.length && out[out.length - 1].trim() !== "") out.push("");
  for (const [k, v] of Object.entries(kv)) {
    if (!seen.has(k)) out.push(`${k}=${v}`);
  }
  out.push("");

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, out.join("\n"), "utf8");
}

const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), { apiVersion: "2024-06-20" });

const PRODUCT = {
  planKey: "calculator-v1",
  name: "Verifactu Business · Suscripción mensual (calculadora)",
};

const PRICE_SPECS = [
  // base
  { priceKey: "base-monthly", unitAmountEur: 19, interval: "month" },

  // companies extra
  { priceKey: "company-unit-monthly", unitAmountEur: 7, interval: "month" },

  // invoices (add-on por tramo)
  { priceKey: "invoices-51-200-monthly", unitAmountEur: 6, interval: "month" },
  { priceKey: "invoices-201-500-monthly", unitAmountEur: 15, interval: "month" },
  { priceKey: "invoices-501-1000-monthly", unitAmountEur: 29, interval: "month" },
  { priceKey: "invoices-1001-2000-monthly", unitAmountEur: 49, interval: "month" },

  // movements (add-on por tramo)
  { priceKey: "mov-1-200-monthly", unitAmountEur: 6, interval: "month" },
  { priceKey: "mov-201-800-monthly", unitAmountEur: 15, interval: "month" },
  { priceKey: "mov-801-2000-monthly", unitAmountEur: 35, interval: "month" },
  { priceKey: "mov-2001-5000-monthly", unitAmountEur: 69, interval: "month" },
];

async function findOrCreateProduct() {
  const existing = await stripe.products.search({
    query: `metadata['verifactu_plan_key']:'${PRODUCT.planKey}' AND active:'true'`,
    limit: 1,
  });

  if (existing.data[0]) {
    const product = existing.data[0];
    if (product.name !== PRODUCT.name) {
      return stripe.products.update(product.id, { name: PRODUCT.name });
    }
    return product;
  }

  return stripe.products.create({
    name: PRODUCT.name,
    active: true,
    metadata: {
      verifactu_plan_key: PRODUCT.planKey,
      verifactu_source: "verifactu-monorepo",
    },
  });
}

function priceMatches({ p, unit_amount, interval }) {
  return (
    p.active === true &&
    p.currency === "eur" &&
    p.unit_amount === unit_amount &&
    p.recurring?.interval === interval
  );
}

async function deactivatePrice(p, newKey) {
  const now = new Date().toISOString();
  await stripe.prices.update(p.id, {
    active: false,
    metadata: {
      ...(p.metadata || {}),
      verifactu_price_key_deprecated_from: newKey,
      verifactu_price_key_deprecated_at: now,
      verifactu_price_key: `deprecated:${newKey}:${now}`,
    },
  });
}

async function findOrCreatePrice(productId, spec) {
  const unit_amount = eurosToCents(spec.unitAmountEur);

  const found = await stripe.prices.search({
    query: `metadata['verifactu_price_key']:'${spec.priceKey}'`,
    limit: 20,
  });

  // 1) si existe uno activo y coincide, usarlo
  const match = found.data.find((p) => priceMatches({ p, unit_amount, interval: spec.interval }));
  if (match) return match;

  // 2) si hay activos que no coinciden, desactivarlos
  const activeOnes = found.data.filter((p) => p.active);
  for (const p of activeOnes) {
    await deactivatePrice(p, spec.priceKey);
  }

  // 3) crear nuevo
  return stripe.prices.create({
    currency: "eur",
    unit_amount,
    recurring: { interval: spec.interval },
    product: productId,
    active: true,
    metadata: {
      verifactu_price_key: spec.priceKey,
      verifactu_source: "verifactu-monorepo",
    },
  });
}

async function main() {
  const envTarget =
    process.env.ENV_TARGET ||
    path.resolve(process.cwd(), "apps/landing/.env.local");

  const product = await findOrCreateProduct();

  const envKv = {};
  const report = [];

  for (const spec of PRICE_SPECS) {
    const price = await findOrCreatePrice(product.id, spec);
    const envName = envNameFromPriceKey(spec.priceKey);

    envKv[envName] = price.id;

    report.push({
      env: envName,
      id: price.id,
      eur: spec.unitAmountEur,
      interval: spec.interval,
    });
  }

  // actualiza/añade las env vars en el archivo destino
  upsertEnvFile(envTarget, envKv);

  console.log("\n✅ Stripe prices synced.");
  console.log("✅ .env updated:", envTarget);
  console.log("\n--- Summary (env -> priceId | amount) ---");
  for (const r of report) {
    console.log(`${r.env}=${r.id}   # ${r.eur} EUR / ${r.interval}`);
  }

  console.log("\nProduct:", product.id, `"${product.name}"`);
  console.log("\nTip: para actualizar también en Vercel, usa vercel env rm/add con estas mismas keys.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
