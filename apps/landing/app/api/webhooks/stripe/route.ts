import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: Request) {
  if (!webhookSecret) {
    console.error("⚠️ STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("⚠️ Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("✅ Checkout completed:", {
        id: session.id,
        customer: session.customer,
        subscription: session.subscription,
        metadata: session.subscription_data?.metadata,
      });

      // TODO: Save subscription to database
      // - customer_id
      // - subscription_id
      // - metadata (companies, invoices, movements)
      // - trial_end

      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("🔄 Subscription updated:", {
        id: subscription.id,
        status: subscription.status,
        trial_end: subscription.trial_end,
      });

      // TODO: Update subscription status in database
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("❌ Subscription deleted:", {
        id: subscription.id,
      });

      // TODO: Mark subscription as cancelled in database
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log("💰 Payment succeeded:", {
        id: invoice.id,
        customer: invoice.customer,
        subscription: invoice.subscription,
        amount: invoice.amount_paid / 100,
      });

      // TODO: Record payment in database
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log("⚠️ Payment failed:", {
        id: invoice.id,
        customer: invoice.customer,
      });

      // TODO: Notify user of payment failure
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
