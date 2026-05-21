import { prisma } from '@/app/lib/prisma';
import { getValidMicrosoftToken } from './microsoft-oauth';
import {
  listOutlookEvents,
  createOutlookEvent,
  updateOutlookEvent,
  deleteOutlookEvent,
} from './microsoft-calendar';
import { listOneDriveFiles } from './microsoft-drive';
import {
  scanOutlookForInvoices,
  archiveOutlookMessage,
  sendOutlookMail,
  hasMicrosoftSendScope,
} from './microsoft-mail';

export const MICROSOFT_CHAT_TOOLS = [
  {
    name: 'microsoft_check_connection',
    description:
      'Comprueba si el usuario tiene Microsoft 365 (Outlook/OneDrive) conectado y qué servicios tiene autorizados. Úsalo antes de intentar usar otras herramientas de Microsoft.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'microsoft_calendar_list_events',
    description:
      'Lista eventos del Outlook Calendar del usuario. Útil para preguntas como "¿qué reuniones tengo esta semana?", "¿hay algo en el calendario mañana?". Por defecto muestra los próximos 7 días.',
    input_schema: {
      type: 'object',
      properties: {
        startDateTime: {
          type: 'string',
          description: 'Fecha/hora de inicio ISO 8601. Por defecto: ahora.',
        },
        endDateTime: {
          type: 'string',
          description: 'Fecha/hora de fin ISO 8601. Por defecto: 7 días desde ahora.',
        },
        maxResults: {
          type: 'number',
          description: 'Máximo de eventos (default 15, max 50).',
        },
        search: {
          type: 'string',
          description: 'Texto libre para buscar en títulos de eventos.',
        },
      },
    },
  },
  {
    name: 'microsoft_calendar_create_event',
    description:
      'Crea un evento en el Outlook Calendar del usuario. Para eventos con hora usa dateTime ISO 8601 (p.ej. 2026-05-25T10:00:00). Para eventos de día completo pon isAllDay: true con hora 00:00:00.',
    input_schema: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Título del evento.' },
        body: { type: 'string', description: 'Descripción o notas.' },
        startDateTime: { type: 'string', description: 'Fecha y hora de inicio ISO 8601.' },
        endDateTime: { type: 'string', description: 'Fecha y hora de fin ISO 8601.' },
        timeZone: { type: 'string', description: 'Zona horaria. Por defecto Europe/Madrid.' },
        isAllDay: { type: 'boolean', description: 'true si es evento de día completo.' },
        location: { type: 'string', description: 'Lugar del evento.' },
      },
      required: ['subject', 'startDateTime', 'endDateTime'],
    },
  },
  {
    name: 'microsoft_calendar_update_event',
    description:
      'Actualiza un evento de Outlook Calendar. Necesitas el eventId de microsoft_calendar_list_events.',
    input_schema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'ID del evento a actualizar.' },
        subject: { type: 'string', description: 'Nuevo título.' },
        body: { type: 'string', description: 'Nueva descripción.' },
        startDateTime: { type: 'string', description: 'Nueva fecha y hora de inicio ISO 8601.' },
        endDateTime: { type: 'string', description: 'Nueva fecha y hora de fin ISO 8601.' },
        timeZone: { type: 'string', description: 'Zona horaria.' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'microsoft_calendar_delete_event',
    description:
      'Elimina un evento de Outlook Calendar. Confirma con el usuario antes de llamar. Necesitas el eventId.',
    input_schema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'ID del evento a eliminar.' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'microsoft_mail_scan_invoices',
    description:
      'Escanea el Outlook del usuario buscando emails con facturas adjuntas. Devuelve candidatos con remitente, asunto, fecha. Útil para detectar gastos de proveedores no registrados en Holded.',
    input_schema: {
      type: 'object',
      properties: {
        daysBack: { type: 'number', description: 'Días hacia atrás (default 30, max 90).' },
        maxResults: { type: 'number', description: 'Máximo de emails (default 20).' },
      },
    },
  },
  {
    name: 'microsoft_mail_archive',
    description:
      'Archiva un email de Outlook (lo mueve a la carpeta Archivo). Úsalo cuando el usuario confirme que quiere archivar un email procesado. Necesita el messageId.',
    input_schema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'ID del mensaje a archivar.' },
      },
      required: ['messageId'],
    },
  },
  {
    name: 'microsoft_mail_send',
    description:
      'Envía un email desde el Outlook del usuario. Úsalo solo cuando el usuario lo pida explícitamente y confirme remitente, destinatario y contenido.',
    input_schema: {
      type: 'object',
      properties: {
        to: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista de destinatarios (emails).',
        },
        subject: { type: 'string', description: 'Asunto del email.' },
        body: { type: 'string', description: 'Cuerpo del email (texto plano).' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'microsoft_drive_list_files',
    description:
      'Lista los documentos en la carpeta "Isaak — Facturas" de OneDrive del usuario. Útil para ver qué facturas o PDFs están archivados.',
    input_schema: {
      type: 'object',
      properties: {
        maxResults: { type: 'number', description: 'Máximo de archivos (default 20).' },
      },
    },
  },
] as const;

export type MicrosoftToolName = (typeof MICROSOFT_CHAT_TOOLS)[number]['name'];

const MICROSOFT_TOOL_NAMES = new Set<string>(MICROSOFT_CHAT_TOOLS.map((t) => t.name));
export function isMicrosoftToolName(name: string): name is MicrosoftToolName {
  return MICROSOFT_TOOL_NAMES.has(name);
}

type ToolInput = Record<string, unknown>;

export async function executeMicrosoftTool(
  tenantId: string,
  userId: string,
  toolName: MicrosoftToolName,
  input: ToolInput
): Promise<unknown> {
  try {
    switch (toolName) {
      case 'microsoft_check_connection': {
        const token = await prisma.isaakMicrosoftToken
          .findUnique({
            where: { tenantId_userId: { tenantId, userId } },
            select: { scopes: true, email: true, displayName: true, expiresAt: true },
          })
          .catch(() => null);
        if (!token) {
          return {
            connected: false,
            message:
              'Microsoft 365 no está conectado. El usuario debe ir a Workspace > Microsoft para conectar su cuenta.',
          };
        }
        const scopes = token.scopes ?? '';
        return {
          connected: true,
          email: token.email,
          displayName: token.displayName,
          calendar: scopes.includes('Calendars'),
          mail_read: scopes.includes('Mail.Read'),
          mail_send: scopes.includes('Mail.Send'),
          onedrive: scopes.includes('Files'),
          tokenExpiry: token.expiresAt?.toISOString(),
        };
      }

      case 'microsoft_calendar_list_events': {
        const events = await listOutlookEvents(tenantId, userId, {
          startDateTime: input.startDateTime ? String(input.startDateTime) : undefined,
          endDateTime: input.endDateTime ? String(input.endDateTime) : undefined,
          maxResults: typeof input.maxResults === 'number' ? Math.min(input.maxResults, 50) : 15,
          search: input.search ? String(input.search) : undefined,
        });
        return { events, count: events.length };
      }

      case 'microsoft_calendar_create_event': {
        const tz = input.timeZone ? String(input.timeZone) : 'Europe/Madrid';
        const startDt = String(input.startDateTime ?? '');
        const endDt = String(input.endDateTime ?? '');
        if (!startDt || !endDt) {
          return { error: 'missing_dates', message: 'Se necesitan startDateTime y endDateTime.' };
        }
        const created = await createOutlookEvent(tenantId, userId, {
          subject: String(input.subject ?? 'Evento'),
          body: input.body ? String(input.body) : undefined,
          start: { dateTime: startDt, timeZone: tz },
          end: { dateTime: endDt, timeZone: tz },
          isAllDay: input.isAllDay === true,
          location: input.location ? String(input.location) : undefined,
        });
        return created ?? { error: 'create_failed' };
      }

      case 'microsoft_calendar_update_event': {
        const eventId = String(input.eventId ?? '');
        if (!eventId) return { error: 'missing_event_id' };
        const tz = input.timeZone ? String(input.timeZone) : 'Europe/Madrid';
        const patch: Parameters<typeof updateOutlookEvent>[3] = {};
        if (input.subject) patch.subject = String(input.subject);
        if (input.body) patch.body = String(input.body);
        if (input.startDateTime)
          patch.start = { dateTime: String(input.startDateTime), timeZone: tz };
        if (input.endDateTime) patch.end = { dateTime: String(input.endDateTime), timeZone: tz };
        const ok = await updateOutlookEvent(tenantId, userId, eventId, patch);
        return { success: ok };
      }

      case 'microsoft_calendar_delete_event': {
        const eventId = String(input.eventId ?? '');
        if (!eventId) return { error: 'missing_event_id' };
        const ok = await deleteOutlookEvent(tenantId, userId, eventId);
        return { success: ok };
      }

      case 'microsoft_mail_scan_invoices': {
        const result = await scanOutlookForInvoices(tenantId, userId, {
          daysBack: typeof input.daysBack === 'number' ? Math.min(input.daysBack, 90) : 30,
          maxResults: typeof input.maxResults === 'number' ? input.maxResults : 20,
        });
        return result;
      }

      case 'microsoft_mail_archive': {
        const messageId = String(input.messageId ?? '');
        if (!messageId) return { error: 'missing_message_id' };
        const ok = await archiveOutlookMessage(tenantId, userId, messageId);
        return { success: ok };
      }

      case 'microsoft_mail_send': {
        const canSend = await hasMicrosoftSendScope(tenantId, userId);
        if (!canSend) {
          return {
            error: 'insufficient_scope',
            message: 'El token no incluye permiso Mail.Send. El usuario debe reconectar Microsoft.',
          };
        }
        const to = Array.isArray(input.to) ? (input.to as string[]) : [];
        if (to.length === 0) return { error: 'missing_recipients' };
        const ok = await sendOutlookMail(tenantId, userId, {
          to,
          subject: String(input.subject ?? ''),
          body: String(input.body ?? ''),
        });
        return { success: ok };
      }

      case 'microsoft_drive_list_files': {
        const files = await listOneDriveFiles(tenantId, userId, {
          maxResults: typeof input.maxResults === 'number' ? input.maxResults : 20,
        });
        return { files, count: files.length };
      }

      default:
        return { error: 'unknown_tool' };
    }
  } catch (err) {
    return {
      error: 'tool_execution_failed',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
