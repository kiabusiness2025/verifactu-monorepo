/**
 * EJEMPLOS DE INTEGRACIÓN
 * Cómo usar el sistema de emails en los flujos de autenticación
 */

// ============================================================================
// 1. ENDPOINT DE REGISTRO
// ============================================================================
// Ubicación: apps/landing/app/api/auth/register/route.ts

import { sendVerificationEmail } from '@/lib/email/emailService';

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    // 1. Crear usuario en Firebase
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Generar token de verificación
    const verificationToken = await generateVerificationToken(user.uid);

    // 3. ENVIAR EMAIL DE VERIFICACIÓN
    const emailResult = await sendVerificationEmail({
      email: user.email || '',
      userName: name || email.split('@')[0],
      verificationLink: `${process.env.NEXT_PUBLIC_LANDING_URL}/auth/verify-email?token=${verificationToken}`
    });

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // No fallar el registro, solo loguear
    }

    // 4. Guardar usuario en base de datos
    await saveUserToDatabase({
      uid: user.uid,
      email: user.email,
      name,
      emailVerificationToken: verificationToken,
      emailVerified: false,
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Check your email to verify.',
      uid: user.uid,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 400 }
    );
  }
}

// ============================================================================
// 2. ENDPOINT DE VERIFICACIÓN DE EMAIL
// ============================================================================
// Ubicación: apps/landing/app/api/auth/verify-email/route.ts

import { sendWelcomeEmail } from '@/lib/email/emailService';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    // 1. Verificar token
    const payload = await verifyVerificationToken(token);
    const uid = payload.uid;

    // 2. Marcar email como verificado
    await updateUserInDatabase(uid, { emailVerified: true });

    // 3. Obtener datos del usuario
    const user = await getUserFromDatabase(uid);

    // 4. ENVIAR EMAIL DE BIENVENIDA
    const emailResult = await sendWelcomeEmail({
      userName: user.name || user.email.split('@')[0],
      email: user.email,
      dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    });

    if (!emailResult.success) {
      console.error('Failed to send welcome email:', emailResult.error);
    }

    // 5. Opcionalmente, crear token de sesión
    const idToken = await user.getIdToken(true);
    const sessionResult = await mintSessionCookie(idToken);

    return NextResponse.json({
      success: true,
      message: 'Email verified! Welcome to Verifactu.',
      redirectTo: '/dashboard'
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 400 }
    );
  }
}

// ============================================================================
// 3. ENDPOINT DE RECUPERACIÓN DE CONTRASEÑA
// ============================================================================
// Ubicación: apps/landing/app/api/auth/forgot-password/route.ts

import { sendResetPasswordEmail } from '@/lib/email/emailService';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // 1. Buscar usuario por email
    const user = await getUserByEmail(email);
    if (!user) {
      // Por seguridad, no revelar si existe el email
      return NextResponse.json({
        success: true,
        message: 'If this email exists, you will receive a password reset link.'
      });
    }

    // 2. Generar token de reset
    const resetToken = await generatePasswordResetToken(user.uid, 60); // 60 minutos

    // 3. ENVIAR EMAIL DE RESET
    const emailResult = await sendResetPasswordEmail({
      userName: user.name || email.split('@')[0],
      email: user.email,
      resetLink: `${process.env.NEXT_PUBLIC_LANDING_URL}/auth/reset-password?token=${resetToken}`,
      expiryMinutes: 60
    });

    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset link sent to your email.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 4. ENDPOINT DE CAMBIO DE CONTRASEÑA
// ============================================================================
// Ubicación: apps/landing/app/api/auth/reset-password/route.ts

import { sendPasswordChangedEmail } from '@/lib/email/emailService';

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    // 1. Verificar token de reset
    const payload = await verifyPasswordResetToken(token);
    const uid = payload.uid;

    // 2. Cambiar contraseña en Firebase
    const user = await admin.auth().getUser(uid);
    await admin.auth().updateUser(uid, { password: newPassword });

    // 3. Obtener datos del usuario
    const userData = await getUserFromDatabase(uid);

    // 4. ENVIAR CONFIRMACIÓN DE CAMBIO
    const emailResult = await sendPasswordChangedEmail({
      userName: userData.name || user.email!.split('@')[0],
      email: user.email!,
      dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    });

    if (!emailResult.success) {
      console.error('Failed to send confirmation email:', emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully. You can now login.'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 400 }
    );
  }
}

// ============================================================================
// 5. ENDPOINT DE INVITACIÓN A EQUIPO
// ============================================================================
// Ubicación: apps/landing/app/api/team/invite/route.ts

import { sendTeamInviteEmail } from '@/lib/email/emailService';

export async function POST(req: Request) {
  try {
    const { inviteeEmail, role, companyId } = await req.json();
    const currentUser = await getSessionPayload();

    if (!currentUser?.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Obtener datos de la empresa
    const company = await getCompanyFromDatabase(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // 2. Verificar que el usuario actual es owner/admin
    const isAuthorized = await checkUserCompanyRole(currentUser.uid, companyId, ['owner', 'admin']);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // 3. Crear código de invitación
    const inviteCode = await generateInviteCode(companyId, inviteeEmail, role);

    // 4. ENVIAR EMAIL DE INVITACIÓN
    const emailResult = await sendTeamInviteEmail({
      inviteeEmail,
      inviterName: currentUser.email || 'Verifactu Team',
      companyName: company.name,
      acceptLink: `${process.env.NEXT_PUBLIC_LANDING_URL}/invite/${inviteCode}`,
      role
    });

    if (!emailResult.success) {
      console.error('Failed to send invite email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send invitation email' },
        { status: 500 }
      );
    }

    // 5. Guardar invitación en base de datos
    await saveInvitationToDatabase({
      companyId,
      inviteeEmail,
      role,
      code: inviteCode,
      invitedBy: currentUser.uid,
      status: 'pending'
    });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${inviteeEmail}`
    });
  } catch (error) {
    console.error('Team invite error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 6. ENDPOINT DE ACEPTACIÓN DE INVITACIÓN
// ============================================================================
// Ubicación: apps/landing/app/api/team/accept-invite/route.ts

export async function POST(req: Request) {
  try {
    const { inviteCode, password, email } = await req.json();

    // 1. Verificar código de invitación
    const invite = await getInviteFromDatabase(inviteCode);
    if (!invite || invite.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      );
    }

    // 2. Crear usuario si no existe
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch {
      // Usuario no existe, crear nuevo
      const newUser = await admin.auth().createUser({
        email,
        password,
        emailVerified: true // Ya verificado por la invitación
      });
      user = newUser;
    }

    // 3. Crear membership en la empresa
    await createMembership({
      userId: user.uid,
      companyId: invite.companyId,
      role: invite.role
    });

    // 4. Marcar invitación como aceptada
    await updateInviteStatus(inviteCode, 'accepted');

    // 5. Obtener datos de la empresa
    const company = await getCompanyFromDatabase(invite.companyId);

    // 6. ENVIAR CONFIRMACIÓN DE ACEPTACIÓN (opcional)
    // Puedes crear una plantilla adicional o reutilizar bienvenida

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the company!'
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// ============================================================================
// FUNCIONES AUXILIARES (Implementar según tu lógica)
// ============================================================================

async function generateVerificationToken(uid: string): Promise<string> {
  // Implementar usando JWT o similar
  // Debe incluir uid y expiración de 24h
  const token = await signSessionToken({
    payload: { uid, purpose: 'email-verification', ver: 1 },
    secret: process.env.SESSION_SECRET!,
    expiresIn: '24h'
  });
  return token;
}

async function verifyVerificationToken(token: string): Promise<{ uid: string }> {
  // Verificar JWT y validar que purpose = 'email-verification'
  const payload = await verifySessionToken(token, process.env.SESSION_SECRET!);
  if (!payload || payload.purpose !== 'email-verification') {
    throw new Error('Invalid token');
  }
  return { uid: payload.uid! };
}

async function generatePasswordResetToken(uid: string, expiryMinutes: number): Promise<string> {
  const token = await signSessionToken({
    payload: { uid, purpose: 'password-reset', ver: 1 },
    secret: process.env.SESSION_SECRET!,
    expiresIn: `${expiryMinutes}m`
  });
  return token;
}

async function verifyPasswordResetToken(token: string): Promise<{ uid: string }> {
  const payload = await verifySessionToken(token, process.env.SESSION_SECRET!);
  if (!payload || payload.purpose !== 'password-reset') {
    throw new Error('Invalid token');
  }
  return { uid: payload.uid! };
}

async function generateInviteCode(companyId: string, email: string, role: string): Promise<string> {
  // Generar código único para invitación
  // Considerar usar JWT o UUID
  return `invite_${companyId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * USO RESUMIDO:
 * 
 * 1. Registro:
 *    sendVerificationEmail()
 * 
 * 2. Verificación:
 *    sendWelcomeEmail()
 * 
 * 3. Olvide contraseña:
 *    sendResetPasswordEmail()
 * 
 * 4. Cambio de contraseña:
 *    sendPasswordChangedEmail()
 * 
 * 5. Invitación a equipo:
 *    sendTeamInviteEmail()
 * 
 * Todos retornan:
 * { success: true, messageId: string } o
 * { success: false, error: any }
 */
