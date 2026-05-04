import { createHash, createSign, randomBytes } from 'crypto';
import { prisma } from '@/app/lib/prisma';

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

function getVapidKeys() {
  return {
    publicKey: process.env.VAPID_PUBLIC_KEY ?? '',
    privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
    subject: process.env.VAPID_SUBJECT ?? 'mailto:soporte@verifactu.business',
  };
}

function base64UrlDecode(str: string): Buffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padding), 'base64');
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function buildVapidJwt(audience: string): Promise<string> {
  const { publicKey, privateKey, subject } = getVapidKeys();
  const header = base64UrlEncode(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = base64UrlEncode(
    Buffer.from(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 43200,
        sub: subject,
      })
    )
  );
  const signingInput = `${header}.${payload}`;

  // Build PEM from raw VAPID private key (P-256)
  const rawPrivate = base64UrlDecode(privateKey);
  const rawPublic = base64UrlDecode(publicKey);
  // ECPrivateKey DER for P-256 with public key
  const ecPrivateDer = Buffer.concat([
    Buffer.from('308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b0201010420', 'hex'),
    rawPrivate,
    Buffer.from('a144034200', 'hex'),
    rawPublic,
  ]);
  const pem = `-----BEGIN EC PRIVATE KEY-----\n${ecPrivateDer
    .toString('base64')
    .match(/.{1,64}/g)!
    .join('\n')}\n-----END EC PRIVATE KEY-----`;

  const sign = createSign('SHA256');
  sign.update(signingInput);
  const derSig = sign.sign({ key: pem, dsaEncoding: 'der' });

  // Convert DER-encoded ECDSA signature to raw r||s for JWT
  let offset = 2;
  const rLen = derSig[3];
  const r = derSig.subarray(4, 4 + rLen);
  offset = 4 + rLen + 1;
  const sLen = derSig[offset];
  const s = derSig.subarray(offset + 1, offset + 1 + sLen);
  const pad32 = (b: Buffer) => {
    const out = Buffer.alloc(32);
    b.copy(out, 32 - b.length);
    return out;
  };
  const sig = base64UrlEncode(Buffer.concat([pad32(r), pad32(s)]));
  return `${signingInput}.${sig}`;
}

async function buildEncryptedPayload(
  _subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string
): Promise<{ body: Buffer; salt: string; serverPublicKey: string }> {
  // Simplified: return plain payload for now (full encryption requires WebCrypto ECDH)
  // Real-world: use web-push package or implement RFC 8291
  const salt = randomBytes(16);
  return {
    body: Buffer.from(payload, 'utf-8'),
    salt: base64UrlEncode(salt),
    serverPublicKey: getVapidKeys().publicKey,
  };
}

export async function sendPushToTenant(tenantId: string, payload: PushPayload): Promise<number> {
  const { publicKey } = getVapidKeys();
  if (!publicKey) return 0;

  type PushSub = { endpoint: string; p256dh: string; auth: string };
  const subs: PushSub[] = await prisma.isaakPushSubscription
    .findMany({ where: { tenantId }, select: { endpoint: true, p256dh: true, auth: true } })
    .catch(() => []);

  let sent = 0;
  for (const sub of subs) {
    try {
      const audience = new URL(sub.endpoint).origin;
      const jwt = await buildVapidJwt(audience);
      const vapidAuth = `vapid t=${jwt},k=${publicKey}`;
      const body = JSON.stringify(payload);

      const res = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          Authorization: vapidAuth,
          'Content-Type': 'application/json',
          'Content-Length': String(Buffer.byteLength(body)),
          TTL: '86400',
        },
        body,
      });

      if (res.status === 410 || res.status === 404) {
        await prisma.isaakPushSubscription
          .delete({ where: { endpoint: sub.endpoint } })
          .catch(() => null);
      } else if (res.ok || res.status === 201) {
        sent++;
      }
    } catch {
      /* ignore per-subscription errors */
    }
  }
  return sent;
}

// Mark for future use
void buildEncryptedPayload;
void createHash;
