/** @jest-environment node */

jest.mock('@/app/lib/communications/holded-email-service', () => ({
  __esModule: true,
  sendHoldedLeadCommunication: jest.fn(),
}));

import { sendHoldedLeadCommunication } from '@/app/lib/communications/holded-email-service';
import { POST } from './route';

const mockSendLead = sendHoldedLeadCommunication as jest.Mock;

describe('POST /api/communications/lead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendLead.mockResolvedValue({
      customerWelcomeId: 'welcome-1',
      customerGuideId: 'guide-1',
      internalLeadId: 'internal-1',
    });
  });

  it('sends lead communication when payload is valid', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/communications/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '2.2.2.2' },
        body: JSON.stringify({
          name: 'Ana',
          email: 'ana@example.com',
          companyName: 'Acme',
          consent: true,
          source: 'holded_free_plan',
        }),
      }) as never
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockSendLead).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ana',
        email: 'ana@example.com',
        companyName: 'Acme',
      })
    );
  });
});
