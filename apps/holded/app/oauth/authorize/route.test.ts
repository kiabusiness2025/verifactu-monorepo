/** @jest-environment node */

import { NextRequest } from 'next/server';
import { GET } from './route';

describe('GET /oauth/authorize', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          location:
            'https://holded.verifactu.business/auth/holded-direct?next=https%3A%2F%2Fholded.verifactu.business%2Foauth%2Fauthorize',
          'x-upstream': 'app-oauth',
        },
      })
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('proxies transparently to the shared oauth backend without redirecting the browser to app', async () => {
    const request = new NextRequest(
      'https://holded.verifactu.business/oauth/authorize?response_type=code&client_id=openai-demo&redirect_uri=https%3A%2F%2Fchatgpt.com%2Foauth&code_challenge=abc123abc123abc123abc123abc123abc123abc123a&code_challenge_method=S256'
    );

    const response = await GET(request);
    const [calledUrl, calledInit] = (global.fetch as jest.Mock).mock.calls[0];

    expect(String(calledUrl)).toContain(
      'https://app.verifactu.business/oauth/authorize?response_type=code'
    );
    expect(calledInit).toEqual(
      expect.objectContaining({
        method: 'GET',
        redirect: 'manual',
      })
    );
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain(
      'https://holded.verifactu.business/auth/holded-direct'
    );
    expect(response.headers.get('x-upstream')).toBe('app-oauth');
  });
});
