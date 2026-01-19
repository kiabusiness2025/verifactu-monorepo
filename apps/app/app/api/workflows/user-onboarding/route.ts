import { NextRequest, NextResponse } from 'next/server';
import { userOnboardingWorkflow, type UserSignupData } from '@/app/workflows';
import { requireAdmin } from '@/lib/adminAuth';

// Force dynamic rendering (uses cookies for admin auth)
export const dynamic = 'force-dynamic';

/**
 * POST /api/workflows/user-onboarding
 * 
 * Dispara el flujo de onboarding de usuario
 * Requiere autenticación de admin
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación de admin
    await requireAdmin(request);

    const body = await request.json();
    const { userId, email, userName } = body as UserSignupData;

    // Validar datos
    if (!userId || !email || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, email, userName' },
        { status: 400 }
      );
    }

    // Disparar workflow
    const result = await userOnboardingWorkflow({
      userId,
      email,
      userName,
    });

    return NextResponse.json({
      success: result.success,
      workflowId: userId,
      status: result.workflowStatus || 'started',
    });
  } catch (error) {
    console.error('Error in userOnboarding workflow:', error);
    return NextResponse.json(
      { error: 'Failed to start onboarding workflow' },
      { status: 500 }
    );
  }
}
