export const ISAAK_MCP_SCOPES = [
  'isaak.company.read',
  'isaak.invoices.read',
  'isaak.invoices.write',
  'isaak.fiscal.read',
  'isaak.verifactu.validate',
  'isaak.verifactu.submit',
  'isaak.actions.read',
  'isaak.actions.propose',
  'isaak.actions.execute',
  'isaak.audit.read',
  'isaak.webhooks.write',
] as const;

export type IsaakMcpScope = (typeof ISAAK_MCP_SCOPES)[number];

export const PLATFORM_API_SCOPES = [
  'company.read',
  'invoices.read',
  'invoices.write',
  'invoices.issue',
  'verifactu.validate',
  'verifactu.submit',
  'actions.read',
  'actions.propose',
  'actions.execute',
  'audit.read',
  'webhooks.write',
] as const;

export type PlatformApiScope = (typeof PLATFORM_API_SCOPES)[number];

export const SCOPE_MAP: Record<PlatformApiScope, IsaakMcpScope> = {
  'company.read': 'isaak.company.read',
  'invoices.read': 'isaak.invoices.read',
  'invoices.write': 'isaak.invoices.write',
  'invoices.issue': 'isaak.verifactu.submit',
  'verifactu.validate': 'isaak.verifactu.validate',
  'verifactu.submit': 'isaak.verifactu.submit',
  'actions.read': 'isaak.actions.read',
  'actions.propose': 'isaak.actions.propose',
  'actions.execute': 'isaak.actions.execute',
  'audit.read': 'isaak.audit.read',
  'webhooks.write': 'isaak.webhooks.write',
};

export const HIGH_RISK_SCOPES: ReadonlySet<string> = new Set([
  'isaak.verifactu.submit',
  'isaak.actions.execute',
  'verifactu.submit',
  'invoices.issue',
  'actions.execute',
]);

export function isHighRiskScope(scope: string): boolean {
  return HIGH_RISK_SCOPES.has(scope);
}
