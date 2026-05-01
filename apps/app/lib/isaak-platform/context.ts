export type IsaakChannel = 'isaak' | 'api' | 'mcp' | 'chatgpt' | 'claude' | 'dashboard';
export type IsaakAuthSource = 'cookie' | 'oauth' | 'api_key';

export type IsaakExecutionContext = {
  tenantId: string;
  userId: string;
  authSubject?: string;
  channel: IsaakChannel;
  scopes: string[];
  plan?: string;
  requestId: string;
  source: IsaakAuthSource;
};
