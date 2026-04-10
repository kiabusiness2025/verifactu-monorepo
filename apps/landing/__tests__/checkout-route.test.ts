/** @jest-environment node */

const mockStripeConstructor = jest.fn();

jest.mock('stripe', () => ({
  __esModule: true,
  default: mockStripeConstructor,
}));

jest.mock('@verifactu/utils', () => ({
  verifySessionToken: jest.fn(),
  readSessionSecret: jest.fn(() => 'test-secret'),
  SESSION_COOKIE_NAME: '__session',
  getLandingUrl: jest.fn(() => 'https://verifactu.business'),
  getAppUrl: jest.fn(() => 'https://app.verifactu.business'),
}));

describe('HEAD /api/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 204 and does not create a Stripe session', async () => {
    const { HEAD } = await import('../app/api/checkout/route');

    const response = await HEAD();

    expect(response.status).toBe(204);
    expect(mockStripeConstructor).not.toHaveBeenCalled();
  });
});
