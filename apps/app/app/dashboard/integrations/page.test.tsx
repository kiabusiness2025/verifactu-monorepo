/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import IntegrationsPage from './page';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

describe('IntegrationsPage', () => {
  const fetchMock = jest.fn();
  const responseOf = <T,>(body: T, ok = true) =>
    ({
      ok,
      json: async () => body,
    }) as Response;

  beforeEach(() => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/api/integrations/accounting/status') && method === 'GET') {
        return responseOf({
          provider: 'holded',
          status: 'connected',
          lastSyncAt: '2026-04-13T12:30:00.000Z',
          lastError: null,
          connected: true,
          plan: 'empresa',
          canConnect: true,
        });
      }

      if (url.endsWith('/api/integrations/accounting/logs?limit=10') && method === 'GET') {
        return responseOf({ items: [] });
      }

      if (
        url.endsWith('/api/integrations/accounting/logs?mode=summary&summaryLimit=120') &&
        method === 'GET'
      ) {
        return responseOf({
          mode: 'summary',
          tenantId: 'tenant-1',
          summaryLimit: 120,
          summary: {
            sync: { total: 2, warnings: 1, errors: 1 },
            conflicts: { quotes: 1 },
            claims: { total: 2, open: 1 },
            accessRequests: { total: 1, pending: 1 },
            governance: { flags: null, blockedActions: [] },
          },
          incidents: [],
          requestId: 'req-summary-1',
        });
      }

      if (url.endsWith('/api/integrations/gdrive/status') && method === 'GET') {
        return responseOf({
          provider: 'gdrive',
          status: 'disconnected',
          connected: false,
          lastSyncAt: null,
          lastError: null,
          folderName: null,
          folderId: null,
          folderWebViewLink: null,
          email: null,
          oauthReady: true,
        });
      }

      if (url.endsWith('/api/integrations/accounting/disconnect') && method === 'POST') {
        return responseOf({ ok: true });
      }

      return responseOf({ error: `Unhandled ${method} ${url}` }, false);
    });

    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it('abre un modal propio antes de desconectar la integracion contable', async () => {
    render(<IntegrationsPage />);

    expect(await screen.findByText('Programa de contabilidad via API')).toBeInTheDocument();
    expect(await screen.findByText('Resumen operativo por tenant/requestId')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Desconectar' })[0]);
    expect(await screen.findByText('Desconectar integracion contable')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Desconectar' }).at(-1) as HTMLElement);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/integrations/accounting/disconnect',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});
