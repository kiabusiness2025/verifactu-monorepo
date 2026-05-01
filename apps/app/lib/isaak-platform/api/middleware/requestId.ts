import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';

const HEADER = 'x-verifactu-request-id';

export function getOrCreateRequestId(req: NextRequest): string {
  const fromHeader = req.headers.get(HEADER);
  if (fromHeader && /^[\w-]{8,64}$/.test(fromHeader)) return fromHeader;
  return `req_${randomBytes(8).toString('hex')}`;
}

export function attachRequestId(response: Response, requestId: string): Response {
  response.headers.set(HEADER, requestId);
  return response;
}
