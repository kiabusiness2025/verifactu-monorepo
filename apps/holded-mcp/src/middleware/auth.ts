import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { verifyAccessToken, TokenRecord } from '../auth.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

// Extendemos el tipo Request para que TypeScript conozca holdedRecord
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      holdedRecord?: TokenRecord;
    }
  }
}

// ── Auth middleware ──────────────────────────────────────────────────────────

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'unauthorized',
      error_description: 'Se requiere Bearer token',
    });
    return;
  }

  const token = authHeader.slice(7);
  const record = await verifyAccessToken(token);

  if (!record) {
    res.status(401).json({
      error: 'invalid_token',
      error_description: 'Token inválido o expirado',
    });
    return;
  }

  req.holdedRecord = record;
  next();
}

// ── Rate limiting por IP ─────────────────────────────────────────────────────

export const apiRateLimit = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'rate_limit_exceeded',
      error_description: 'Demasiadas peticiones, espera un momento',
    });
  },
});

// ── Request logger ───────────────────────────────────────────────────────────

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  logger.debug(`${req.method} ${req.path}`);
  next();
}
