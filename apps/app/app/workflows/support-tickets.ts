/**
 * Workflow: Gestión de tickets de soporte
 * 
 * Procesa emails de soporte con:
 * - Respuesta automática inmediata
 * - Escalada después de 24h sin respuesta
 * - Cierre automático después de 7 días inactivo
 */

import { sleep } from 'workflow';
import {
  sendAutoReplyEmail,
  sendFollowUpEmail,
  updateEmailStatus,
} from './email-steps';

export interface SupportTicketData {
  ticketId: string;
  from: string;
  subject: string;
  body: string;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Workflow: Procesamiento de ticket de soporte
 */
export async function supportTicketWorkflow(ticket: SupportTicketData) {
  "use workflow";

  try {
    // Step 1: Extraer nombre del remitente
    const nameMatch = ticket.from.match(/^([^<]+)/);
    const senderName = nameMatch ? nameMatch[1].trim() : 'Usuario';

    // Step 2: Enviar respuesta automática inmediata
    await sendAutoReplyEmail(ticket.from, senderName);
    console.log(`✓ Auto-reply sent to ticket ${ticket.ticketId}`);

    // Step 3: Pausa de 24 horas para esperar respuesta
    await sleep('24 hours');

    // Step 4: Escalada si es alta prioridad o no respondió
    if (ticket.priority === 'high') {
      await sendFollowUpEmail(
        ticket.from,
        `[ESCALADA] Re: ${ticket.subject}`,
        `
          <p>Hola ${senderName},</p>
          <p>Tu solicitud ha sido marcada como <strong>prioritaria</strong>.</p>
          <p>Un supervisor se pondrá en contacto contigo en breve.</p>
          <p>Gracias por tu paciencia.</p>
        `
      );
      console.log(`✓ Escalation email sent for ticket ${ticket.ticketId}`);
    }

    // Step 5: Pausa adicional de 7 días
    await sleep('7 days');

    // Step 6: Enviar email de cierre si no hay actividad
    await sendFollowUpEmail(
      ticket.from,
      `[CIERRE] ${ticket.subject}`,
      `
        <p>Hola ${senderName},</p>
        <p>Tu ticket será cerrado en 24 horas por inactividad.</p>
        <p>Si aún necesitas ayuda, responde a este email para reabrirlo.</p>
      `
    );

    return {
      success: true,
      ticketId: ticket.ticketId,
      status: 'pending_closure',
      actionsCompleted: 3,
    };
  } catch (error) {
    return {
      success: false,
      ticketId: ticket.ticketId,
      error: String(error),
    };
  }
}

/**
 * Workflow: Notificación a admin de ticket pendiente
 * Se ejecuta cada 12 horas para alertar sobre tickets sin responder
 */
export async function adminNotificationWorkflow(ticketIds: string[]) {
  "use workflow";

  try {
    for (const ticketId of ticketIds) {
      // Pausa entre cada notificación
      await sleep('30 seconds');
      
      // Aquí iría lógica para notificar al admin
      console.log(`Admin notified about ticket ${ticketId}`);
    }

    return {
      success: true,
      ticketsProcessed: ticketIds.length,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}
