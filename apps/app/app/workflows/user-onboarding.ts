/**
 * Workflow: Onboarding completo de nuevo usuario
 * 
 * Este flujo se ejecuta cuando un usuario se registra:
 * 1. Envía email de bienvenida inmediatamente
 * 2. Pausa 7 días sin consumir recursos
 * 3. Envía email de seguimiento
 * 
 * Es duradero, reanudable y observable
 */

import { sleep } from 'workflow';
import {
  sendWelcomeEmail,
  sendFollowUpEmail,
  updateEmailStatus,
} from './email-steps';

export interface UserSignupData {
  userId: string;
  email: string;
  userName: string;
}

/**
 * Workflow principal: Onboarding de usuario
 * Marca: "use workflow"
 */
export async function userOnboardingWorkflow(data: UserSignupData) {
  "use workflow";

  try {
    // Step 1: Enviar email de bienvenida inmediatamente
    const welcomeResult = await sendWelcomeEmail(data.email, data.userName);
    
    if (!welcomeResult.success) {
      throw new Error('Failed to send welcome email');
    }

    // Step 2: Pausar 7 días sin consumir recursos
    // En Vercel/Workflow, esto es instantáneo después de registrar la pausa
    await sleep('7 days');

    // Step 3: Enviar email de seguimiento
    const followUpResult = await sendFollowUpEmail(
      data.email,
      '¿Cómo va tu experiencia con Verifactu?',
      `
        <h2>Hola ${data.userName},</h2>
        <p>Ha pasado una semana desde que te uniste a Verifactu.</p>
        <p>¿Cómo ha sido tu experiencia hasta ahora?</p>
        <p>Si tienes preguntas o necesitas ayuda, no dudes en escribirnos.</p>
        <p>¡Estamos aquí para apoyarte!</p>
      `
    );

    if (!followUpResult.success) {
      throw new Error('Failed to send follow-up email');
    }

    return {
      success: true,
      userId: data.userId,
      workflowStatus: 'completed',
      emailsSent: 2,
    };
  } catch (error) {
    return {
      success: false,
      userId: data.userId,
      error: String(error),
    };
  }
}

/**
 * Workflow: Procesamiento de emails entrantes
 * Ejecuta con durabilidad reintentos automáticos
 */
export async function emailProcessingWorkflow(emailData: {
  from: string;
  subject: string;
  text: string;
  html?: string;
  messageId: string;
}) {
  "use workflow";

  try {
    // Step 1: Procesar y guardar el email
    const processResult = await updateEmailStatus(1, 'read');
    
    // Step 2: Enviar auto-respuesta
    const nameMatch = emailData.from.match(/^([^<]+)/);
    const senderName = nameMatch ? nameMatch[1].trim() : 'Usuario';

    const autoReplyResult = await sendFollowUpEmail(
      emailData.from,
      `Re: ${emailData.subject}`,
      `
        <p>Hola ${senderName},</p>
        <p>Recibimos tu mensaje sobre: <strong>${emailData.subject}</strong></p>
        <p>Nuestro equipo está revisando tu solicitud y te responderemos pronto.</p>
      `
    );

    return {
      success: true,
      messageId: emailData.messageId,
      processed: true,
      autoReply: autoReplyResult.success,
    };
  } catch (error) {
    return {
      success: false,
      messageId: emailData.messageId,
      error: String(error),
    };
  }
}
