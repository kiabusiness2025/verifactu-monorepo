import Stripe from 'stripe';

export const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

export async function getCustomer(customerId: string) {
  try {
    return await stripeClient.customers.retrieve(customerId);
  } catch (error) {
    console.error('Error fetching Stripe customer:', error);
    throw error;
  }
}

export async function listSubscriptions(customerId: string) {
  try {
    return await stripeClient.subscriptions.list({
      customer: customerId,
      status: 'all',
      expand: ['data.default_payment_method'],
    });
  } catch (error) {
    console.error('Error listing subscriptions:', error);
    throw error;
  }
}

export async function getInvoices(customerId: string, limit = 10) {
  try {
    return await stripeClient.invoices.list({
      customer: customerId,
      limit,
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  try {
    return await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
}

export interface SubscriptionMetrics {
  activeSubscriptions: number;
  mrr: number;
  churnRate: number;
  lifetimeValue: number;
}

export async function getSubscriptionMetrics(): Promise<SubscriptionMetrics> {
  try {
    const subscriptions = await stripeClient.subscriptions.list({
      status: 'active',
      limit: 100,
    });

    const activeCount = subscriptions.data.length;
    const mrr = subscriptions.data.reduce((sum, sub) => {
      const amount = sub.items.data[0]?.price.unit_amount || 0;
      return sum + amount / 100;
    }, 0);

    return {
      activeSubscriptions: activeCount,
      mrr,
      churnRate: 0, // TODO: Calculate from historical data
      lifetimeValue: 0, // TODO: Calculate from historical data
    };
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  }
}
