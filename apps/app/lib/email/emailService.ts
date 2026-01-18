/**
 * Email Service for App (Next.js)
 * Re-exporta funciones de landing para uso en app
 */

// Las funciones están en landing, las importamos desde allí
export {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendTeamInviteEmail,
  sendCustomEmail
} from '../../../landing/lib/email/emailService';
