/** @jest-environment node */

const mockExternalConnectionFindFirst = jest.fn();
const mockAccessRequestFindMany = jest.fn();
const mockAccessRequestUpdateMany = jest.fn();
const mockClaimCaseFindMany = jest.fn();
const mockClaimCaseUpdateMany = jest.fn();
const mockClaimResolutionCreateMany = jest.fn();
const mockExternalConnectionUpdate = jest.fn();

const transactionClient = {
  accessRequest: {
    findMany: (...args: unknown[]) => mockAccessRequestFindMany(...args),
    updateMany: (...args: unknown[]) => mockAccessRequestUpdateMany(...args),
  },
  claimCase: {
    findMany: (...args: unknown[]) => mockClaimCaseFindMany(...args),
    updateMany: (...args: unknown[]) => mockClaimCaseUpdateMany(...args),
  },
  claimResolution: {
    createMany: (...args: unknown[]) => mockClaimResolutionCreateMany(...args),
  },
  externalConnection: {
    update: (...args: unknown[]) => mockExternalConnectionUpdate(...args),
  },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    externalConnection: {
      findFirst: (...args: unknown[]) => mockExternalConnectionFindFirst(...args),
    },
    $transaction: (callback: (tx: typeof transactionClient) => unknown) =>
      callback(transactionClient),
  },
}));

import { resetGovernanceOnDisconnect } from './holdedGovernanceService';

describe('resetGovernanceOnDisconnect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccessRequestUpdateMany.mockResolvedValue({ count: 0 });
    mockClaimCaseUpdateMany.mockResolvedValue({ count: 0 });
    mockClaimResolutionCreateMany.mockResolvedValue({ count: 0 });
    mockExternalConnectionUpdate.mockResolvedValue({ id: 'ext-1' });
  });

  it('cancels open access requests and closes open claims with timeline records', async () => {
    mockExternalConnectionFindFirst.mockResolvedValue({
      id: 'ext-1',
      tenantId: 'tenant-1',
      provider: 'holded',
    });

    mockAccessRequestFindMany.mockResolvedValue([{ id: 'ar-1' }, { id: 'ar-2' }]);
    mockClaimCaseFindMany.mockResolvedValue([
      { id: 'cl-1', status: 'submitted' },
      { id: 'cl-2', status: 'under_review' },
      { id: 'cl-3', status: 'awaiting_response' },
    ]);

    const result = await resetGovernanceOnDisconnect({
      tenantId: 'tenant-1',
      connectionId: 'ext-1',
      channel: 'dashboard',
    });

    expect(mockExternalConnectionFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'ext-1',
        tenantId: 'tenant-1',
        provider: 'holded',
      },
    });

    expect(mockAccessRequestUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['ar-1', 'ar-2'] } },
      data: expect.objectContaining({
        status: 'cancelled',
        resolvedByUserId: null,
      }),
    });

    expect(mockClaimCaseUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['cl-1', 'cl-2', 'cl-3'] } },
      data: expect.objectContaining({
        status: 'closed',
        resolvedByUserId: null,
        outcome: 'closed_by_disconnect',
      }),
    });

    expect(mockClaimResolutionCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          claimCaseId: 'cl-1',
          action: 'claim_closed_by_disconnect',
          previousStatus: 'submitted',
          nextStatus: 'closed',
          actorUserId: null,
        }),
        expect.objectContaining({
          claimCaseId: 'cl-2',
          action: 'claim_closed_by_disconnect',
          previousStatus: 'under_review',
          nextStatus: 'closed',
          actorUserId: null,
        }),
        expect.objectContaining({
          claimCaseId: 'cl-3',
          action: 'claim_closed_by_disconnect',
          previousStatus: 'awaiting_response',
          nextStatus: 'closed',
          actorUserId: null,
        }),
      ]),
    });

    expect(mockExternalConnectionUpdate).toHaveBeenCalledWith({
      where: { id: 'ext-1' },
      data: expect.objectContaining({ underClaimReview: false }),
    });

    expect(result).toEqual({
      accessRequestsCancelled: 2,
      claimsClosed: 3,
      touchedConnection: true,
    });
  });

  it('returns zero counts when no connection exists', async () => {
    mockExternalConnectionFindFirst.mockResolvedValue(null);

    const result = await resetGovernanceOnDisconnect({
      tenantId: 'tenant-1',
      connectionId: 'missing-connection',
      channel: 'dashboard',
    });

    expect(result).toEqual({
      accessRequestsCancelled: 0,
      claimsClosed: 0,
      touchedConnection: false,
    });
    expect(mockAccessRequestFindMany).not.toHaveBeenCalled();
    expect(mockClaimCaseFindMany).not.toHaveBeenCalled();
    expect(mockExternalConnectionUpdate).not.toHaveBeenCalled();
  });
});
