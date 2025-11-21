import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  // Gestionar eventos
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const stripeSubscriptionId = session.subscription;
      // Lógica para actualizar la suscripción del usuario en tu BD
      console.log(`Usuario ${userId} ha iniciado la suscripción ${stripeSubscriptionId}`);
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object;
      // Lógica para registrar el pago y conciliar la factura
      console.log(`Factura ${invoice.id} pagada por ${invoice.customer_email}`);
      break;
    }
    // ... otros eventos
  }

  return NextResponse.json({ received: true });
}