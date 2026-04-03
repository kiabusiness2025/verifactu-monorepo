/** @jest-environment node */

jest.mock('./db', () => ({
  one: jest.fn(),
  query: jest.fn(),
}));

jest.mock('./tenants', () => ({
  resolveInternalUserId: jest.fn(),
}));

import { one, query } from './db';
import { fetchMembership, listMemberships } from './memberships';
import { resolveInternalUserId } from './tenants';

describe('memberships helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves the internal user id before fetching a membership', async () => {
    (resolveInternalUserId as jest.Mock).mockResolvedValue('internal-user-1');
    (one as jest.Mock).mockResolvedValue({
      user_id: 'internal-user-1',
      tenant_id: 'tenant-1',
      role: 'owner',
      status: 'active',
    });

    const membership = await fetchMembership('firebase-uid-1', 'tenant-1');

    expect(resolveInternalUserId).toHaveBeenCalledWith('firebase-uid-1');
    expect(one).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1 AND tenant_id = $2'),
      ['internal-user-1', 'tenant-1']
    );
    expect(membership).toEqual({
      userId: 'internal-user-1',
      tenantId: 'tenant-1',
      role: 'owner',
      status: 'active',
    });
  });

  it('returns an empty list when the session user cannot be resolved to an internal id', async () => {
    (resolveInternalUserId as jest.Mock).mockResolvedValue(null);

    const memberships = await listMemberships('firebase-uid-1');

    expect(resolveInternalUserId).toHaveBeenCalledWith('firebase-uid-1');
    expect(query).not.toHaveBeenCalled();
    expect(memberships).toEqual([]);
  });
});
