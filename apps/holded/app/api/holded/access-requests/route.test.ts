/** @jest-environment node */

jest.mock('@/app/lib/holded-session', () => ({
  __esModule: true,
  getHoldedSession: jest.fn(),
}));

jest.mock('@/app/lib/holded-governance', () => ({
  __esModule: true,
  createPublicAccessRequest: jest.fn(),
}));

jest.mock('@/app/lib/communications/holded-governance-emails', () => ({
  __esModule: true,
  sendPublicAccessRequestCreatedEmails: jest.fn(),
}));

import { getHoldedSession } from '@/app/lib/holded-session';
import { createPublicAccessRequest } from '@/app/lib/holded-governance';
import { sendPublicAccessRequestCreatedEmails } from '@/app/lib/communications/holded-governance-emails';
import { POST } from './route';

const mockGetHoldedSession = getHoldedSession as jest.Mock;
const mockCreatePublicAccessRequest = createPublicAccessRequest as jest.Mock;
const mockSendPublicAccessRequestCreatedEmails = sendPublicAccessRequestCreatedEmails as jest.Mock;

describe('POST /api/holded/access-requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHoldedSession.mockResolvedValue({
      tenantId: 'tenant_1',
      userId: 'user_1',
      email: 'ana@example.com',
    });
    mockCreatePublicAccessRequest.mockResolvedValue({
      requestId: 'req-1',
      connectionId: 'ext-1',
      requester: { userId: 'user_1', name: 'Ana', email: 'ana@example.com' },
      status: 'submitted',
      requestedRole: 'viewer',
      message: 'Necesito acceso',
      createdAt: '2026-04-12T12:00:00.000Z',
      resolvedAt: null,
    });
    mockSendPublicAccessRequestCreatedEmails.mockResolvedValue(true);
  });

  it('creates a public access request for a duplicate conflict', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/access-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          connectionId: 'ext-1',
          requestedRole: 'viewer',
          message: 'Necesito acceso',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockCreatePublicAccessRequest).toHaveBeenCalledWith({
      requesterUserId: 'user_1',
      connectionId: 'ext-1',
      requestedRole: 'viewer',
      message: 'Necesito acceso',
    });
    expect(payload).toMatchObject({
      ok: true,
      notified: true,
      nextStep: 'request_submitted',
      accessRequest: {
        requestId: 'req-1',
        connectionId: 'ext-1',
      },
    });
  });

  it('keeps the request successful when notification delivery fails', async () => {
    mockSendPublicAccessRequestCreatedEmails.mockRejectedValue(new Error('smtp_down'));

    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/access-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          connectionId: 'ext-1',
          requestedRole: 'viewer',
          message: 'Necesito acceso',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.notified).toBe(false);
  });
});
