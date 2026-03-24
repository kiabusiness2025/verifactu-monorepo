import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { readSessionSecret } from '@/app/lib/session';

const SESSION_COOKIE_NAME = '__session';

function getAppUrl(env = process.env.NEXT_PUBLIC_APP_URL) {
  const fallback = 'https://app.verifactu.business';
  const candidate = (env || fallback).trim();

  try {
    const parsed = new URL(candidate);
    const allowedHosts = new Set([
      'app.verifactu.business',
      'client.verifactu.business',
      'localhost',
      '127.0.0.1',
    ]);
    if (!allowedHosts.has(parsed.hostname)) {
      return fallback;
    }
    return parsed.origin;
  } catch {
    return fallback;
  }
}

async function verifySessionToken(token: string, secret: string) {
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload as { uid?: string; email?: string | null };
  } catch {
    return null;
  }
}

type PlanId =
  | 'isaak_fiscal'
  | 'isaak_fiscal_yearly'
  | 'isaak_migraciones'
  | 'isaak_migraciones_yearly';

const PLAN_TO_PRICE_ENV: Record<PlanId, string[]> = {
  isaak_fiscal: ['STRIPE_PRICE_HOLDED_FISCAL_MONTHLY'],
  isaak_fiscal_yearly: ['STRIPE_PRICE_HOLDED_FISCAL_YEARLY'],
  isaak_migraciones: ['STRIPE_PRICE_HOLDED_MIGRACIONES_MONTHLY'],
  isaak_migraciones_yearly: ['STRIPE_PRICE_HOLDED_MIGRACIONES_YEARLY'],
};

const HOLDED_PLAN_TRIAL_DAYS: Partial<Record<PlanId, number>> = {
  isaak_fiscal: 30,
  isaak_fiscal_yearly: 30,
};

const PLAN_ALIASES: Record<string, PlanId> = {
  isaak_fiscal: 'isaak_fiscal',
  holded_fiscal: 'isaak_fiscal',
  isaak_fiscal_yearly: 'isaak_fiscal_yearly',
  holded_fiscal_yearly: 'isaak_fiscal_yearly',
  isaak_migraciones: 'isaak_migraciones',
  holded_migraciones: 'isaak_migraciones',
  isaak_migraciones_yearly: 'isaak_migraciones_yearly',
  holded_migraciones_yearly: 'isaak_migraciones_yearly',
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

async function getUserFromSession(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  if (!match) return null;

  const token = decodeURIComponent(match[1]);
  try {
    const secret = readSessionSecret();
    const payload = await verifySessionToken(token, secret);
    return {
      uid: payload?.uid || '',
      email: payload?.email || null,
    };
  } catch {
    return null;
  }
}

function parsePlanFromQuery(req: Request): PlanId | null {
  const raw = new URL(req.url).searchParams.get('plan');
  if (!raw) return null;
  return PLAN_ALIASES[raw.toLowerCase()] ?? null;
}

function getCancelUrl() {
  const defaultBase = 'https://holded.verifactu.business';
  const configuredBase = process.env.HOLDED_PUBLIC_URL || defaultBase;
  return new URL('/planes', configuredBase).toString();
}

function getOnboardingUrl() {
  const appUrl = getAppUrl();
  const holdedPublicUrl = (
    process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business'
  ).replace(/\/$/, '');
  const chatUrl = new URL('/planes', appUrl).toString();
  const loginUrl = new URL('/auth/holded', holdedPublicUrl);
  loginUrl.searchParams.set('source', 'holded_checkout');
  loginUrl.searchParams.set('next', chatUrl);
  return loginUrl.toString();
}

async function createPlanCheckoutSessionUrl(
  plan: PlanId,
  user: { uid: string; email: string | null }
) {
  const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'), { apiVersion: '2024-06-20' });
  const envCandidates = PLAN_TO_PRICE_ENV[plan];
  const priceId = envCandidates.map((name) => process.env[name]).find(Boolean);

  if (!priceId) {
    throw new Error(`Missing env var ${envCandidates.join(' or ')}`);
  }

  const successUrl = new URL('/planes', getAppUrl());
  successUrl.searchParams.set('checkout', 'success');
  successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');

  const trialDays = HOLDED_PLAN_TRIAL_DAYS[plan];

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    locale: 'es',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl.toString(),
    cancel_url: getCancelUrl(),
    client_reference_id: user.uid,
    customer_email: user.email ?? undefined,
    payment_method_collection: 'if_required',
    subscription_data: {
      ...(trialDays ? { trial_period_days: trialDays } : {}),
      metadata: {
        verifactu_pricing: 'holded-plans-v1',
        plan,
        uid: user.uid,
      },
    },
    customer_creation: 'always',
    metadata: {
      verifactu_pricing: 'holded-plans-v1',
      plan,
      uid: user.uid,
    },
  });

  if (!session.url) {
    throw new Error('Stripe session without url');
  }

  return session.url;
}

export async function GET(req: Request) {
  const plan = parsePlanFromQuery(req);
  if (!plan) {
    return NextResponse.redirect(getCancelUrl());
  }

  const user = await getUserFromSession(req);
  if (!user?.uid) {
    return NextResponse.redirect(getOnboardingUrl());
  }

  try {
    const sessionUrl = await createPlanCheckoutSessionUrl(plan, user);
    return NextResponse.redirect(sessionUrl);
  } catch {
    return NextResponse.redirect(getCancelUrl());
  }
}
