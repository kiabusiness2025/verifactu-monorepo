import { NextRequest, NextResponse } from 'next/server';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendResetPasswordEmail,
  sendPasswordChangedEmail,
  sendTeamInviteEmail
} from '@/lib/email/emailService';

/**
 * Endpoint de testing para probar todos los flujos de email en local
 * Solo disponible en desarrollo
 */

export async function POST(request: NextRequest) {
  // Solo permitir en desarrollo
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoint not available in production' },
      { status: 403 }
    );
  }

  try {
    const { emailType, testEmail } = await request.json();

    if (!testEmail) {
      return NextResponse.json(
        { error: 'testEmail is required' },
        { status: 400 }
      );
    }

    console.log(`[📧 TEST] Sending ${emailType || 'all'} email(s) to ${testEmail}`);

    const results: any = {};

    // Si no se especifica tipo, enviar todos
    const emailTypes = emailType ? [emailType] : [
      'verification',
      'welcome',
      'password-reset',
      'password-changed',
      'team-invite'
    ];

    for (const type of emailTypes) {
      try {
        let result;

        switch (type) {
          case 'verification':
            result = await sendVerificationEmail({
              email: testEmail,
              userName: 'Usuario Test',
              verificationLink: `http://localhost:3000/verify?token=test_token_12345`
            });
            break;

          case 'welcome':
            result = await sendWelcomeEmail({
              email: testEmail,
              userName: 'Usuario Test',
              dashboardLink: 'http://localhost:3000/dashboard'
            });
            break;

          case 'password-reset':
            result = await sendResetPasswordEmail({
              email: testEmail,
              userName: 'Usuario Test',
              resetLink: `http://localhost:3000/reset-password?token=reset_token_12345`
            });
            break;

          case 'password-changed':
            result = await sendPasswordChangedEmail({
              email: testEmail,
              userName: 'Usuario Test',
              dashboardLink: 'http://localhost:3000/dashboard'
            });
            break;

          case 'team-invite':
            result = await sendTeamInviteEmail({
              inviteeEmail: testEmail,
              inviterName: 'Admin Test',
              companyName: 'Empresa Demo S.L.',
              acceptLink: `http://localhost:3000/accept-invite?token=invite_token_12345`,
              role: 'Contador'
            });
            break;

          default:
            result = { success: false, error: 'Unknown email type' };
        }

        results[type] = result;
        console.log(`[✅ TEST] ${type}:`, result.success ? 'Sent' : 'Failed');

      } catch (error) {
        console.error(`[❌ TEST] ${type}:`, error);
        results[type] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Resumen
    const successful = Object.values(results).filter((r: any) => r.success).length;
    const total = Object.keys(results).length;

    return NextResponse.json({
      success: successful > 0,
      message: `${successful}/${total} emails sent successfully`,
      results,
      testEmail
    });

  } catch (error) {
    console.error('[❌ TEST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET para mostrar info de qué emails se pueden probar
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoint not available in production' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    message: 'Email Testing Endpoint',
    availableTests: [
      {
        type: 'verification',
        description: 'Email de verificación de cuenta',
        trigger: 'POST con { emailType: "verification", testEmail: "..." }'
      },
      {
        type: 'welcome',
        description: 'Email de bienvenida después de verificar',
        trigger: 'POST con { emailType: "welcome", testEmail: "..." }'
      },
      {
        type: 'password-reset',
        description: 'Email de recuperación de contraseña',
        trigger: 'POST con { emailType: "password-reset", testEmail: "..." }'
      },
      {
        type: 'password-changed',
        description: 'Email de confirmación de cambio de contraseña',
        trigger: 'POST con { emailType: "password-changed", testEmail: "..." }'
      },
      {
        type: 'team-invite',
        description: 'Email de invitación a equipo',
        trigger: 'POST con { emailType: "team-invite", testEmail: "..." }'
      },
      {
        type: 'all',
        description: 'Enviar todos los emails de prueba',
        trigger: 'POST con { testEmail: "..." } (sin emailType)'
      }
    ],
    example: {
      method: 'POST',
      url: 'http://localhost:3000/api/test/emails',
      body: {
        emailType: 'verification',
        testEmail: 'expertestudiospro@gmail.com'
      }
    }
  });
}
