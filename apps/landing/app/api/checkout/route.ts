import { NextResponse } from "next/server";
import Stripe from "stripe";

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

const PLAN_TO_PRICE_ENV: Record<string, string> = {
  "pro-monthly": "STRIPE_PRICE_PRO_MONTHLY",
  "pro-yearly": "STRIPE_PRICE_PRO_YEARLY",
  "business-monthly": "STRIPE_PRICE_BUSINESS_MONTHLY",
  "business-yearly": "STRIPE_PRICE_BUSINESS_YEARLY",
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const plan = url.searchParams.get("plan") || "";

  // Free plan: go to signup.
  if (plan === "free") {
    return NextResponse.redirect(new URL("/auth/signup", getOrigin(req)));
  }

  // Enterprise: contact (no online checkout).
  if (plan === "enterprise") {
    return NextResponse.redirect("mailto:soporte@verifactu.business");
  }

  const envKey = PLAN_TO_PRICE_ENV[plan];
  if (!envKey) {
    return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
  }

  let stripe: Stripe;
  try {
    stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), { apiVersion: "2024-06-20" });
  } catch (e) {
    return NextResponse.json(
      { error: "Stripe no está configurado" },
      { status: 500 },
    );
  }

  const priceId = process.env[envKey];
  if (!priceId) {
    return NextResponse.json(
      { error: `Falta configurar ${envKey}` },
      { status: 500 },
    );
  }

  const origin = getOrigin(req);
  const successUrl = new URL("/demo", origin);
  successUrl.searchParams.set("checkout", "success");
  const cancelUrl = new URL("/demo#planes", origin);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      // We keep this minimal: the product can be purchased without forcing account creation.
      // Account linking can be added later.
    });

    if (!session.url) {
      return NextResponse.json({ error: "No se pudo iniciar el pago" }, { status: 500 });
    }

    return NextResponse.redirect(session.url);
  } catch (e) {
    return NextResponse.json(
      { error: "No se pudo iniciar el pago" },
      { status: 500 },
    );
  }
}
