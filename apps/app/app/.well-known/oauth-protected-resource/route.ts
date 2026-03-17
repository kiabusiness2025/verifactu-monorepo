import {
  getAuthorizationServerMetadataUrl,
  getMcpResourceUrl,
} from '@/lib/oauth/mcp';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    resource: getMcpResourceUrl(),
    authorization_servers: [getAuthorizationServerMetadataUrl()],
    bearer_methods_supported: ['header'],
    scopes_supported: [
      'mcp.read',
      'holded.invoices.read',
      'holded.contacts.read',
      'holded.accounts.read',
      'holded.invoices.write',
    ],
  });
}
