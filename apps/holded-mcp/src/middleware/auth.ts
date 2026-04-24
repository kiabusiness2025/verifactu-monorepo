import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { TokenRecord, verifyAccessToken } from '../auth.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

const WWW_AUTH = `Bearer realm="${config.BASE_URL}", resource_metadata="${config.BASE_URL}/.well-known/oauth-protected-resource"`;

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      holdedRecord?: TokenRecord;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.set('WWW-Authenticate', WWW_AUTH);
    res.status(401).json({
      error: 'unauthorized',
      error_description: 'Se requiere Bearer token',
    });
    return;
  }

  const token = authHeader.slice(7);
  const record = await verifyAccessToken(token);

  if (!record) {
    res.set('WWW-Authenticate', `${WWW_AUTH}, error="invalid_token"`);
    res.status(401).json({
      error: 'invalid_token',
      error_description: 'Token invalido o expirado',
    });
    return;
  }

  req.holdedRecord = record;
  next();
}

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

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  logger.debug(`${req.method} ${req.path}`);
  next();
}
