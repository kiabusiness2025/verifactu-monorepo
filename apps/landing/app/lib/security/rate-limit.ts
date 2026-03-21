type RateLimitInput = {
  key: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

const memoryStore = new Map<string, { count: number; expiresAt: number }>();

function cleanupMemoryStore(now: number) {
  if (memoryStore.size < 5000) return;
  for (const [k, v] of memoryStore.entries()) {
    if (v.expiresAt <= now) memoryStore.delete(k);
  }
}

function memoryRateLimit(input: RateLimitInput): RateLimitResult {
  const now = Date.now();
  cleanupMemoryStore(now);

  const expiresAt = now + input.windowSeconds * 1000;
  const current = memoryStore.get(input.key);

  if (!current || current.expiresAt <= now) {
    memoryStore.set(input.key, { count: 1, expiresAt });
    return {
      allowed: true,
      retryAfterSeconds: input.windowSeconds,
      remaining: Math.max(input.limit - 1, 0),
    };
  }

  if (current.count >= input.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(Math.ceil((current.expiresAt - now) / 1000), 1),
      remaining: 0,
    };
  }

  current.count += 1;
  return {
    allowed: true,
    retryAfterSeconds: Math.max(Math.ceil((current.expiresAt - now) / 1000), 1),
    remaining: Math.max(input.limit - current.count, 0),
  };
}

async function kvRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const baseUrl = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!baseUrl || !token) {
    return memoryRateLimit(input);
  }

  const key = encodeURIComponent(`rl:${input.key}`);
  const headers = { Authorization: `Bearer ${token}` };

  try {
    const incrResp = await fetch(`${baseUrl}/incr/${key}`, {
      method: 'POST',
      headers,
      cache: 'no-store',
    });
    if (!incrResp.ok) {
      return memoryRateLimit(input);
    }

    const incrJson = (await incrResp.json()) as { result?: number };
    const count = Number(incrJson.result ?? 0);

    if (count === 1) {
      await fetch(`${baseUrl}/expire/${key}/${input.windowSeconds}`, {
        method: 'POST',
        headers,
        cache: 'no-store',
      });
    }

    if (count > input.limit) {
      return {
        allowed: false,
        retryAfterSeconds: input.windowSeconds,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      retryAfterSeconds: input.windowSeconds,
      remaining: Math.max(input.limit - count, 0),
    };
  } catch {
    // Fallback local para no dejar el endpoint sin protección.
    return memoryRateLimit(input);
  }
}

export async function checkRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  return kvRateLimit(input);
}

export function getRequestIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  return 'unknown';
}
