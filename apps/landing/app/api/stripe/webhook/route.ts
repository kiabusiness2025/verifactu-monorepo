import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export async function POST(req: Request) {
  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), { apiVersion: "2024-06-20" });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handlers para cada tipo de evento
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// Handler: Checkout completado (inicio de trial o pago inicial)
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("✅ Checkout completed", {
    id: session.id,
    customer: session.customer,
    subscription: session.subscription,
    email: session.customer_details?.email,
    metadata: session.metadata,
  });

  // TODO: Guardar en base de datos:
  // - Crear/actualizar usuario con customer_id y subscription_id
  // - Enviar email de bienvenida
  // - Activar acceso a la app
}

// Handler: Suscripción creada (después del checkout)
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log("🆕 Subscription created", {
    id: subscription.id,
    customer: subscription.customer,
    status: subscription.status,
    trial_end: subscription.trial_end,
    current_period_end: subscription.current_period_end,
    items: subscription.items.data.map(item => ({
      price: item.price.id,
      quantity: item.quantity,
    })),
  });

  // TODO: Guardar en base de datos:
  // - UPDATE users SET subscription_id = X, status = 'trialing'|'active'
  // - Si está en trial, programar email recordatorio 3 días antes
}

// Handler: Suscripción actualizada (cambio de plan, renovación, etc.)
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("🔄 Subscription updated", {
    id: subscription.id,
    customer: subscription.customer,
    status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_end: subscription.current_period_end,
    items: subscription.items.data.map(item => ({
      price: item.price.id,
      quantity: item.quantity,
    })),
  });

  // TODO: Actualizar en base de datos:
  // - UPDATE users SET status = subscription.status
  // - Si cancel_at_period_end = true, mostrar mensaje en app
  // - Si cambió de plan, actualizar límites de uso
}

// Handler: Suscripción cancelada o expirada
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("❌ Subscription deleted", {
    id: subscription.id,
    customer: subscription.customer,
    status: subscription.status,
    ended_at: subscription.ended_at,
  });

  // TODO: Actualizar en base de datos:
  // - UPDATE users SET status = 'canceled', subscription_id = NULL
  // - Enviar email de despedida / encuesta
  // - Restringir acceso a funcionalidades premium
  // - Mantener datos históricos read-only por X días
}

// Handler: Pago exitoso (renovación mensual)
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log("💰 Invoice payment succeeded", {
    id: invoice.id,
    customer: invoice.customer,
    subscription: invoice.subscription,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
  });

  // TODO: 
  // - Enviar email de recibo
  // - Extender periodo de acceso
  // - Registrar transacción en billing_history
}

// Handler: Pago fallido (tarjeta rechazada, fondos insuficientes)
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("⚠️ Invoice payment failed", {
    id: invoice.id,
    customer: invoice.customer,
    subscription: invoice.subscription,
    amount_due: invoice.amount_due,
    attempt_count: invoice.attempt_count,
  });

  // TODO:
  // - Enviar email urgente pidiendo actualizar método de pago
  // - Si es el 3er intento fallido, suspender cuenta
  // - Mostrar banner en app con call to action
}
