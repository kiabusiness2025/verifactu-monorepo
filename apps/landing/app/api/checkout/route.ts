import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  estimateNetEur,
  invoiceTierKey,
  movementTierKey,
  normalizeInput,
} from '../../lib/pricing/calc';
import { verifySessionToken, readSessionSecret, SESSION_COOKIE_NAME } from '@verifactu/utils';
import { getLandingUrl, getAppUrl } from '@verifactu/utils';

type PlanId = 'basico' | 'pyme' | 'empresa' | 'pro';

const PLAN_TO_PRICE_ENV: Record<PlanId, string[]> = {
  basico: ['STRIPE_PRICE_PLAN_BASICO_MONTHLY', 'STRIPE_PRICE_BASICO_MONTHLY'],
  pyme: ['STRIPE_PRICE_PLAN_PYME_MONTHLY'],
  empresa: ['STRIPE_PRICE_PLAN_EMPRESA_MONTHLY'],
  pro: ['STRIPE_PRICE_PLAN_PRO_MONTHLY'],
};

const PLAN_ALIASES: Record<string, PlanId> = {
  basic: 'basico',
  basico: 'basico',
  pyme: 'pyme',
  empresa: 'empresa',
  enterprise: 'empresa',
  pro: 'pro',
};

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

async function getUserFromSession(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  if (!m) return null;

  const token = decodeURIComponent(m[1]);
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

function parseInputFromQuery(req: Request) {
  const url = new URL(req.url);
  const invoicesRaw = url.searchParams.get('invoices');
  const movementsRaw = url.searchParams.get('movements');
  const bankingEnabledRaw = url.searchParams.get('bankingEnabled');

  if (!invoicesRaw && !movementsRaw && !bankingEnabledRaw) {
    return null;
  }

  return {
    invoices: Number(invoicesRaw ?? 1),
    movements: Number(movementsRaw ?? 0),
    bankingEnabled: bankingEnabledRaw === 'true',
  };
}

function parsePlanFromQuery(req: Request): PlanId | null {
  const raw = new URL(req.url).searchParams.get('plan');
  if (!raw) return null;
  return PLAN_ALIASES[raw.toLowerCase()] ?? null;
}

function validateInputLimits(input: {
  invoices: number;
  movements: number;
  bankingEnabled: boolean;
}) {
  if (input.invoices > 1000) {
    return {
      ok: false as const,
      payload: { error: 'Presupuesto requerido', code: 'QUOTE_REQUIRED', redirect: '/presupuesto' },
    };
  }

  if (input.bankingEnabled && input.movements > 2000) {
    return {
      ok: false as const,
      payload: { error: 'Presupuesto requerido', code: 'QUOTE_REQUIRED', redirect: '/presupuesto' },
    };
  }

  return { ok: true as const };
}

async function createCheckoutSessionUrl(
  input: { invoices: number; movements: number; bankingEnabled: boolean },
  user: { uid: string; email: string | null }
) {
  const normalized = normalizeInput(input);
  const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'), { apiVersion: '2024-06-20' });

  const basePrice = requireEnv('STRIPE_PRICE_BASE_MONTHLY');
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: basePrice, quantity: 1 },
  ];

  const invTier = invoiceTierKey(normalized.invoices);
  if (invTier) {
    const priceId = requireEnv(`STRIPE_PRICE_${invTier}`);
    line_items.push({ price: priceId, quantity: 1 });
  }

  const movTier = normalized.bankingEnabled ? movementTierKey(normalized.movements) : null;
  if (movTier) {
    const priceId = requireEnv(`STRIPE_PRICE_${movTier}`);
    line_items.push({ price: priceId, quantity: 1 });
  }

  const successUrl = new URL('/dashboard', getAppUrl());
  successUrl.searchParams.set('checkout', 'success');
  successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');

  const cancelUrl = new URL('/#planes', getLandingUrl());
  const estimated = estimateNetEur(normalized);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    locale: 'es',
    line_items,
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
    client_reference_id: user.uid,
    customer_email: user.email ?? undefined,
    payment_method_collection: 'if_required',
    subscription_data: {
      trial_period_days: 30,
      metadata: {
        verifactu_pricing: 'calculator-v1',
        uid: user.uid,
        invoices: String(normalized.invoices),
        movements: String(normalized.movements),
        bankingEnabled: String(normalized.bankingEnabled),
        estimated_net_eur: String(estimated),
      },
    },
    customer_creation: 'always',
    metadata: {
      verifactu_pricing: 'calculator-v1',
      uid: user.uid,
      estimated_net_eur: String(estimated),
    },
  });

  if (!session.url) {
    throw new Error('Stripe session without url');
  }

  return session.url;
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

  const successUrl = new URL('/dashboard', getAppUrl());
  successUrl.searchParams.set('checkout', 'success');
  successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');

  const cancelUrl = new URL('/#planes', getLandingUrl());

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    locale: 'es',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
    client_reference_id: user.uid,
    customer_email: user.email ?? undefined,
    payment_method_collection: 'if_required',
    subscription_data: {
      trial_period_days: 30,
      metadata: {
        verifactu_pricing: 'landing-plans-v1',
        plan,
        uid: user.uid,
      },
    },
    customer_creation: 'always',
    metadata: {
      verifactu_pricing: 'landing-plans-v1',
      plan,
      uid: user.uid,
    },
  });

  if (!session.url) {
    throw new Error('Stripe session without url');
  }

  return session.url;
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body invalido' }, { status: 400 });
  }

  const rawPlan = typeof body?.plan === 'string' ? body.plan.toLowerCase() : null;
  const plan = rawPlan ? (PLAN_ALIASES[rawPlan] ?? null) : null;

  const input = {
    invoices: Number(body?.invoices ?? 1),
    movements: Number(body?.movements ?? 0),
    bankingEnabled: !!body?.bankingEnabled,
  };

  const user = await getUserFromSession(req);
  if (!user?.uid) {
    return NextResponse.json({ error: 'Necesitas iniciar sesión' }, { status: 401 });
  }

  try {
    if (plan) {
      const url = await createPlanCheckoutSessionUrl(plan, user);
      return NextResponse.json({ url });
    }

    const limitValidation = validateInputLimits(input);
    if (!limitValidation.ok) {
      return NextResponse.json(limitValidation.payload, { status: 400 });
    }

    const url = await createCheckoutSessionUrl(input, user);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: 'No se pudo iniciar el pago' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const plan = parsePlanFromQuery(req);
  if (plan) {
    const user = await getUserFromSession(req);
    if (!user?.uid) {
      const loginUrl = new URL('/auth/signup', getLandingUrl());
      loginUrl.searchParams.set('next', new URL(req.url).pathname + new URL(req.url).search);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const sessionUrl = await createPlanCheckoutSessionUrl(plan, user);
      return NextResponse.redirect(sessionUrl);
    } catch {
      return NextResponse.redirect(new URL('/planes', getLandingUrl()));
    }
  }

  const input = parseInputFromQuery(req);
  if (!input) {
    return NextResponse.redirect(new URL('/#planes', getLandingUrl()));
  }

  const limitValidation = validateInputLimits(input);
  if (!limitValidation.ok) {
    return NextResponse.redirect(new URL(limitValidation.payload.redirect, getLandingUrl()));
  }

  const user = await getUserFromSession(req);
  if (!user?.uid) {
    const loginUrl = new URL('/auth/signup', getLandingUrl());
    loginUrl.searchParams.set('next', new URL(req.url).pathname + new URL(req.url).search);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const sessionUrl = await createCheckoutSessionUrl(input, user);
    return NextResponse.redirect(sessionUrl);
  } catch {
    return NextResponse.redirect(new URL('/#planes', getLandingUrl()));
  }
}
