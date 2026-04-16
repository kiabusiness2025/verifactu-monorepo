import { NextRequest, NextResponse } from 'next/server';
import { buildProfileOnboardingUrl, sanitizeHoldedReturnTarget } from '@/app/lib/holded-navigation';
import { prisma } from '@/app/lib/prisma';
import { verifyCompanyEmailVerificationToken } from '@/app/lib/company-email-verification';

export const runtime = 'nodejs';

function readQueryString(url: URL, key: string) {
  const value = url.searchParams.get(key);
  return value?.trim() || null;
}

function appendFlag(target: string, key: string, value: string) {
  try {
    const parsed = new URL(target);
    parsed.searchParams.set(key, value);
    return parsed.toString();
  } catch {
    const separator = target.includes('?') ? '&' : '?';
    return `${target}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = readQueryString(url, 'token');
  const fallbackNext = buildProfileOnboardingUrl('holded_company_email_verify');
  const next = sanitizeHoldedReturnTarget(readQueryString(url, 'next') || undefined, fallbackNext);

  if (!token) {
    return NextResponse.redirect(appendFlag(next, 'company_email_verification', 'invalid'));
  }

  const payload = verifyCompanyEmailVerificationToken(token);
  if (!payload) {
    return NextResponse.redirect(appendFlag(next, 'company_email_verification', 'invalid'));
  }

  await prisma.tenantProfile.upsert({
    where: { tenantId: payload.tenantId },
    create: {
      tenantId: payload.tenantId,
      source: 'manual',
      email: payload.email,
    },
    update: {
      email: payload.email,
    },
  });

  return NextResponse.redirect(appendFlag(next, 'company_email_verification', 'verified'));
}
