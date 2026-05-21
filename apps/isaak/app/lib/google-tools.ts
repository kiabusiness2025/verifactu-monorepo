import {
  getValidAccessToken,
  listCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from './google-calendar';
import { listDriveFiles } from './google-drive';
import {
  scanGmailForInvoices,
  archiveGmailMessage,
  hasGmailModifyScope,
} from './gmail-scan-service';
import { prisma } from '@/app/lib/prisma';

export const GOOGLE_CHAT_TOOLS = [
  {
    name: 'google_check_connection',
    description:
      'Comprueba si el usuario tiene Google conectado y qué servicios tiene autorizados (Calendar, Gmail, Drive). Úsalo antes de intentar usar otras herramientas de Google si no estás seguro de si está conectado.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'google_calendar_list_events',
    description:
      'Lista eventos del Google Calendar del usuario. Útil para responder preguntas como "¿qué tengo esta semana?", "¿hay alguna reunión mañana?", o "¿cuándo es mi próxima cita?". Por defecto muestra los próximos 7 días.',
    input_schema: {
      type: 'object',
      properties: {
        timeMin: {
          type: 'string',
          description: 'Fecha/hora de inicio en formato ISO 8601. Por defecto: ahora.',
        },
        timeMax: {
          type: 'string',
          description: 'Fecha/hora de fin en formato ISO 8601. Por defecto: 7 días desde ahora.',
        },
        maxResults: {
          type: 'number',
          description: 'Máximo de eventos a devolver (default 15, max 50).',
        },
        q: {
          type: 'string',
          description: 'Texto libre para buscar en títulos y descripciones de eventos.',
        },
      },
    },
  },
  {
    name: 'google_calendar_create_event',
    description:
      'Crea un evento en el Google Calendar del usuario. Úsalo cuando el usuario pida crear una reunión, cita, recordatorio o cualquier evento. Para fechas sin hora usa el campo date (YYYY-MM-DD); para eventos con hora usa dateTime (ISO 8601).',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Título del evento.' },
        description: { type: 'string', description: 'Descripción o notas adicionales.' },
        startDate: {
          type: 'string',
          description: 'Fecha de inicio sin hora: YYYY-MM-DD (para eventos de día completo).',
        },
        startDateTime: {
          type: 'string',
          description: 'Fecha y hora de inicio ISO 8601 (p.ej. 2026-05-25T10:00:00+02:00).',
        },
        endDate: { type: 'string', description: 'Fecha de fin sin hora: YYYY-MM-DD.' },
        endDateTime: {
          type: 'string',
          description: 'Fecha y hora de fin ISO 8601.',
        },
        timeZone: {
          type: 'string',
          description: 'Zona horaria (p.ej. Europe/Madrid). Por defecto Europe/Madrid.',
        },
      },
      required: ['summary'],
    },
  },
  {
    name: 'google_calendar_update_event',
    description:
      'Actualiza el título, descripción o fecha/hora de un evento existente en Google Calendar. Necesitas el eventId que obtienes de google_calendar_list_events.',
    input_schema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'ID del evento a actualizar.' },
        summary: { type: 'string', description: 'Nuevo título del evento.' },
        description: { type: 'string', description: 'Nueva descripción.' },
        startDate: { type: 'string', description: 'Nueva fecha de inicio sin hora: YYYY-MM-DD.' },
        startDateTime: { type: 'string', description: 'Nueva fecha y hora de inicio ISO 8601.' },
        endDate: { type: 'string', description: 'Nueva fecha de fin sin hora: YYYY-MM-DD.' },
        endDateTime: { type: 'string', description: 'Nueva fecha y hora de fin ISO 8601.' },
        timeZone: { type: 'string', description: 'Zona horaria.' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'google_calendar_delete_event',
    description:
      'Elimina un evento del Google Calendar del usuario. Necesitas el eventId que obtienes de google_calendar_list_events. Confirma con el usuario antes de llamar a esta herramienta.',
    input_schema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'ID del evento a eliminar.' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'google_gmail_scan_invoices',
    description:
      'Escanea el Gmail del usuario en busca de emails con facturas o documentos de pago adjuntos. Devuelve una lista de candidatos con remitente, asunto, fecha y si parece una factura. Útil para detectar gastos no registrados en Holded.',
    input_schema: {
      type: 'object',
      properties: {
        daysBack: {
          type: 'number',
          description: 'Cuántos días hacia atrás buscar (default 30, max 90).',
        },
        maxResults: {
          type: 'number',
          description: 'Máximo de emails a devolver (default 20).',
        },
        forceRefresh: {
          type: 'boolean',
          description: 'Forzar nueva búsqueda ignorando caché de 10 minutos.',
        },
      },
    },
  },
  {
    name: 'google_gmail_archive',
    description:
      'Archiva un email de Gmail (lo elimina del buzón de entrada sin borrarlo). Úsalo cuando el usuario confirme que quiere archivar un email procesado. Necesita el messageId de google_gmail_scan_invoices.',
    input_schema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'ID del mensaje de Gmail a archivar.' },
      },
      required: ['messageId'],
    },
  },
  {
    name: 'google_drive_list_files',
    description:
      'Lista los documentos guardados en la carpeta "Isaak — Facturas" de Google Drive del usuario. Útil para saber qué facturas o PDFs ya han sido archivados.',
    input_schema: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'number',
          description: 'Máximo de archivos a devolver (default 20).',
        },
      },
    },
  },
] as const;

export type GoogleToolName = (typeof GOOGLE_CHAT_TOOLS)[number]['name'];

const GOOGLE_TOOL_NAMES = new Set<string>(GOOGLE_CHAT_TOOLS.map((t) => t.name));
export function isGoogleToolName(name: string): name is GoogleToolName {
  return GOOGLE_TOOL_NAMES.has(name);
}

type ToolInput = Record<string, unknown>;

export async function executeGoogleTool(
  tenantId: string,
  userId: string,
  toolName: GoogleToolName,
  input: ToolInput
): Promise<unknown> {
  try {
    switch (toolName) {
      case 'google_check_connection': {
        const token = await prisma.isaakGoogleToken
          .findUnique({
            where: { tenantId_userId: { tenantId, userId } },
            select: { scopes: true, email: true, expiresAt: true },
          })
          .catch(() => null);
        if (!token) {
          return {
            connected: false,
            message:
              'Google no está conectado. El usuario debe ir a Workspace > Google para conectar su cuenta.',
          };
        }
        const scopes = token.scopes ?? '';
        return {
          connected: true,
          email: token.email,
          calendar: scopes.includes('calendar.events'),
          gmail_read: scopes.includes('gmail.readonly') || scopes.includes('gmail.modify'),
          gmail_modify: scopes.includes('gmail.modify'),
          drive: scopes.includes('drive.file') || scopes.includes('drive'),
          tokenExpiry: token.expiresAt?.toISOString(),
        };
      }

      case 'google_calendar_list_events': {
        const accessToken = await getValidAccessToken(tenantId, userId);
        if (!accessToken) return { error: 'google_not_connected' };
        const defaultMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const events = await listCalendarEvents(accessToken, {
          timeMin: input.timeMin ? String(input.timeMin) : undefined,
          timeMax: input.timeMax ? String(input.timeMax) : defaultMax,
          maxResults: typeof input.maxResults === 'number' ? Math.min(input.maxResults, 50) : 15,
          q: input.q ? String(input.q) : undefined,
        });
        return { events, count: events.length };
      }

      case 'google_calendar_create_event': {
        const accessToken = await getValidAccessToken(tenantId, userId);
        if (!accessToken) return { error: 'google_not_connected' };
        const tz = input.timeZone ? String(input.timeZone) : 'Europe/Madrid';
        const start = input.startDateTime
          ? { dateTime: String(input.startDateTime), timeZone: tz }
          : input.startDate
            ? { date: String(input.startDate) }
            : null;
        const end = input.endDateTime
          ? { dateTime: String(input.endDateTime), timeZone: tz }
          : input.endDate
            ? { date: String(input.endDate) }
            : null;
        if (!start || !end) {
          return {
            error: 'missing_dates',
            message: 'Se necesitan startDate/startDateTime y endDate/endDateTime.',
          };
        }
        const created = await createCalendarEvent(accessToken, {
          summary: String(input.summary ?? 'Evento'),
          description: input.description ? String(input.description) : undefined,
          start,
          end,
        });
        return created ?? { error: 'create_failed' };
      }

      case 'google_calendar_update_event': {
        const accessToken = await getValidAccessToken(tenantId, userId);
        if (!accessToken) return { error: 'google_not_connected' };
        const eventId = String(input.eventId ?? '');
        if (!eventId) return { error: 'missing_event_id' };
        const tz = input.timeZone ? String(input.timeZone) : 'Europe/Madrid';
        const patch: Record<string, unknown> = {};
        if (input.summary) patch.summary = String(input.summary);
        if (input.description) patch.description = String(input.description);
        if (input.startDateTime)
          patch.start = { dateTime: String(input.startDateTime), timeZone: tz };
        else if (input.startDate) patch.start = { date: String(input.startDate) };
        if (input.endDateTime) patch.end = { dateTime: String(input.endDateTime), timeZone: tz };
        else if (input.endDate) patch.end = { date: String(input.endDate) };
        const ok = await updateCalendarEvent(accessToken, eventId, patch);
        return { success: ok };
      }

      case 'google_calendar_delete_event': {
        const accessToken = await getValidAccessToken(tenantId, userId);
        if (!accessToken) return { error: 'google_not_connected' };
        const eventId = String(input.eventId ?? '');
        if (!eventId) return { error: 'missing_event_id' };
        const ok = await deleteCalendarEvent(accessToken, eventId);
        return { success: ok };
      }

      case 'google_gmail_scan_invoices': {
        const result = await scanGmailForInvoices(tenantId, userId, {
          daysBack: typeof input.daysBack === 'number' ? Math.min(input.daysBack, 90) : 30,
          maxResults: typeof input.maxResults === 'number' ? input.maxResults : 20,
          forceRefresh: input.forceRefresh === true,
        });
        return result;
      }

      case 'google_gmail_archive': {
        const canModify = await hasGmailModifyScope(tenantId, userId);
        if (!canModify) {
          return {
            error: 'insufficient_scope',
            message:
              'El token actual solo tiene acceso de lectura a Gmail. El usuario debe reconectar Google desde Workspace > Google para obtener permisos de modificación.',
          };
        }
        const messageId = String(input.messageId ?? '');
        if (!messageId) return { error: 'missing_message_id' };
        const ok = await archiveGmailMessage(tenantId, userId, messageId);
        return { success: ok };
      }

      case 'google_drive_list_files': {
        const files = await listDriveFiles(tenantId, userId, {
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
