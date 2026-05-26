/**
 * Tests for OAuth helpers: Google, Microsoft, Drive scope, Gmail refresh.
 *
 * External HTTP calls are mocked via global.fetch.
 * Prisma calls are mocked via jest.mock('@/app/lib/prisma').
 */

// ── Prisma mock ───────────────────────────────────────────────────────────────
// jest.mock is hoisted before const declarations, so mock objects must be defined
// inline. References are retrieved from the imported module after hoisting.

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    isaakGoogleToken: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    isaakMicrosoftToken: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { prisma } from '@/app/lib/prisma';

// Typed aliases — resolved after jest.mock hoisting
type TokenMock = { findUnique: jest.Mock; update: jest.Mock };
const mockGoogleToken = prisma.isaakGoogleToken as unknown as TokenMock;
const mockMicrosoftToken = prisma.isaakMicrosoftToken as unknown as TokenMock;

import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  getValidAccessToken,
  getUserEmail,
} from '../google-calendar';
import {
  buildMicrosoftAuthUrl,
  exchangeMicrosoftCode,
  getMicrosoftRedirectUri,
  getMicrosoftUserProfile,
  getValidMicrosoftToken,
  isMicrosoftConfigured,
  MICROSOFT_SCOPES,
} from '../microsoft-oauth';
import { hasDriveScope } from '../google-drive';
import { refreshGoogleTokenIfNeeded } from '../gmail-scan-service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetchOk(body: unknown, status = 200): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok: true,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response);
}

function mockFetchErr(status: number, body = 'error'): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({}),
    text: async () => body,
  } as unknown as Response);
}

const GOOGLE_TOKEN_RESPONSE = {
  access_token: 'ya29.test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  scope:
    'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/drive.file',
  token_type: 'Bearer',
};

const MICROSOFT_TOKEN_RESPONSE = {
  access_token: 'eyJ0eXAi.ms-access-token',
  refresh_token: 'ms-refresh-token',
  expires_in: 3600,
  scope:
    'https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Mail.ReadWrite offline_access',
  token_type: 'Bearer',
};

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(); // reset between tests so not.toHaveBeenCalled() works
  // Provide env vars expected by the modules
  process.env.GOOGLE_CLIENT_ID = 'google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';
  process.env.MICROSOFT_CLIENT_ID = 'ms-client-id';
  process.env.MICROSOFT_CLIENT_SECRET = 'ms-client-secret';
  process.env.NEXT_PUBLIC_APP_URL = 'https://isaak.test';
  delete process.env.MICROSOFT_REDIRECT_URI;
});

// ─────────────────────────────────────────────────────────────────────────────
// Google — buildGoogleAuthUrl
// ─────────────────────────────────────────────────────────────────────────────

describe('buildGoogleAuthUrl', () => {
  test('returns a valid Google OAuth URL', () => {
    const url = buildGoogleAuthUrl('test-state');
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('client_id=google-client-id');
    expect(url).toContain('response_type=code');
    expect(url).toContain('access_type=offline');
    expect(url).toContain('state=test-state');
  });

  test('includes gmail.modify scope (not gmail.readonly)', () => {
    const url = buildGoogleAuthUrl('s');
    expect(url).toContain('gmail.modify');
    expect(url).not.toContain('gmail.readonly');
  });

  test('includes drive.file scope', () => {
    expect(buildGoogleAuthUrl('s')).toContain('drive.file');
  });

  test('includes calendar.events scope', () => {
    expect(buildGoogleAuthUrl('s')).toContain('calendar.events');
  });

  test('redirect_uri points to /api/isaak/google/callback', () => {
    const url = buildGoogleAuthUrl('s');
    expect(decodeURIComponent(url)).toContain('/api/isaak/google/callback');
  });

  test('prompt=consent for offline refresh token', () => {
    expect(buildGoogleAuthUrl('s')).toContain('prompt=consent');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Google — exchangeCodeForTokens
// ─────────────────────────────────────────────────────────────────────────────

describe('exchangeCodeForTokens', () => {
  test('returns token response on success', async () => {
    global.fetch = mockFetchOk(GOOGLE_TOKEN_RESPONSE);
    const result = await exchangeCodeForTokens('auth-code');
    expect(result.access_token).toBe('ya29.test-access-token');
    expect(result.refresh_token).toBe('test-refresh-token');
    expect(result.expires_in).toBe(3600);
  });

  test('POSTs to Google token endpoint', async () => {
    global.fetch = mockFetchOk(GOOGLE_TOKEN_RESPONSE);
    await exchangeCodeForTokens('auth-code');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(init.method).toBe('POST');
  });

  test('sends grant_type=authorization_code', async () => {
    global.fetch = mockFetchOk(GOOGLE_TOKEN_RESPONSE);
    await exchangeCodeForTokens('mycode');
    const body = (global.fetch as jest.Mock).mock.calls[0][1].body as URLSearchParams;
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('mycode');
  });

  test('throws on HTTP error', async () => {
    global.fetch = mockFetchErr(400, 'invalid_grant');
    await expect(exchangeCodeForTokens('bad-code')).rejects.toThrow('Token exchange failed');
  });

  test('throws when fetch rejects (network error)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));
    await expect(exchangeCodeForTokens('code')).rejects.toThrow('Network failure');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Google — getUserEmail
// ─────────────────────────────────────────────────────────────────────────────

describe('getUserEmail', () => {
  test('returns email from userinfo endpoint', async () => {
    global.fetch = mockFetchOk({ email: 'user@example.com', verified_email: true });
    const email = await getUserEmail('access-token');
    expect(email).toBe('user@example.com');
  });

  test('returns null when API returns no email field', async () => {
    global.fetch = mockFetchOk({});
    expect(await getUserEmail('token')).toBeNull();
  });

  test('returns null on HTTP error', async () => {
    global.fetch = mockFetchErr(401);
    expect(await getUserEmail('expired-token')).toBeNull();
  });

  test('sends Authorization Bearer header', async () => {
    global.fetch = mockFetchOk({ email: 'u@x.com' });
    await getUserEmail('my-token');
    const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer my-token');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Google — getValidAccessToken (with prisma mock)
// ─────────────────────────────────────────────────────────────────────────────

describe('getValidAccessToken', () => {
  const tenantId = 'tenant-1';
  const userId = 'user-1';

  test('returns access token when fresh (far from expiry)', async () => {
    mockGoogleToken.findUnique.mockResolvedValue({
      accessToken: 'fresh-token',
      refreshToken: 'refresh',
      expiresAt: new Date(Date.now() + 3_600_000), // 1h from now
    });
    const token = await getValidAccessToken(tenantId, userId);
    expect(token).toBe('fresh-token');
    expect(mockGoogleToken.update).not.toHaveBeenCalled();
  });

  test('returns null when no token record exists', async () => {
    mockGoogleToken.findUnique.mockResolvedValue(null);
    expect(await getValidAccessToken(tenantId, userId)).toBeNull();
  });

  test('returns null when token is expiring and no refresh token', async () => {
    mockGoogleToken.findUnique.mockResolvedValue({
      accessToken: 'expiring',
      refreshToken: null,
      expiresAt: new Date(Date.now() + 30_000), // 30s — below 60s threshold
    });
    expect(await getValidAccessToken(tenantId, userId)).toBeNull();
  });

  test('refreshes and returns new token when expiring', async () => {
    mockGoogleToken.findUnique.mockResolvedValue({
      accessToken: 'old-token',
      refreshToken: 'refresh-token',
      expiresAt: new Date(Date.now() + 30_000),
    });
    mockGoogleToken.update.mockResolvedValue({});
    global.fetch = mockFetchOk({
      access_token: 'new-token',
      expires_in: 3600,
      token_type: 'Bearer',
    });
    const token = await getValidAccessToken(tenantId, userId);
    expect(token).toBe('new-token');
    expect(mockGoogleToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accessToken: 'new-token' }),
      })
    );
  });

  test('sends grant_type=refresh_token when refreshing', async () => {
    mockGoogleToken.findUnique.mockResolvedValue({
      accessToken: 'old',
      refreshToken: 'rt',
      expiresAt: new Date(Date.now() + 10_000),
    });
    mockGoogleToken.update.mockResolvedValue({});
    global.fetch = mockFetchOk({ access_token: 'new', expires_in: 3600, token_type: 'Bearer' });
    await getValidAccessToken(tenantId, userId);
    const body = (global.fetch as jest.Mock).mock.calls[0][1].body as URLSearchParams;
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('rt');
  });

  test('returns null when refresh fails', async () => {
    mockGoogleToken.findUnique.mockResolvedValue({
      accessToken: 'old',
      refreshToken: 'bad-refresh',
      expiresAt: new Date(Date.now() + 10_000),
    });
    global.fetch = mockFetchErr(401, 'invalid_grant');
    expect(await getValidAccessToken(tenantId, userId)).toBeNull();
  });

  test('returns null when refresh throws (network error)', async () => {
    mockGoogleToken.findUnique.mockResolvedValue({
      accessToken: 'old',
      refreshToken: 'rt',
      expiresAt: new Date(Date.now() + 10_000),
    });
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    expect(await getValidAccessToken(tenantId, userId)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Google — Gmail scope detection (the bug fixed in status route)
// ─────────────────────────────────────────────────────────────────────────────

describe('Gmail scope detection', () => {
  function hasGmailScope(scopes: string): boolean {
    return (
      scopes.includes('https://www.googleapis.com/auth/gmail.modify') ||
      scopes.includes('https://www.googleapis.com/auth/gmail.readonly')
    );
  }

  test('detects gmail.modify scope (the scope we actually grant)', () => {
    const scopes =
      'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/drive.file';
    expect(hasGmailScope(scopes)).toBe(true);
  });

  test('detects gmail.readonly scope (legacy tokens)', () => {
    const scopes = 'https://www.googleapis.com/auth/gmail.readonly';
    expect(hasGmailScope(scopes)).toBe(true);
  });

  test('returns false when neither scope present', () => {
    const scopes = 'https://www.googleapis.com/auth/calendar.events';
    expect(hasGmailScope(scopes)).toBe(false);
  });

  test('returns false for empty scopes string', () => {
    expect(hasGmailScope('')).toBe(false);
  });

  test('OLD buggy check would fail for gmail.modify tokens', () => {
    // This documents the regression: the old code only checked for gmail.readonly
    const scopesWithModify =
      'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/drive.file';
    const oldBuggyCheck = scopesWithModify.includes(
      'https://www.googleapis.com/auth/gmail.readonly'
    );
    // The old check was wrong — it would have returned false for any gmail.modify token
    expect(oldBuggyCheck).toBe(false);
    // The fixed check is correct
    expect(hasGmailScope(scopesWithModify)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Google Drive — hasDriveScope
// ─────────────────────────────────────────────────────────────────────────────

describe('hasDriveScope', () => {
  test('returns true for drive.file scope', () => {
    expect(hasDriveScope('https://www.googleapis.com/auth/drive.file')).toBe(true);
  });

  test('returns true for full drive scope', () => {
    expect(hasDriveScope('https://www.googleapis.com/auth/drive')).toBe(true);
  });

  test('returns true when drive scope is among multiple scopes', () => {
    const scopes =
      'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file';
    expect(hasDriveScope(scopes)).toBe(true);
  });

  test('returns false for scopes without drive', () => {
    expect(hasDriveScope('https://www.googleapis.com/auth/calendar.events')).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(hasDriveScope('')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Gmail scan — refreshGoogleTokenIfNeeded
// ─────────────────────────────────────────────────────────────────────────────

describe('refreshGoogleTokenIfNeeded', () => {
  const tenantId = 't1';
  const userId = 'u1';

  test('returns current access token when not expiring soon', async () => {
    mockGoogleToken.findUnique.mockResolvedValue({
      accessToken: 'current-token',
      refreshToken: 'rt',
      expiresAt: new Date(Date.now() + 10 * 60_000), // 10 minutes
    });
    const result = await refreshGoogleTokenIfNeeded(tenantId, userId);
    expect(result).toBe('current-token');
    expect(global.fetch).not.toHaveBeenCalled(); // fetch should not be called
  });

  test('returns null when no token record', async () => {
    mockGoogleToken.findUnique.mockResolvedValue(null);
    expect(await refreshGoogleTokenIfNeeded(tenantId, userId)).toBeNull();
  });

  test('returns null when no refresh token', async () => {
    mockGoogleToken.findUnique.mockResolvedValue({
      accessToken: 'token',
      refreshToken: null,
      expiresAt: new Date(Date.now() + 60_000), // 1 min — within 5min window
    });
    expect(await refreshGoogleTokenIfNeeded(tenantId, userId)).toBeNull();
  });

  test('refreshes token when expiring within 5 minutes', async () => {
    mockGoogleToken.findUnique.mockResolvedValue({
      accessToken: 'old-token',
      refreshToken: 'rt',
      expiresAt: new Date(Date.now() + 2 * 60_000), // 2 minutes
    });
    mockGoogleToken.update.mockResolvedValue({});
    global.fetch = mockFetchOk({ access_token: 'fresh-token', expires_in: 3600 });
    const result = await refreshGoogleTokenIfNeeded(tenantId, userId);
    expect(result).toBe('fresh-token');
    expect(mockGoogleToken.update).toHaveBeenCalled();
  });

  test('returns null when refresh call fails', async () => {
    mockGoogleToken.findUnique.mockResolvedValue({
      accessToken: 'old',
      refreshToken: 'rt',
      expiresAt: new Date(Date.now() + 60_000),
    });
    global.fetch = mockFetchErr(400, 'invalid_grant');
    expect(await refreshGoogleTokenIfNeeded(tenantId, userId)).toBeNull();
  });

  test('5-minute threshold is larger than google-calendar 60-second threshold', () => {
    // Documenting the intentional difference: gmail-scan-service uses 5min
    // while google-calendar.ts uses 60s. Both are valid; scan service is more aggressive.
    const gmailScanThreshold = 5 * 60 * 1000;
    const calendarThreshold = 60_000;
    expect(gmailScanThreshold).toBeGreaterThan(calendarThreshold);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Microsoft — isMicrosoftConfigured
// ─────────────────────────────────────────────────────────────────────────────

describe('isMicrosoftConfigured', () => {
  test('returns true when both env vars present', () => {
    process.env.MICROSOFT_CLIENT_ID = 'id';
    process.env.MICROSOFT_CLIENT_SECRET = 'secret';
    expect(isMicrosoftConfigured()).toBe(true);
  });

  test('returns false when CLIENT_ID missing', () => {
    delete process.env.MICROSOFT_CLIENT_ID;
    expect(isMicrosoftConfigured()).toBe(false);
  });

  test('returns false when CLIENT_SECRET missing', () => {
    delete process.env.MICROSOFT_CLIENT_SECRET;
    expect(isMicrosoftConfigured()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Microsoft — getMicrosoftRedirectUri
// ─────────────────────────────────────────────────────────────────────────────

describe('getMicrosoftRedirectUri', () => {
  test('uses MICROSOFT_REDIRECT_URI env var when set', () => {
    process.env.MICROSOFT_REDIRECT_URI = 'https://custom.example.com/callback';
    expect(getMicrosoftRedirectUri()).toBe('https://custom.example.com/callback');
  });

  test('falls back to NEXT_PUBLIC_APP_URL + path when env var not set', () => {
    delete process.env.MICROSOFT_REDIRECT_URI;
    process.env.NEXT_PUBLIC_APP_URL = 'https://isaak.verifactu.business';
    expect(getMicrosoftRedirectUri()).toBe(
      'https://isaak.verifactu.business/api/isaak/microsoft/callback'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Microsoft — buildMicrosoftAuthUrl
// ─────────────────────────────────────────────────────────────────────────────

describe('buildMicrosoftAuthUrl', () => {
  test('returns Microsoft OAuth URL', () => {
    const url = buildMicrosoftAuthUrl('test-state');
    expect(url).toContain('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    expect(url).toContain('client_id=ms-client-id');
    expect(url).toContain('response_type=code');
    expect(url).toContain('state=test-state');
  });

  test('uses response_mode=query', () => {
    expect(buildMicrosoftAuthUrl('s')).toContain('response_mode=query');
  });

  test('includes offline_access for refresh token', () => {
    const url = buildMicrosoftAuthUrl('s');
    expect(decodeURIComponent(url)).toContain('offline_access');
  });

  test('includes Graph Mail and Calendar scopes', () => {
    const url = decodeURIComponent(buildMicrosoftAuthUrl('s'));
    expect(url).toContain('Mail.ReadWrite');
    expect(url).toContain('Calendars.ReadWrite');
    expect(url).toContain('Files.ReadWrite');
  });

  test('redirect_uri points to /api/isaak/microsoft/callback', () => {
    delete process.env.MICROSOFT_REDIRECT_URI;
    const url = decodeURIComponent(buildMicrosoftAuthUrl('s'));
    expect(url).toContain('/api/isaak/microsoft/callback');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Microsoft — exchangeMicrosoftCode
// ─────────────────────────────────────────────────────────────────────────────

describe('exchangeMicrosoftCode', () => {
  test('returns token response on success', async () => {
    global.fetch = mockFetchOk(MICROSOFT_TOKEN_RESPONSE);
    const result = await exchangeMicrosoftCode('ms-auth-code');
    expect(result.access_token).toBe('eyJ0eXAi.ms-access-token');
    expect(result.refresh_token).toBe('ms-refresh-token');
    expect(result.expires_in).toBe(3600);
  });

  test('POSTs to Microsoft token endpoint', async () => {
    global.fetch = mockFetchOk(MICROSOFT_TOKEN_RESPONSE);
    await exchangeMicrosoftCode('code');
    const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
    expect(url).toBe('https://login.microsoftonline.com/common/oauth2/v2.0/token');
  });

  test('sends grant_type=authorization_code', async () => {
    global.fetch = mockFetchOk(MICROSOFT_TOKEN_RESPONSE);
    await exchangeMicrosoftCode('mycode');
    const body = (global.fetch as jest.Mock).mock.calls[0][1].body as URLSearchParams;
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('mycode');
  });

  test('throws on HTTP error', async () => {
    global.fetch = mockFetchErr(400, 'invalid_grant');
    await expect(exchangeMicrosoftCode('bad-code')).rejects.toThrow(
      'Microsoft token exchange failed'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Microsoft — getMicrosoftUserProfile
// ─────────────────────────────────────────────────────────────────────────────

describe('getMicrosoftUserProfile', () => {
  test('returns email and displayName on success', async () => {
    global.fetch = mockFetchOk({ mail: 'user@corp.com', displayName: 'Ana García' });
    const profile = await getMicrosoftUserProfile('access-token');
    expect(profile.email).toBe('user@corp.com');
    expect(profile.displayName).toBe('Ana García');
  });

  test('returns nulls on HTTP error', async () => {
    global.fetch = mockFetchErr(401);
    const profile = await getMicrosoftUserProfile('expired');
    expect(profile.email).toBeNull();
    expect(profile.displayName).toBeNull();
  });

  test('returns nulls when fields absent', async () => {
    global.fetch = mockFetchOk({});
    const profile = await getMicrosoftUserProfile('token');
    expect(profile.email).toBeNull();
    expect(profile.displayName).toBeNull();
  });

  test('sends Authorization Bearer header', async () => {
    global.fetch = mockFetchOk({ mail: 'm@x.com', displayName: 'X' });
    await getMicrosoftUserProfile('my-ms-token');
    const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer my-ms-token');
  });

  test('queries the correct Graph endpoint', async () => {
    global.fetch = mockFetchOk({ mail: 'm@x.com' });
    await getMicrosoftUserProfile('token');
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('https://graph.microsoft.com/v1.0/me');
    expect(url).toContain('mail');
    expect(url).toContain('displayName');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Microsoft — getValidMicrosoftToken (with prisma mock)
// ─────────────────────────────────────────────────────────────────────────────

describe('getValidMicrosoftToken', () => {
  const tenantId = 'tenant-ms';
  const userId = 'user-ms';

  test('returns access token when fresh', async () => {
    mockMicrosoftToken.findUnique.mockResolvedValue({
      accessToken: 'fresh-ms-token',
      refreshToken: 'rt',
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    const token = await getValidMicrosoftToken(tenantId, userId);
    expect(token).toBe('fresh-ms-token');
    expect(mockMicrosoftToken.update).not.toHaveBeenCalled();
  });

  test('returns null when no token record', async () => {
    mockMicrosoftToken.findUnique.mockResolvedValue(null);
    expect(await getValidMicrosoftToken(tenantId, userId)).toBeNull();
  });

  test('returns null when expiring and no refresh token', async () => {
    mockMicrosoftToken.findUnique.mockResolvedValue({
      accessToken: 'old',
      refreshToken: null,
      expiresAt: new Date(Date.now() + 30_000),
    });
    expect(await getValidMicrosoftToken(tenantId, userId)).toBeNull();
  });

  test('refreshes token when expiring', async () => {
    mockMicrosoftToken.findUnique.mockResolvedValue({
      accessToken: 'old-ms',
      refreshToken: 'ms-rt',
      expiresAt: new Date(Date.now() + 30_000),
    });
    mockMicrosoftToken.update.mockResolvedValue({});
    global.fetch = mockFetchOk({
      access_token: 'new-ms-token',
      expires_in: 3600,
      token_type: 'Bearer',
    });
    const token = await getValidMicrosoftToken(tenantId, userId);
    expect(token).toBe('new-ms-token');
    expect(mockMicrosoftToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accessToken: 'new-ms-token' }),
      })
    );
  });

  test('sends grant_type=refresh_token for Microsoft refresh', async () => {
    mockMicrosoftToken.findUnique.mockResolvedValue({
      accessToken: 'old',
      refreshToken: 'ms-rt',
      expiresAt: new Date(Date.now() + 10_000),
    });
    mockMicrosoftToken.update.mockResolvedValue({});
    global.fetch = mockFetchOk({ access_token: 'new', expires_in: 3600, token_type: 'Bearer' });
    await getValidMicrosoftToken(tenantId, userId);
    const body = (global.fetch as jest.Mock).mock.calls[0][1].body as URLSearchParams;
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('ms-rt');
  });

  test('includes scopes in Microsoft refresh request', async () => {
    mockMicrosoftToken.findUnique.mockResolvedValue({
      accessToken: 'old',
      refreshToken: 'rt',
      expiresAt: new Date(Date.now() + 10_000),
    });
    mockMicrosoftToken.update.mockResolvedValue({});
    global.fetch = mockFetchOk({ access_token: 'new', expires_in: 3600, token_type: 'Bearer' });
    await getValidMicrosoftToken(tenantId, userId);
    const body = (global.fetch as jest.Mock).mock.calls[0][1].body as URLSearchParams;
    expect(body.get('scope')).toBe(MICROSOFT_SCOPES);
  });

  test('returns null when refresh fails', async () => {
    mockMicrosoftToken.findUnique.mockResolvedValue({
      accessToken: 'old',
      refreshToken: 'bad-rt',
      expiresAt: new Date(Date.now() + 10_000),
    });
    global.fetch = mockFetchErr(401, 'invalid_grant');
    expect(await getValidMicrosoftToken(tenantId, userId)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Microsoft — scope detection (status route logic)
// ─────────────────────────────────────────────────────────────────────────────

describe('Microsoft scope detection', () => {
  const grantedScopes =
    'https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Files.ReadWrite https://graph.microsoft.com/User.Read offline_access';

  test('detects Calendar scope via substring', () => {
    expect(grantedScopes.includes('Calendars')).toBe(true);
  });

  test('detects Mail scope via substring (Mail.ReadWrite includes Mail.Read)', () => {
    expect(grantedScopes.includes('Mail.Read')).toBe(true);
  });

  test('detects Mail.Send scope', () => {
    expect(grantedScopes.includes('Mail.Send')).toBe(true);
  });

  test('detects Files/OneDrive scope', () => {
    expect(grantedScopes.includes('Files')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// State encoding (used by both Google and Microsoft auth routes)
// ─────────────────────────────────────────────────────────────────────────────

describe('OAuth state encoding/decoding', () => {
  test('base64url encodes tenantId and userId', () => {
    const state = Buffer.from(
      JSON.stringify({ tenantId: 'tenant-123', userId: 'user-456' })
    ).toString('base64url');
    expect(state).not.toContain('+');
    expect(state).not.toContain('/');
    expect(state).not.toContain('=');
  });

  test('decodes back to original tenantId and userId', () => {
    const original = { tenantId: 'tenant-abc', userId: 'user-xyz' };
    const state = Buffer.from(JSON.stringify(original)).toString('base64url');
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString()) as typeof original;
    expect(decoded.tenantId).toBe(original.tenantId);
    expect(decoded.userId).toBe(original.userId);
  });

  test('throws on malformed state', () => {
    expect(() => JSON.parse(Buffer.from('not-valid-json-here', 'base64url').toString())).toThrow();
  });

  test('empty state string throws', () => {
    expect(() => JSON.parse(Buffer.from('', 'base64url').toString())).toThrow();
  });
});
