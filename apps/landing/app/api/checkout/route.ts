import { NextResponse } from "next/server";
import Stripe from "stripe";
import { estimateNetEur, invoiceTierKey, movementTierKey, normalizeInput } from "../../lib/pricing/calc";
import { verifySessionToken, readSessionSecret, SESSION_COOKIE_NAME } from "@verifactu/utils";
import { getLandingUrl, getAppUrl } from "@verifactu/utils";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

async function getUserFromSession(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  if (!m) return null;

  const token = decodeURIComponent(m[1]);
  try {
    const secret = readSessionSecret();
    const payload = await verifySessionToken(token, secret);
    return {
      uid: payload?.uid || "",
      email: payload?.email || null,
    };
  } catch {
    return null;
  }
}

// ====== POST: calculadora ======
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const rawInvoices = Number(body?.invoices ?? 1);
  const rawMovements = Number(body?.movements ?? 0);
  const rawBankingEnabled = !!body?.bankingEnabled;

  if (rawInvoices > 1000) {
    return NextResponse.json(
      { error: "Presupuesto requerido", code: "QUOTE_REQUIRED", redirect: "/presupuesto" },
      { status: 400 }
    );
  }

  if (rawBankingEnabled && rawMovements > 2000) {
    return NextResponse.json(
      { error: "Presupuesto requerido", code: "QUOTE_REQUIRED", redirect: "/presupuesto" },
      { status: 400 }
    );
  }

  const input = normalizeInput({
    invoices: rawInvoices,
    movements: rawMovements,
    bankingEnabled: rawBankingEnabled,
  });

  const user = await getUserFromSession(req);
  if (!user?.uid) {
    return NextResponse.json({ error: "Necesitas iniciar sesión" }, { status: 401 });
  }

  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), { apiVersion: "2024-06-20" });

  const basePrice = requireEnv("STRIPE_PRICE_BASE_MONTHLY");
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: basePrice, quantity: 1 },
  ];

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

  const successUrl = new URL("/dashboard", getAppUrl());
  successUrl.searchParams.set("checkout", "success");
  successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

  const cancelUrl = new URL("/#planes", getLandingUrl());

  // Estimacion neta para mostrar/guardar como metadata (sin IVA)
  const estimated = estimateNetEur(input);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      locale: "es",
      line_items,
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      client_reference_id: user.uid,
      customer_email: user.email ?? undefined,

      // Trial 30 días (sin tarjeta si no es necesaria)
      payment_method_collection: "if_required",
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          verifactu_pricing: "calculator-v1",
          uid: user.uid,
          invoices: String(input.invoices),
          movements: String(input.movements),
          bankingEnabled: String(input.bankingEnabled),
          estimated_net_eur: String(estimated),
        },
      },

      // Para que el cliente meta email y luego podais vincularlo con cuenta
      customer_creation: "always",
      metadata: {
        verifactu_pricing: "calculator-v1",
        uid: user.uid,
        estimated_net_eur: String(estimated),
      },
    });

    if (!session.url) {
      throw new Error("Stripe session without url");
    }

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
    return NextResponse.redirect(new URL("/auth/signup", getLandingUrl()));
  }
  if (plan === "enterprise") {
    return NextResponse.redirect("mailto:info@verifactu.business");
  }

  const envKey = PLAN_TO_PRICE_ENV[plan];
  if (!envKey) {
    return NextResponse.json({ error: "Plan no valido" }, { status: 400 });
  }

  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), { apiVersion: "2024-06-20" });
  const priceId = process.env[envKey];
  if (!priceId) return NextResponse.json({ error: `Falta configurar ${envKey}` }, { status: 500 });

  const successUrl = new URL("/demo", getLandingUrl());
  successUrl.searchParams.set("checkout", "success");
  const cancelUrl = new URL("/demo#planes", getLandingUrl());

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
  });

  if (!session.url) return NextResponse.json({ error: "No se pudo iniciar el pago" }, { status: 500 });
  return NextResponse.redirect(session.url);
}
