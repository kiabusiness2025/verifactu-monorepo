import { NextResponse } from "next/server";
import Stripe from "stripe";
import { normalizeInput, invoiceTierKey, movementTierKey, type PricingInput } from "../../lib/pricing/calc";

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

// Calculator-based checkout logic
function calculatePriceItems(input: PricingInput) {
  const normalized = normalizeInput(input);
  const items: { price: string; quantity?: number }[] = [];

  // Base (always)
  const basePrice = process.env.STRIPE_PRICE_BASE_MONTHLY;
  if (!basePrice) throw new Error("Missing STRIPE_PRICE_BASE_MONTHLY");
  items.push({ price: basePrice });

  // Extra companies (desde la 2ª)
  if (normalized.companies > 1) {
    const companyPrice = process.env.STRIPE_PRICE_COMPANY_UNIT_MONTHLY;
    if (!companyPrice) throw new Error("Missing STRIPE_PRICE_COMPANY_UNIT_MONTHLY");
    items.push({ price: companyPrice, quantity: normalized.companies - 1 });
  }

  // Invoices tier add-on
  const invoiceTier = invoiceTierKey(normalized.invoices);
  if (invoiceTier) {
    const p = process.env[`STRIPE_PRICE_${invoiceTier}`];
    if (p) items.push({ price: p });
  }

  // Movements tier add-on (solo si banking habilitado)
  if (normalized.bankingEnabled) {
    const movTier = movementTierKey(normalized.movements);
    if (movTier) {
      const p = process.env[`STRIPE_PRICE_${movTier}`];
      if (p) items.push({ price: p });
    }
  }

  return items;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "";

  // Calculator mode (nuevo)
  if (type === "calculator") {
    const companies = parseInt(url.searchParams.get("companies") || "1");
    const invoices = parseInt(url.searchParams.get("invoices") || "1");
    const movements = parseInt(url.searchParams.get("movements") || "0");
    const bankingEnabled = url.searchParams.get("bankingEnabled") === "true";

    const input: PricingInput = { companies, invoices, movements, bankingEnabled };

    let stripe: Stripe;
    try {
      stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), { apiVersion: "2024-06-20" });
    } catch (e) {
      return NextResponse.json({ error: "Stripe no configurado" }, { status: 500 });
    }

    try {
      const line_items = calculatePriceItems(input);

      const origin = getOrigin(req);
      const successUrl = new URL("/demo", origin);
      successUrl.searchParams.set("checkout", "success");
      const cancelUrl = new URL("/", origin);

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items,
        success_url: successUrl.toString(),
        cancel_url: cancelUrl.toString(),
        subscription_data: {
          trial_period_days: 30,
          metadata: {
            companies: companies.toString(),
            invoices: invoices.toString(),
            movements: movements.toString(),
            bankingEnabled: bankingEnabled.toString(),
          },
        },
      });

      if (!session.url) {
        return NextResponse.json({ error: "No se pudo iniciar el pago" }, { status: 500 });
      }

      return NextResponse.redirect(session.url);
    } catch (e) {
      console.error("Stripe checkout error:", e);
      return NextResponse.json({ error: "Error al crear sesión de pago" }, { status: 500 });
    }
  }

  // Legacy mode (planes fijos, mantener por compatibilidad si es necesario)
  return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
}
