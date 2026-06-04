import { createHmac, timingSafeEqual } from 'crypto';

/**
 * OAuth consent proof — HMAC binding del consent screen al usuario + params.
 *
 * Antes el endpoint /oauth/authorize aceptaba `consent_confirmed=1` como un
 * simple flag de URL. Eso permitía replay attack: cualquiera con una cookie
 * de sesión válida podía construir una URL que saltase el consent screen.
 * Ahora el redirect a /oauth/consent incluye `consent_proof = HMAC(uid,
 * client_id, redirect_uri, scope, code_challenge)` firmado con SESSION_SECRET.
 * La página de consent forwardea ese proof intacto al link "Autorizar" y
 * /oauth/authorize lo verifica antes de mintar el authorization code.
 *
 * El binding cubre los 5 valores que NO deben cambiar entre consent y mint:
 * - uid: el usuario que da consent
 * - client_id: la app que recibe el token
 * - redirect_uri: el callback donde llega el code
 * - scope: los permisos solicitados
 * - code_challenge: la prueba PKCE del cliente
 *
 * Archivo aislado del módulo session.ts para que jest no tenga que cargar
 * la dependencia ESM `jose` cuando solo se necesita el HMAC del consent.
 */
export type ConsentProofInput = {
  uid: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
};

export function signConsentProof(input: ConsentProofInput, secret: string): string {
  if (!secret) throw new Error('SESSION_SECRET is required to sign consent proof');
  const data = [
    input.uid,
    input.clientId,
    input.redirectUri,
    input.scope,
    input.codeChallenge,
  ].join('|');
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function verifyConsentProof(
  proof: string | null | undefined,
  input: ConsentProofInput,
  secret: string
): boolean {
  if (!proof || !secret) return false;
  let expected: string;
  try {
    expected = signConsentProof(input, secret);
  } catch {
    return false;
  }
  const a = Buffer.from(proof, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
