import { MissingScopeError } from '../errors';
import type { IsaakExecutionContext } from '../../context';

export function requireScope(ctx: IsaakExecutionContext, scope: string): void {
  if (!ctx.scopes.includes(scope)) {
    throw new MissingScopeError(scope);
  }
}

export function hasScope(ctx: IsaakExecutionContext, scope: string): boolean {
  return ctx.scopes.includes(scope);
}
