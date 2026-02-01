/**
 * GET /api/app/me
 *
 * Returns the authenticated user with their companies and memberships.
 * This endpoint:
 * 1. Verifies the Firebase ID token from Authorization header
 * 2. Gets or creates the user in SQL database (single source of truth)
 * 3. Returns user data with companies owned and memberships
 *
 * Used by the client dashboard to authenticate and load user context.
 */

import {
  getOrCreateSqlUserFromFirebase,
  getUserWithCompanies,
  verifyFirebaseToken,
} from '@/lib/auth/firebase';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Verify Firebase token
    const authHeader = request.headers.get('authorization');
    const { uid, email, name } = await verifyFirebaseToken(authHeader);

    // 2. Get or create SQL user (upsert strategy)
    const user = await getOrCreateSqlUserFromFirebase(uid, email, name);

    // 3. Get user with companies and memberships
    const userWithCompanies = await getUserWithCompanies(user.id);

    if (!userWithCompanies) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 4. Return user data
    return NextResponse.json({
      user: {
        id: userWithCompanies.id,
        email: userWithCompanies.email,
        name: userWithCompanies.name,
        image: userWithCompanies.image,
        role: userWithCompanies.role,
        emailVerified: userWithCompanies.emailVerified,
      },
      companiesOwned: userWithCompanies.companiesOwned,
      memberships: userWithCompanies.memberships.map(
        (m: (typeof userWithCompanies.memberships)[number]) => ({
        id: m.id,
        role: m.role,
        company: m.company,
      })
      ),
    });
  } catch (error) {
    console.error('[/api/app/me] Error:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
