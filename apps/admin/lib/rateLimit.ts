type RateLimitOptions = {
  limit: number;
  windowMs: number;
  keyPrefix?: string;
};

type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; remaining: 0; resetAt: number; retryAfter: number };

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

function getClientId(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export function rateLimit(req: Request, options: RateLimitOptions): RateLimitResult {
  const key = `${options.keyPrefix ?? "default"}:${getClientId(req)}`;
  const now = Date.now();
  const windowMs = Math.max(1000, options.windowMs);
  const limit = Math.max(1, options.limit);
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  existing.count += 1;
  if (existing.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { ok: false, remaining: 0, resetAt: existing.resetAt, retryAfter };
  }

  return { ok: true, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt };
}