import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

const DEFAULT_ALLOWED_ORIGINS = ['https://claude.ai', 'https://app.claude.ai'];
const DEFAULT_ALLOWED_HEADERS = [
  'Authorization',
  'Content-Type',
  'Mcp-Session-Id',
  'Mcp-Protocol-Version',
  'Last-Event-ID',
];
const DEFAULT_EXPOSED_HEADERS = ['WWW-Authenticate', 'Mcp-Session-Id', 'Mcp-Protocol-Version'];
const DEFAULT_ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS', 'DELETE'];

function buildAllowedOrigins() {
  const configured = (config.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set([...DEFAULT_ALLOWED_ORIGINS, new URL(config.BASE_URL).origin, ...configured]);
}

const allowedOrigins = buildAllowedOrigins();

function applyCorsHeaders(req: Request, res: Response) {
  const origin = req.get('origin');
  if (!origin || !allowedOrigins.has(origin)) {
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', DEFAULT_ALLOWED_METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', DEFAULT_ALLOWED_HEADERS.join(', '));
  res.setHeader('Access-Control-Expose-Headers', DEFAULT_EXPOSED_HEADERS.join(', '));
  res.setHeader('Access-Control-Max-Age', '86400');

  return true;
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const allowedOrigin = applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    if (!req.get('origin')) {
      res.status(204).end();
      return;
    }

    if (!allowedOrigin) {
      res.status(403).json({ error: 'cors_origin_not_allowed' });
      return;
    }

    res.status(204).end();
    return;
  }

  next();
}
