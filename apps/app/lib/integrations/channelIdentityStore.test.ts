/** @jest-environment node */

export {};

const mockOne = jest.fn();
const mockQuery = jest.fn();

jest.mock('@/lib/db', () => ({
  one: (...args: unknown[]) => mockOne(...args),
  query: (...args: unknown[]) => mockQuery(...args),
}));

describe('channelIdentityStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('uses the correct number of insert values when upserting channel identities', async () => {
    mockOne.mockResolvedValueOnce({ exists: true }).mockResolvedValueOnce({
      id: 'identity-1',
      user_id: 'user-1',
      tenant_id: 'tenant-1',
      channel_type: 'chatgpt',
      channel_subject_id: 'subject-1',
      email: 'demo@example.com',
      display_name: 'Demo User',
      created_at: '2026-04-06T08:00:00.000Z',
      updated_at: '2026-04-06T08:00:00.000Z',
    });

    const { upsertChannelIdentity } = await import('./channelIdentityStore');
    const result = await upsertChannelIdentity({
      userId: 'user-1',
      tenantId: 'tenant-1',
      channelType: 'chatgpt',
      channelSubjectId: 'subject-1',
      email: 'demo@example.com',
      displayName: 'Demo User',
      metadata: { source: 'test' },
    });

    const insertCall = mockOne.mock.calls.find(
      ([text]) => typeof text === 'string' && text.includes('INSERT INTO channel_identities')
    );

    expect(insertCall).toBeDefined();
    expect(String(insertCall?.[0])).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)');
    expect(insertCall?.[1]).toHaveLength(7);
    expect(result).toMatchObject({
      id: 'identity-1',
      channel_type: 'chatgpt',
      channel_subject_id: 'subject-1',
    });
  });
});
