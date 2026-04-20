import type { AIProvider } from './types';

export type AIErrorKind =
  | 'auth'
  | 'rate_limit'
  | 'quota'
  | 'parse'
  | 'network'
  | 'empty_response'
  | 'unknown';

export class AIError extends Error {
  readonly provider: AIProvider;
  readonly kind: AIErrorKind;
  readonly statusCode?: number;

  constructor(message: string, provider: AIProvider, kind: AIErrorKind, statusCode?: number) {
    super(message);
    this.name = 'AIError';
    this.provider = provider;
    this.kind = kind;
    this.statusCode = statusCode;
  }
}

export function classifyHttpError(status: number): AIErrorKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status === 402) return 'quota';
  if (status >= 500) return 'network';
  return 'unknown';
}
