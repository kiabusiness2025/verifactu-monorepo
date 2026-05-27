// SEC C5 — tests del HMAC write token.

import {
  isWriteTokenEnforced,
  issueWriteToken,
  verifyWriteToken,
} from '../isaak-write-token';

const ORIGINAL_SECRET = process.env.WRITE_TOKEN_SECRET;
const ORIGINAL_SESSION_SECRET = process.env.SESSION_SECRET;
const ORIGINAL_ENFORCED = process.env.ISAAK_WRITES_REQUIRE_TOKEN;

beforeAll(() => {
  process.env.WRITE_TOKEN_SECRET = 'test-write-secret-32-bytes-long-1234567890';
});

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.WRITE_TOKEN_SECRET;
  else process.env.WRITE_TOKEN_SECRET = ORIGINAL_SECRET;
  if (ORIGINAL_SESSION_SECRET === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = ORIGINAL_SESSION_SECRET;
  if (ORIGINAL_ENFORCED === undefined) delete process.env.ISAAK_WRITES_REQUIRE_TOKEN;
  else process.env.ISAAK_WRITES_REQUIRE_TOKEN = ORIGINAL_ENFORCED;
});

describe('isWriteTokenEnforced', () => {
  it('lee ISAAK_WRITES_REQUIRE_TOKEN === "true"', () => {
    process.env.ISAAK_WRITES_REQUIRE_TOKEN = 'true';
    expect(isWriteTokenEnforced()).toBe(true);
  });
  it('false por defecto si no está seteado o no es exactamente "true"', () => {
    process.env.ISAAK_WRITES_REQUIRE_TOKEN = 'false';
    expect(isWriteTokenEnforced()).toBe(false);
    process.env.ISAAK_WRITES_REQUIRE_TOKEN = '1';
    expect(isWriteTokenEnforced()).toBe(false);
    delete process.env.ISAAK_WRITES_REQUIRE_TOKEN;
    expect(isWriteTokenEnforced()).toBe(false);
  });
});

describe('issueWriteToken', () => {
  it('emite un token con dos partes separadas por punto', () => {
    const r = issueWriteToken({ userId: 'u1', tenantId: 't1' });
    expect(r).not.toBeNull();
    expect(r!.token.split('.')).toHaveLength(2);
  });

  it('expiresAt es ~1h en el futuro', () => {
    const r = issueWriteToken({ userId: 'u1', tenantId: 't1' });
    const diff = r!.expiresAt - Date.now();
    expect(diff).toBeGreaterThan(59 * 60 * 1000);
    expect(diff).toBeLessThanOrEqual(60 * 60 * 1000 + 100);
  });

  it('devuelve null sin secret', () => {
    delete process.env.WRITE_TOKEN_SECRET;
    delete process.env.SESSION_SECRET;
    expect(issueWriteToken({ userId: 'u', tenantId: 't' })).toBeNull();
    process.env.WRITE_TOKEN_SECRET = 'test-write-secret-32-bytes-long-1234567890';
  });

  it('devuelve null si falta userId o tenantId', () => {
    expect(issueWriteToken({ userId: '', tenantId: 't' })).toBeNull();
    expect(issueWriteToken({ userId: 'u', tenantId: '' })).toBeNull();
  });

  it('fallback a SESSION_SECRET si no hay WRITE_TOKEN_SECRET', () => {
    delete process.env.WRITE_TOKEN_SECRET;
    process.env.SESSION_SECRET = 'fallback-session-secret-32-bytes-1234567';
    const r = issueWriteToken({ userId: 'u', tenantId: 't' });
    expect(r).not.toBeNull();
    process.env.WRITE_TOKEN_SECRET = 'test-write-secret-32-bytes-long-1234567890';
  });
});

describe('verifyWriteToken', () => {
  it('happy path: token recién emitido es válido', () => {
    const r = issueWriteToken({ userId: 'u1', tenantId: 't1' })!;
    const v = verifyWriteToken(r.token, { userId: 'u1', tenantId: 't1' });
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.payload.userId).toBe('u1');
      expect(v.payload.tenantId).toBe('t1');
    }
  });

  it('token con userId mismatch → reason=mismatch', () => {
    const r = issueWriteToken({ userId: 'u1', tenantId: 't1' })!;
    const v = verifyWriteToken(r.token, { userId: 'OTHER', tenantId: 't1' });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('mismatch');
  });

  it('token con tenantId mismatch → reason=mismatch', () => {
    const r = issueWriteToken({ userId: 'u1', tenantId: 't1' })!;
    const v = verifyWriteToken(r.token, { userId: 'u1', tenantId: 'OTHER' });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('mismatch');
  });

  it('firma alterada → reason=signature', () => {
    const r = issueWriteToken({ userId: 'u1', tenantId: 't1' })!;
    const tampered = `${r.token.split('.')[0]}.deadbeef00000000`;
    const v = verifyWriteToken(tampered, { userId: 'u1', tenantId: 't1' });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('signature');
  });

  it('token con expiración pasada → reason=expired', async () => {
    const r = issueWriteToken({ userId: 'u1', tenantId: 't1' })!;
    // Manipular el payload para hacer que expire en el pasado, manteniendo
    // una firma "válida" (probamos que la verificación del expiresAt corre
    // ANTES del check de match, y depende de signature válida). Hacemos
    // un token nuevo manipulando antes de firmar.
    // Truco: emitimos uno legítimo y monkeypatch Date.now temporalmente.
    const origNow = Date.now;
    Date.now = () => origNow.call(Date) + 2 * 60 * 60 * 1000; // +2h
    const v = verifyWriteToken(r.token, { userId: 'u1', tenantId: 't1' });
    Date.now = origNow;
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('expired');
  });

  it('token malformed → reason=malformed', () => {
    expect(verifyWriteToken('not-a-token', { userId: 'u', tenantId: 't' }).ok).toBe(false);
    expect(verifyWriteToken('', { userId: 'u', tenantId: 't' }).ok).toBe(false);
    expect(verifyWriteToken('.sig-only', { userId: 'u', tenantId: 't' }).ok).toBe(false);
  });
});

describe('verifyWriteToken — protege contra reuso cross-user/tenant', () => {
  it('token de userA NO es válido para userB aunque mismo tenant', () => {
    const t = issueWriteToken({ userId: 'A', tenantId: 'T' })!;
    expect(verifyWriteToken(t.token, { userId: 'B', tenantId: 'T' }).ok).toBe(false);
  });

  it('token de tenantA NO es válido para tenantB aunque mismo user', () => {
    const t = issueWriteToken({ userId: 'U', tenantId: 'A' })!;
    expect(verifyWriteToken(t.token, { userId: 'U', tenantId: 'B' }).ok).toBe(false);
  });
});
