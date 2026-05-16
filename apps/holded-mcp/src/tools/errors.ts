/**
 * Helpers para convertir errores esperados de Holded en respuestas MCP
 * controladas en lugar de propagarlos al error handler global de Express
 * (que devuelve `Internal server error. Reference: <uuid>` — útil para
 * filtrar information disclosure pero inservible para que el modelo
 * entienda qué pasó y guíe al usuario).
 *
 * Paridad con apps/app/lib/integrations/holdedMcpTools.ts (HoldedUserError
 * en el conector ChatGPT) — mismo principio, distinta plataforma.
 */

import { HoldedApiError } from '../holded-client.js';

/**
 * 400 (ID malformado, p. ej. no es un ObjectId válido) y 404 (ID válido pero
 * inexistente) se tratan como el MISMO caso de UX: el recurso no es accesible
 * con este ID. Holded responde 400 para muchos casos donde otras APIs darían
 * 404, por eso ambos cuentan.
 */
export function isHoldedNotFoundError(err: unknown): boolean {
  if (err instanceof HoldedApiError) {
    return err.status === 404 || err.status === 400;
  }
  if (err instanceof Error) {
    return /\b(?:400|404)\b/.test(err.message);
  }
  return false;
}

/**
 * 401 = la API key de Holded fue revocada/regenerada. La conexión completa
 * deja de funcionar; el usuario tiene que reconectar Holded.
 */
export function isHoldedCredentialRevokedError(err: unknown): boolean {
  return err instanceof HoldedApiError && err.status === 401;
}

/**
 * 403 = Holded acepta la API key pero deniega ESTE recurso concreto (módulo
 * no contratado en el plan, p. ej. CRM/bookings). El resto del conector sigue
 * funcionando — no marcar la integración entera como caída.
 */
export function isHoldedModuleForbiddenError(err: unknown): boolean {
  return err instanceof HoldedApiError && err.status === 403;
}

type McpToolResponse = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

function controlledResponse(payload: Record<string, unknown>): McpToolResponse {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    // isError: false → es una respuesta deliberada del tool, no una excepción.
    // Claude la muestra como contenido normal, no como tool execution failure.
    isError: false,
  };
}

export function notFoundResponse(entity: string, id: string): McpToolResponse {
  return controlledResponse({
    error: 'not_found',
    entity,
    id,
    message: `${entity} con id "${id}" no existe en Holded o no es accesible con esta API key.`,
  });
}

export function moduleForbiddenResponse(toolName: string): McpToolResponse {
  return controlledResponse({
    error: 'holded_module_forbidden',
    tool: toolName,
    status: 403,
    message:
      'Holded ha denegado el acceso a este recurso (HTTP 403). Normalmente significa que el plan ' +
      'de Holded conectado no incluye este módulo (por ejemplo CRM o reservas) o que la API key ' +
      'no tiene permiso sobre él. El resto de herramientas del conector siguen funcionando.',
  });
}

export function credentialRevokedResponse(toolName: string): McpToolResponse {
  return controlledResponse({
    error: 'credential_revoked',
    tool: toolName,
    status: 401,
    message:
      'La API key de Holded asociada a esta conexión parece revocada o caducada. ' +
      'Vuelve a autorizar el conector desde Claude → Configuración → Conectores → Holded ' +
      'para introducir una API key nueva.',
  });
}

/**
 * Envuelve un handler de tool MCP para convertir los errores de Holded
 * esperables (400/404 → not_found, 401 → credential_revoked, 403 →
 * holded_module_forbidden) en respuestas MCP controladas. Otros errores
 * propagan al SDK / error handler global como antes.
 *
 * @param toolName         nombre del tool (para logs y para credential/module messages)
 * @param entity           nombre legible del recurso (para not_found message)
 * @param resolveId        función que extrae el ID del args object — se evalúa
 *                         lazy porque no todos los tools usan la misma key
 *                         (`contactId` vs `documentId` vs `projectId` vs ...)
 * @param handler          el handler original del tool
 */
export function withControlledErrors<TArgs extends Record<string, unknown>>(
  toolName: string,
  entity: string,
  resolveId: (args: TArgs) => string,
  handler: (args: TArgs) => Promise<McpToolResponse>
): (args: TArgs) => Promise<McpToolResponse> {
  return async (args) => {
    try {
      return await handler(args);
    } catch (err) {
      if (isHoldedNotFoundError(err)) {
        return notFoundResponse(entity, resolveId(args));
      }
      if (isHoldedCredentialRevokedError(err)) {
        return credentialRevokedResponse(toolName);
      }
      if (isHoldedModuleForbiddenError(err)) {
        return moduleForbiddenResponse(toolName);
      }
      throw err;
    }
  };
}
