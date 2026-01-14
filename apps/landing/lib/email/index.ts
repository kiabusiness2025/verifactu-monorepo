// Email service exports
export { sendVerificationEmail } from './emailService';
export { sendWelcomeEmail } from './emailService';
export { sendResetPasswordEmail } from './emailService';
export { sendPasswordChangedEmail } from './emailService';
export { sendTeamInviteEmail } from './emailService';
export { sendCustomEmail } from './emailService';

// Templates
export { VerifyEmailTemplate } from '../../emails/VerifyEmail';
export { WelcomeEmailTemplate } from '../../emails/WelcomeEmail';
export { ResetPasswordEmailTemplate } from '../../emails/ResetPasswordEmail';
export { PasswordChangedEmailTemplate } from '../../emails/PasswordChangedEmail';
export { TeamInviteEmailTemplate } from '../../emails/TeamInviteEmail';
