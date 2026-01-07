import { NextResponse } from "next/server";
import Stripe from "stripe";
import { estimateNetEur, invoiceTierKey, movementTierKey, normalizeInput } from "../../lib/pricing/calc";

function getOrigin(req: Request) {
  const url = new URL(req.url);
  const originFromHeader = req.headers.get("origin");
  return originFromHeader || url.origin;
}

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

// ====== POST: calculadora ======
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const input = normalizeInput({
    companies: body?.companies,
    invoices: body?.invoices,
    movements: body?.movements,
    bankingEnabled: body?.bankingEnabled,
  });

  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), { apiVersion: "2024-06-20" });

  const basePrice = requireEnv("STRIPE_PRICE_BASE_MONTHLY");
  const companyUnitPrice = requireEnv("STRIPE_PRICE_COMPANY_UNIT_MONTHLY");

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: basePrice, quantity: 1 },
  ];

  const extraCompanies = Math.max(0, input.companies - 1);
  if (extraCompanies > 0) {
    line_items.push({ price: companyUnitPrice, quantity: extraCompanies });
  }

  const invTier = invoiceTierKey(input.invoices);
  if (invTier) {
    const priceId = requireEnv(`STRIPE_PRICE_${invTier}`);
    line_items.push({ price: priceId, quantity: 1 });
  }

  const movTier = input.bankingEnabled ? movementTierKey(input.movements) : null;
  if (movTier) {
    const priceId = requireEnv(`STRIPE_PRICE_${movTier}`);
    line_items.push({ price: priceId, quantity: 1 });
  }

  const origin = getOrigin(req);
  const successUrl = new URL("/demo", origin);
  successUrl.searchParams.set("checkout", "success");
  successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

  const cancelUrl = new URL("/#precios", origin);

  // Estimación neta para mostrar/guardar como metadata (sin IVA)
  const estimated = estimateNetEur(input);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items,
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),

      // Trial 30 días (sin tarjeta si no es necesaria)
      payment_method_collection: "if_required",
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          verifactu_pricing: "calculator-v1",
          companies: String(input.companies),
          invoices: String(input.invoices),
          movements: String(input.movements),
          bankingEnabled: String(input.bankingEnabled),
          estimated_net_eur: String(estimated),
        },
      },

      // Para que el cliente meta email y luego podáis vincularlo con cuenta
      customer_creation: "always",
      metadata: {
        verifactu_pricing: "calculator-v1",
        estimated_net_eur: String(estimated),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: "No se pudo iniciar el pago" }, { status: 500 });
  }
}

// ====== GET antiguo (lo puedes borrar cuando migres todo) ======
const PLAN_TO_PRICE_ENV: Record<string, string> = {
  "pro-monthly": "STRIPE_PRICE_PRO_MONTHLY",
  "pro-yearly": "STRIPE_PRICE_PRO_YEARLY",
  "business-monthly": "STRIPE_PRICE_BUSINESS_MONTHLY",
  "business-yearly": "STRIPE_PRICE_BUSINESS_YEARLY",
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const plan = url.searchParams.get("plan") || "";

  if (plan === "free") {
    return NextResponse.redirect(new URL("/auth/signup", getOrigin(req)));
  }
  if (plan === "enterprise") {
    return NextResponse.redirect("mailto:soporte@verifactu.business");
  }

  const envKey = PLAN_TO_PRICE_ENV[plan];
  if (!envKey) {
    return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
  }

  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), { apiVersion: "2024-06-20" });
  const priceId = process.env[envKey];
  if (!priceId) return NextResponse.json({ error: `Falta configurar ${envKey}` }, { status: 500 });

  const origin = getOrigin(req);
  const successUrl = new URL("/demo", origin);
  successUrl.searchParams.set("checkout", "success");
  const cancelUrl = new URL("/demo#planes", origin);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
  });

  if (!session.url) return NextResponse.json({ error: "No se pudo iniciar el pago" }, { status: 500 });
  return NextResponse.redirect(session.url);
}
