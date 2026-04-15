/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AvailableActionsDTO } from '@verifactu/integrations/holded/contracts';
import IsaakForHoldedPage from './page';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

function buildActions(): AvailableActionsDTO {
  return {
    reconnect: {
      blocked: false,
      reason: '',
      state: 'connected',
      suggestedAction: null,
      suggestedActionLabel: null,
    },
    rotateApi: {
      blocked: false,
      reason: '',
      state: 'connected',
      suggestedAction: null,
      suggestedActionLabel: null,
    },
    disconnect: {
      blocked: false,
      reason: '',
      state: 'connected',
      suggestedAction: null,
      suggestedActionLabel: null,
    },
    manageMembers: {
      blocked: false,
      reason: '',
      state: 'connected',
      suggestedAction: null,
      suggestedActionLabel: null,
    },
    manageRecipients: {
      blocked: false,
      reason: '',
      state: 'connected',
      suggestedAction: null,
      suggestedActionLabel: null,
    },
    openClaim: {
      blocked: false,
      reason: '',
      state: 'connected',
      suggestedAction: null,
      suggestedActionLabel: null,
    },
  };
}

describe('IsaakForHoldedPage', () => {
  const fetchMock = jest.fn();
  const matchesUrl = (value: string, path: string) => value === path || value.endsWith(path);
  const responseOf = <T,>(body: T, ok = true) =>
    ({
      ok,
      json: async () => body,
    }) as Response;

  beforeEach(() => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (matchesUrl(url, '/api/integrations/accounting/status') && method === 'GET') {
        return responseOf({
          provider: 'holded',
          requestId: 'req-status',
          connection: {
            connectionId: 'conn-1',
            tenantId: 'tenant-1',
            provider: 'holded',
            status: 'connected',
            keyMasked: '***1234',
            providerAccountId: 'holded-acc',
            connectedAt: '2026-04-13T10:00:00.000Z',
            lastValidatedAt: '2026-04-13T12:00:00.000Z',
            lastSyncAt: '2026-04-13T12:30:00.000Z',
            lastError: null,
            originChannel: 'dashboard',
            supportedModules: ['invoices'],
          },
          governanceFlags: {
            ownershipStatus: 'confirmed',
            managedByThirdParty: false,
            clientAdminGap: false,
            highGovernanceRisk: false,
            underClaimReview: false,
          },
          membershipsSummary: { total: 1 },
          recipientsSummary: { total: 1 },
          claimsSummary: { open: 1 },
          availableActions: buildActions(),
          status: 'connected',
          lastSyncAt: '2026-04-13T12:30:00.000Z',
          lastError: null,
          connected: true,
        });
      }

      if (
        matchesUrl(url, '/api/integrations/accounting/logs?mode=summary&summaryLimit=120') &&
        method === 'GET'
      ) {
        return responseOf({
          mode: 'summary',
          tenantId: 'tenant-1',
          summaryLimit: 120,
          summary: {
            sync: { total: 3, warnings: 1, errors: 1 },
            conflicts: { quotes: 1 },
            claims: { total: 2, open: 1 },
            accessRequests: { total: 2, pending: 1 },
            governance: {
              flags: null,
              blockedActions: [{ action: 'openClaim', reason: 'Existe claim activa' }],
            },
          },
          incidents: [
            {
              source: 'sync_log',
              severity: 'warn',
              message: 'QUOTE_CONFLICT quote-1',
              createdAt: '2026-04-13T12:45:00.000Z',
              outboxId: null,
              requestId: 'req-incident-1',
            },
          ],
          requestId: 'req-summary',
        });
      }

      if (matchesUrl(url, '/api/integrations/accounting/memberships') && method === 'GET') {
        return responseOf({
          items: [
            {
              membershipId: 'm-1',
              userId: 'user-1',
              name: 'Admin Cliente',
              email: 'admin@cliente.es',
              role: 'company_admin',
              side: 'client',
              status: 'active',
              invitedAt: '2026-04-12T10:00:00.000Z',
              confirmedAt: '2026-04-12T10:10:00.000Z',
            },
          ],
        });
      }

      if (matchesUrl(url, '/api/integrations/accounting/recipients') && method === 'GET') {
        return responseOf({
          items: [
            {
              recipientId: 'r-1',
              email: 'avisos@cliente.es',
              recipientType: 'client_contact',
              isMandatory: true,
              isClientSide: true,
              isConfirmed: true,
              createdByUserId: 'user-1',
            },
          ],
        });
      }

      if (url.startsWith('/api/integrations/accounting/admin/user-tenants?') && method === 'GET') {
        return responseOf({
          items: [
            {
              membershipId: 'm-1',
              userId: 'user-1',
              userEmail: 'admin@cliente.es',
              userName: 'Admin Cliente',
              tenantId: 'tenant-1',
              tenantName: 'Acme SL',
              tenantLegalName: 'Acme Sociedad Limitada',
              membershipRole: 'company_admin',
              membershipStatus: 'active',
              membershipSide: 'client',
              connectionId: 'conn-1',
              connectionStatus: 'connected',
              channelKey: 'dashboard',
              managedByThirdParty: false,
              clientAdminGap: false,
              highGovernanceRisk: false,
              lastValidatedAt: '2026-04-13T12:00:00.000Z',
              lastSyncAt: '2026-04-13T12:30:00.000Z',
              updatedAt: '2026-04-13T12:30:00.000Z',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 25,
          totalPages: 1,
          filters: { q: '', status: 'all', sort: 'updated_desc' },
        });
      }
      if (matchesUrl(url, '/api/integrations/accounting/access-requests') && method === 'GET') {
        return responseOf({
          items: [
            {
              requestId: 'ar-1',
              connectionId: 'conn-1',
              requester: {
                userId: 'user-2',
                name: 'Persona Solicitante',
                email: 'peticion@cliente.es',
              },
              status: 'submitted',
              requestedRole: 'viewer',
              message: 'Necesito acceso al conector',
              createdAt: '2026-04-13T09:00:00.000Z',
              resolvedAt: null,
            },
          ],
        });
      }

      if (matchesUrl(url, '/api/integrations/accounting/claims') && method === 'GET') {
        return responseOf({
          items: [
            {
              claimId: 'c-1',
              connectionId: 'conn-1',
              claimType: 'control',
              status: 'submitted',
              reason: 'La conexion debe revisarse',
              scope: null,
              requiresInternalReview: true,
              createdBy: {
                userId: 'user-3',
                name: 'Reclamante',
                email: 'claim@cliente.es',
              },
              createdAt: '2026-04-13T08:00:00.000Z',
              resolvedAt: null,
              outcome: null,
            },
          ],
        });
      }

      if (matchesUrl(url, '/api/integrations/accounting/claims/c-1') && method === 'GET') {
        return responseOf({
          claim: {
            claimId: 'c-1',
            connectionId: 'conn-1',
            claimType: 'control',
            status: 'submitted',
            reason: 'La conexion debe revisarse',
            scope: null,
            requiresInternalReview: true,
            createdBy: {
              userId: 'user-3',
              name: 'Reclamante',
              email: 'claim@cliente.es',
            },
            createdAt: '2026-04-13T08:00:00.000Z',
            resolvedAt: null,
            outcome: null,
          },
          timeline: [
            {
              resolutionId: 'cr-1',
              action: 'claim_created',
              previousStatus: null,
              nextStatus: 'submitted',
              notes: 'Creacion inicial',
              createdAt: '2026-04-13T08:00:00.000Z',
              actor: {
                userId: 'user-3',
                name: 'Reclamante',
                email: 'claim@cliente.es',
              },
            },
          ],
        });
      }

      if (
        matchesUrl(url, '/api/integrations/accounting/access-requests/ar-1') &&
        method === 'PATCH'
      ) {
        return responseOf({ ok: true });
      }

      return responseOf({ error: `Unhandled ${method} ${url}` }, false);
    });

    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it('carga las secciones operativas y permite resolver solicitudes y ver claims', async () => {
    render(<IsaakForHoldedPage />);

    expect(await screen.findByText('Usuarios y permisos')).toBeInTheDocument();
    expect(await screen.findByText('Perfil fiscal pendiente')).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Hay revisiones pendientes. Completa tu perfil fiscal para reducir bloqueos y seguir operando con normalidad.'
      )
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'Completar perfil fiscal' })
    ).toBeInTheDocument();
    expect(screen.getByText('Resumen operativo por tenant/requestId')).toBeInTheDocument();
    expect(await screen.findByText('Incidentes recientes')).toBeInTheDocument();
    expect(await screen.findByText('QUOTE_CONFLICT quote-1')).toBeInTheDocument();
    expect(screen.getByText('Destinatarios y avisos')).toBeInTheDocument();
    expect(screen.getByText('Solicitudes de acceso')).toBeInTheDocument();
    expect(screen.getByText('Claims y disputas')).toBeInTheDocument();
    expect(screen.getByText('Usuarios y tenants conectados')).toBeInTheDocument();
    expect((await screen.findAllByText('admin@cliente.es')).length).toBeGreaterThan(0);
    expect(screen.getByText('avisos@cliente.es')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }));
    expect(await screen.findByText('Detalle de claim')).toBeInTheDocument();
    expect(screen.getByText('claim_created')).toBeInTheDocument();

    const requestCard = screen.getByText('peticion@cliente.es').closest('article');
    expect(requestCard).not.toBeNull();
    fireEvent.click(within(requestCard as HTMLElement).getByRole('button', { name: 'Aprobar' }));
    expect((await screen.findAllByText('Aprobar solicitud')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar solicitud' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/integrations/accounting/access-requests/ar-1',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });
});
