/**
 * Workflows de Verifactu
 * 
 * Conjunto de flujos de trabajo duraderos para:
 * - Onboarding de usuarios
 * - Procesamiento de emails entrantes
 * - Gestión de tickets de soporte
 * - Notificaciones automáticas
 * 
 * Cada workflow es observable, reanudable y confiable
 */

export { userOnboardingWorkflow, emailProcessingWorkflow } from './user-onboarding';
export type { UserSignupData } from './user-onboarding';

export { supportTicketWorkflow, adminNotificationWorkflow } from './support-tickets';
export type { SupportTicketData } from './support-tickets';

export {
  sendWelcomeEmail,
  processIncomingEmail,
  sendAutoReplyEmail,
  sendFollowUpEmail,
  updateEmailStatus,
} from './email-steps';
