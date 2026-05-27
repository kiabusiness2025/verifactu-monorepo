// SEC C5 (2026) — Token de autorización de escrituras vía chat.
//
// Anteriormente `allowWrites` se decidía por un LLM clasificador a partir
// del mensaje del usuario, lo que abría prompt-injection persistente:
// un mensaje malicioso podía convencer al clasificador, y el judge
// (segunda línea, también LLM) residía en el mismo plano de confianza.
//
// Solución defensa-en-profundidad:
//   1. UI muestra un toggle explícito "permitir acciones de escritura".
//   2. Cuando el usuario lo activa, el cliente pide GET /api/chat/write-token.
//   3. Backend devuelve un token HMAC-SHA256 firmado con WRITE_TOKEN_SECRET
//      que incluye userId + tenantId + expiración (1h).
//   4. En cada turn del chat el cliente incluye el token en el body.
//   5. El backend valida HMAC + expiración antes de habilitar writes.
//   6. El judge LLM sigue ejecutándose como segunda línea, no se elimina.
//
// El env ISAAK_WRITES_REQUIRE_TOKEN controla el rollout:
//   * 'false' (default por compat): comportamiento legacy + warn.
//   * 'true':                       writes solo con token válido.

import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
const TOKEN_SCOPE = 'chat:writes';

function getSecret(): string | null {
  // Fallback al SESSION_SECRET solo si no hay WRITE_TOKEN_SECRET (rollout
  // gradual). En producción, WRITE_TOKEN_SECRET debe ser un secreto
  // independiente — siguiendo la recomendación SEC M1 de no derivar
  // claves de SESSION_SECRET.
  return process.env.WRITE_TOKEN_SECRET || process.env.SESSION_SECRET || null;
}

export type WriteTokenInput = {
  userId: string;
  tenantId: string;
};

export type WriteTokenPayload = WriteTokenInput & {
  expiresAt: number; // epoch ms
};

export function isWriteTokenEnforced(): boolean {
  return process.env.ISAAK_WRITES_REQUIRE_TOKEN === 'true';
}

// ─── Issue ─────────────────────────────────────────────────────────────

export function issueWriteToken(input: WriteTokenInput): {
  token: string;
  expiresAt: number;
} | null {
  const secret = getSecret();
  if (!secret) return null;
  if (!input.userId || !input.tenantId) return null;
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload: WriteTokenPayload = { ...input, expiresAt };
  const payloadStr = serializePayload(payload);
  const sig = createHmac('sha256', secret).update(payloadStr).digest('hex');
  return {
    token: `${Buffer.from(payloadStr, 'utf-8').toString('base64url')}.${sig}`,
    expiresAt,
  };
}

// ─── Verify ────────────────────────────────────────────────────────────

export type WriteTokenVerifyResult =
  | { ok: true; payload: WriteTokenPayload }
  | { ok: false; reason: 'malformed' | 'expired' | 'signature' | 'mismatch' };

export function verifyWriteToken(
  token: string,
  expected: WriteTokenInput,
): WriteTokenVerifyResult {
  const secret = getSecret();
  if (!secret) return { ok: false, reason: 'signature' };
  if (typeof token !== 'string' || !token) return { ok: false, reason: 'malformed' };
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0) return { ok: false, reason: 'malformed' };
  const payloadB64 = token.slice(0, dotIdx);
  const givenSig = token.slice(dotIdx + 1);

  let payloadStr: string;
  try {
    payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  let payload: WriteTokenPayload;
  try {
    payload = JSON.parse(payloadStr) as WriteTokenPayload;
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (
    typeof payload.userId !== 'string' ||
    typeof payload.tenantId !== 'string' ||
    typeof payload.expiresAt !== 'number'
  ) {
    return { ok: false, reason: 'malformed' };
  }

  const expectedSig = createHmac('sha256', secret).update(payloadStr).digest('hex');
  const a = Buffer.from(expectedSig, 'hex');
  const b = Buffer.from(givenSig, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'signature' };
  }

  if (payload.expiresAt < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  // El token solo es válido para el (userId, tenantId) que lo emitió.
  // Esto impide reusar un token entre sesiones o entre tenants.
  if (payload.userId !== expected.userId || payload.tenantId !== expected.tenantId) {
    return { ok: false, reason: 'mismatch' };
  }

  return { ok: true, payload };
}

function serializePayload(p: WriteTokenPayload): string {
  // JSON canónico (mismo orden de campos siempre) para que la firma
  // sea reproducible y predecible.
  return JSON.stringify({
    scope: TOKEN_SCOPE,
    userId: p.userId,
    tenantId: p.tenantId,
    expiresAt: p.expiresAt,
  });
}
