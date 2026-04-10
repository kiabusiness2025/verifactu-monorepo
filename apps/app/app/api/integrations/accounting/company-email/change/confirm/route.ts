import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@verifactu/utils';
import {
  consumeCompanyNotificationEmailChangeRequest,
  upsertConfirmedCompanyNotificationEmail,
} from '@/lib/integrations/companyNotificationEmailStore';

export const runtime = 'nodejs';

function buildRedirect(status: string) {
  const target = new URL('/dashboard', getAppUrl());
  target.searchParams.set('company_email_change', status);
  return target;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(buildRedirect('missing'));
  }

  const changeRequest = await consumeCompanyNotificationEmailChangeRequest(token);
  if (!changeRequest?.tenantId || !changeRequest.requestedEmail) {
    return NextResponse.redirect(buildRedirect('invalid'));
  }

  await upsertConfirmedCompanyNotificationEmail({
    tenantId: changeRequest.tenantId,
    email: changeRequest.requestedEmail,
    verifiedAt: new Date(),
  });

  return NextResponse.redirect(buildRedirect('confirmed'));
}
