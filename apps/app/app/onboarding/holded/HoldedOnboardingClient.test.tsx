/** @jest-environment jsdom */
/* eslint-disable @next/next/no-img-element */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt || ''} />,
}));

jest.mock('@/lib/firebase', () => ({
  auth: {},
}));

jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: class GoogleAuthProvider {
    setCustomParameters() {}
  },
  signInWithPopup: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
}));

import { signInWithPopup } from 'firebase/auth';
import HoldedOnboardingClient from './HoldedOnboardingClient';

const baseProps = {
  entryChannel: 'chatgpt' as const,
  nextUrl: '#connected',
  requireConnectionConfirmation: false,
  requiresVerifiedIdentity: false,
  identity: {
    authMethod: 'google' as const,
    email: 'kiabusiness2025@gmail.com',
    emailVerified: true,
    firstName: 'Ksenia',
    lastName: 'Ivanova Lopez',
    verifiedAt: '2026-04-06T10:00:00.000Z',
  },
  summary: {
    companyName: 'ALVILS ESP',
    companyLegalName: 'ALVILS ESP SL',
    companyTaxId: 'B12345678',
    companyAddress: 'Calle Mayor 1',
    companyPostalCode: '28001',
    companyCity: 'Madrid',
    companyProvince: 'Madrid',
    companyCountry: 'Espana',
    companyWebsite: 'https://alvils.es',
    companySectorCode: 'M',
    companySectorLabel: 'Actividades profesionales, cientificas y tecnicas',
    contactFirstName: 'Ksenia',
    contactRole: 'owner',
    contactFullName: 'Ksenia Ivanova Lopez',
    contactEmail: 'kiabusiness2025@gmail.com',
    companyEmail: 'admin@alvils.es',
    contactPhone: '600000000',
  },
  companySetup: {
    hasResolvedCompany: true,
    needsCompanySetup: false,
    requiresCompanyConfirmation: true,
  },
};

describe('HoldedOnboardingClient', () => {
  const fetchMock = jest.fn();

  const advanceToApiStep = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con empresa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con API key' }));
  };

  const getFetchCall = (fetchMock: jest.Mock, url: string, occurrence = 0) => {
    const matches = fetchMock.mock.calls.filter(([requestUrl]) => String(requestUrl) === url);
    expect(matches[occurrence]).toBeDefined();
    return matches[occurrence]!;
  };

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    window.location.hash = '';
  });

  it('shows the direct connector messaging for ChatGPT entry', () => {
    render(<HoldedOnboardingClient {...baseProps} captureMode={false} requiresVerifiedIdentity />);

    expect(screen.getByText('Conector directo Holded + ChatGPT')).toBeInTheDocument();
    expect(
      screen.getByText('Confirma tu identidad, conecta Holded y vuelve a ChatGPT.')
    ).toBeInTheDocument();
    expect(screen.getByText('Sin login visible.')).toBeInTheDocument();
    expect(screen.getByText('Paso 2: usuario')).toBeInTheDocument();
    expect(screen.getByText(/Correo verificado:/i)).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Pega aqui la API key de Holded para continuar')
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Si tu empresa ya estaba preparada aqui/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Volver' }).length).toBeGreaterThan(0);
  });

  it('keeps the final direct-step button disabled and explains what is missing before validating Holded', () => {
    render(
      <HoldedOnboardingClient
        {...baseProps}
        captureMode={false}
        requiresVerifiedIdentity
        summary={{
          companyName: 'Tu empresa',
          companyLegalName: null,
          companyTaxId: null,
          companyAddress: null,
          companyPostalCode: null,
          companyCity: null,
          companyProvince: null,
          companyCountry: null,
          companyWebsite: null,
          companySectorCode: null,
          companySectorLabel: null,
          contactFirstName: '',
          contactRole: null,
          contactFullName: null,
          contactEmail: 'kiabusiness2025@gmail.com',
          companyEmail: null,
          contactPhone: null,
        }}
        companySetup={{
          hasResolvedCompany: false,
          needsCompanySetup: true,
          requiresCompanyConfirmation: false,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ir al paso 4: API key' }));

    expect(
      screen.getByText('Faltan datos obligatorios antes de validar la conexion:')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Paso 2: completa nombre, apellidos y rol del usuario.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Paso 3: completa razon social, CIF/NIF, domicilio, codigo postal, ciudad, provincia, pais, sector y correo principal.'
      )
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Validar y conectar Holded' })).toBeDisabled();
  });

  it('shows the identity gate and sends a verification email before exposing the API key step', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        ok: true,
        onboardingToken: 'onboarding-token-456',
        identity: { authMethod: 'email', email: 'verified@example.com', emailVerified: false },
      }),
    });

    render(
      <HoldedOnboardingClient
        {...baseProps}
        captureMode={false}
        requiresVerifiedIdentity
        identity={{
          authMethod: 'unknown',
          email: null,
          emailVerified: false,
          firstName: null,
          lastName: null,
          verifiedAt: null,
        }}
        onboardingToken="onboarding-token-123"
      />
    );

    expect(screen.getByText('Paso 1: confirma tu identidad')).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Pega aqui la API key de Holded para continuar')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Sin login visible.')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('tu@empresa.com'), {
      target: { value: 'verified@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar correo' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/onboarding/identity/email/start',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-holded-onboarding-token': 'onboarding-token-123',
          }),
        })
      );
    });

    expect(
      await screen.findByText(/Te hemos enviado un enlace de verificacion/i)
    ).toBeInTheDocument();
  });

  it('unlocks the user step immediately when the same email was already verified', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        ok: true,
        alreadyVerified: true,
        onboardingToken: 'verified-onboarding-token',
        identity: {
          authMethod: 'email',
          email: 'verified@example.com',
          emailVerified: true,
          firstName: 'Ksenia',
          lastName: 'Ivanova Lopez',
          verifiedAt: '2026-04-07T19:00:00.000Z',
        },
      }),
    });

    render(
      <HoldedOnboardingClient
        {...baseProps}
        captureMode={false}
        requiresVerifiedIdentity
        identity={{
          authMethod: 'unknown',
          email: null,
          emailVerified: false,
          firstName: null,
          lastName: null,
          verifiedAt: null,
        }}
        onboardingToken="onboarding-token-123"
      />
    );

    fireEvent.change(screen.getByPlaceholderText('tu@empresa.com'), {
      target: { value: 'verified@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar correo' }));

    expect(await screen.findByText(/Este correo ya estaba confirmado/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Paso 2: usuario')).toBeInTheDocument();
    });
    expect(screen.queryByText('Paso 1: confirma tu identidad')).not.toBeInTheDocument();
  });

  it('lets the user re-check with Siguiente after confirming the email in another device', async () => {
    const identityResponses = [
      {
        ok: true,
        emailSent: true,
        onboardingToken: 'pending-onboarding-token',
        identity: {
          authMethod: 'email',
          email: 'verified@example.com',
          emailVerified: false,
        },
      },
      {
        ok: true,
        alreadyVerified: true,
        emailSent: false,
        onboardingToken: 'verified-onboarding-token',
        identity: {
          authMethod: 'email',
          email: 'verified@example.com',
          emailVerified: true,
          firstName: 'Ksenia',
          lastName: 'Ivanova Lopez',
          verifiedAt: '2026-04-09T11:00:00.000Z',
        },
      },
    ];

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/onboarding/prefill') {
        return {
          ok: true,
          json: jest.fn().mockResolvedValue({
            ok: true,
            summary: null,
            savedPrefill: null,
            tenantIdHint: null,
          }),
        };
      }

      const nextPayload = identityResponses.shift();
      return {
        ok: true,
        json: jest.fn().mockResolvedValue(nextPayload),
      };
    });

    render(
      <HoldedOnboardingClient
        {...baseProps}
        captureMode={false}
        requiresVerifiedIdentity
        identity={{
          authMethod: 'unknown',
          email: null,
          emailVerified: false,
          firstName: null,
          lastName: null,
          verifiedAt: null,
        }}
        onboardingToken="onboarding-token-123"
      />
    );

    fireEvent.change(screen.getByPlaceholderText('tu@empresa.com'), {
      target: { value: 'verified@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(
      await screen.findByText(/Te hemos enviado un enlace de verificacion/i)
    ).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body || '{}'))).toEqual(
      expect.objectContaining({ email: 'verified@example.com', checkOnly: false })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    await waitFor(() => {
      expect(screen.getByText('Paso 2: usuario')).toBeInTheDocument();
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body || '{}'))).toEqual(
      expect.objectContaining({ email: 'verified@example.com', checkOnly: true })
    );
  });

  it('adopts the verified email identity from refreshed props and unlocks the user step', async () => {
    window.history.replaceState(
      {},
      '',
      '/onboarding/holded?identity_verified=1&onboarding_token=verified-onboarding-token'
    );

    const { rerender } = render(
      <HoldedOnboardingClient
        {...baseProps}
        captureMode={false}
        requiresVerifiedIdentity
        identity={{
          authMethod: 'email',
          email: 'verified@example.com',
          emailVerified: false,
          firstName: 'Ksenia',
          lastName: 'Ivanova Lopez',
          verifiedAt: null,
        }}
        onboardingToken="onboarding-token-123"
      />
    );

    expect(screen.getByText('Paso 1: confirma tu identidad')).toBeInTheDocument();

    rerender(
      <HoldedOnboardingClient
        {...baseProps}
        captureMode={false}
        requiresVerifiedIdentity
        identity={{
          authMethod: 'email',
          email: 'verified@example.com',
          emailVerified: true,
          firstName: 'Ksenia',
          lastName: 'Ivanova Lopez',
          verifiedAt: '2026-04-07T16:05:00.000Z',
        }}
        onboardingToken="verified-onboarding-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Paso 2: usuario')).toBeInTheDocument();
    });
    expect(screen.queryByText('Paso 1: confirma tu identidad')).not.toBeInTheDocument();
  });

  it('hydrates remembered company data after email verification and reuses the remembered tenant for status checks', async () => {
    window.history.replaceState(
      {},
      '',
      '/onboarding/holded?identity_verified=1&onboarding_token=verified-onboarding-token'
    );

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          ok: true,
          onboardingToken: 'tenant-bound-token',
          tenantIdHint: 'tenant-owned',
          summary: {
            companyName: 'Empresa Recuperada',
            companyLegalName: 'Empresa Recuperada SL',
            companyTaxId: 'B12345678',
            companyAddress: 'Calle Mayor 1',
            companyPostalCode: '28001',
            companyCity: 'Madrid',
            companyProvince: 'Madrid',
            companyCountry: 'Espana',
            companyWebsite: 'https://empresa-recuperada.es',
            companySectorCode: 'M',
            companySectorLabel: 'Actividades profesionales',
            contactFirstName: 'Ksenia',
            contactRole: null,
            contactFullName: 'Ksenia Ivanova Lopez',
            contactEmail: 'verified@example.com',
            companyEmail: 'admin@empresa-recuperada.es',
            contactPhone: '+34 600 111 222',
          },
          savedPrefill: {
            companyName: 'Empresa Recuperada',
            companyTaxId: 'B12345678',
            contactEmail: 'verified@example.com',
            maskedApiKey: 'hold********123',
            connectionStatus: 'connected',
            lastSyncAt: null,
            lastError: null,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          provider: 'holded',
          status: 'connected',
          lastSyncAt: null,
          lastError: null,
          connected: true,
          degraded: false,
        }),
      });

    render(
      <HoldedOnboardingClient
        {...baseProps}
        captureMode
        nextUrl="https://app.verifactu.business/oauth/authorize?response_type=code&client_id=openai-chatgpt-test&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback"
        requireConnectionConfirmation
        requiresVerifiedIdentity
        onboardingToken="onboarding-token-123"
        tenantIdHint={null}
        summary={{
          companyName: 'Tu empresa',
          companyLegalName: null,
          companyTaxId: null,
          companyAddress: null,
          companyPostalCode: null,
          companyCity: null,
          companyProvince: null,
          companyCountry: null,
          companyWebsite: null,
          companySectorCode: null,
          companySectorLabel: null,
          contactFirstName: '',
          contactRole: null,
          contactFullName: null,
          contactEmail: null,
          companyEmail: null,
          contactPhone: null,
        }}
        companySetup={{
          hasResolvedCompany: false,
          needsCompanySetup: true,
          requiresCompanyConfirmation: false,
        }}
        identity={{
          authMethod: 'email',
          email: 'verified@example.com',
          emailVerified: true,
          firstName: 'Ksenia',
          lastName: 'Ivanova Lopez',
          verifiedAt: '2026-04-09T11:00:00.000Z',
        }}
      />
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/onboarding/prefill',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-holded-onboarding-token': 'verified-onboarding-token',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/integrations/accounting/status?channel=chatgpt',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-isaak-entry-channel': 'chatgpt',
            'x-holded-onboarding-token': 'tenant-bound-token',
            'x-isaak-tenant-id': 'tenant-owned',
          }),
        })
      );
    });

    const continueLink = await screen.findByRole('link', { name: 'Continuar' });
    const redirectHref = continueLink.getAttribute('href') || '';
    expect(redirectHref).toContain('connection_confirmed=1');
    expect(redirectHref).toContain('onboarding_token=tenant-bound-token');
    expect(redirectHref).toContain('tenant_id=tenant-owned');
  });

  it('fills the person step with the Google profile name instead of the email alias', async () => {
    (signInWithPopup as jest.Mock).mockResolvedValue({
      user: {
        getIdToken: jest.fn().mockResolvedValue('google-id-token'),
      },
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        ok: true,
        onboardingToken: 'onboarding-token-456',
        identity: {
          authMethod: 'google',
          email: 'kiabusiness2025@gmail.com',
          emailVerified: true,
          firstName: 'Ksenia',
          lastName: 'Ivanova Lopez',
          name: 'Ksenia Ivanova Lopez',
        },
      }),
    });

    render(
      <HoldedOnboardingClient
        {...baseProps}
        captureMode={false}
        requiresVerifiedIdentity
        onboardingToken="onboarding-token-123"
        summary={{
          companyName: 'Tu empresa',
          companyLegalName: null,
          companyTaxId: null,
          companyAddress: null,
          companyPostalCode: null,
          companyCity: null,
          companyProvince: null,
          companyCountry: null,
          companyWebsite: null,
          companySectorCode: null,
          companySectorLabel: null,
          contactFirstName: '',
          contactRole: null,
          contactFullName: null,
          contactEmail: 'kiabusiness2025@gmail.com',
          companyEmail: null,
          contactPhone: null,
        }}
        companySetup={{
          hasResolvedCompany: false,
          needsCompanySetup: true,
          requiresCompanyConfirmation: false,
        }}
        identity={{
          authMethod: 'unknown',
          email: null,
          emailVerified: false,
          firstName: null,
          lastName: null,
          verifiedAt: null,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/onboarding/identity/google',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-holded-onboarding-token': 'onboarding-token-123',
          }),
        })
      );
    });

    expect(await screen.findByLabelText(/^Nombre/)).toHaveValue('Ksenia');
    expect(screen.getByLabelText(/^Apellidos/)).toHaveValue('Ivanova Lopez');
    expect(screen.getByLabelText(/^Rol en la empresa/)).toHaveValue('');
  });

  it('shows a friendly message when the Google popup closes before finishing', async () => {
    (signInWithPopup as jest.Mock).mockRejectedValue({
      code: 'auth/popup-closed-by-user',
      message: 'Firebase: Error (auth/popup-closed-by-user).',
    });

    render(
      <HoldedOnboardingClient
        {...baseProps}
        captureMode={false}
        requiresVerifiedIdentity
        onboardingToken="onboarding-token-123"
        summary={{
          companyName: 'Tu empresa',
          companyLegalName: null,
          companyTaxId: null,
          companyAddress: null,
          companyPostalCode: null,
          companyCity: null,
          companyProvince: null,
          companyCountry: null,
          companyWebsite: null,
          companySectorCode: null,
          companySectorLabel: null,
          contactFirstName: '',
          contactRole: null,
          contactFullName: null,
          contactEmail: 'kiabusiness2025@gmail.com',
          companyEmail: null,
          contactPhone: null,
        }}
        companySetup={{
          hasResolvedCompany: false,
          needsCompanySetup: true,
          requiresCompanyConfirmation: false,
        }}
        identity={{
          authMethod: 'unknown',
          email: null,
          emailVerified: false,
          firstName: null,
          lastName: null,
          verifiedAt: null,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/i }));

    expect(
      await screen.findByText(
        'La ventana de Google se ha cerrado antes de terminar. Vuelve a intentarlo y permite el popup si tu navegador lo bloquea.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Firebase: Error (auth/popup-closed-by-user).')
    ).not.toBeInTheDocument();
  });

  it('shows a recovery message when the onboarding session expires during Google identity', async () => {
    (signInWithPopup as jest.Mock).mockResolvedValue({
      user: {
        getIdToken: jest.fn().mockResolvedValue('google-id-token'),
      },
    });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({
        ok: false,
        error: 'onboarding session required',
      }),
    });

    render(
      <HoldedOnboardingClient
        {...baseProps}
        captureMode
        requiresVerifiedIdentity
        onboardingToken="onboarding-token-123"
        summary={{
          companyName: 'Tu empresa',
          companyLegalName: null,
          companyTaxId: null,
          companyAddress: null,
          companyPostalCode: null,
          companyCity: null,
          companyProvince: null,
          companyCountry: null,
          companyWebsite: null,
          companySectorCode: null,
          companySectorLabel: null,
          contactFirstName: '',
          contactRole: null,
          contactFullName: null,
          contactEmail: 'kiabusiness2025@gmail.com',
          companyEmail: null,
          contactPhone: null,
        }}
        companySetup={{
          hasResolvedCompany: false,
          needsCompanySetup: true,
          requiresCompanyConfirmation: false,
        }}
        identity={{
          authMethod: 'unknown',
          email: null,
          emailVerified: false,
          firstName: null,
          lastName: null,
          verifiedAt: null,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/i }));

    expect(
      await screen.findByText(
        'Hemos perdido la sesion temporal del conector. Vamos a reiniciar el acceso para continuar.'
      )
    ).toBeInTheDocument();
  });

  it('connects directly after validating the API key when company data is already resolved', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true, tenantId: 'tenant-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true, validationToken: 'validation-token-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      });

    render(<HoldedOnboardingClient {...baseProps} captureMode={false} />);

    advanceToApiStep();

    fireEvent.change(screen.getByPlaceholderText('Pega aqui la API key de Holded para continuar'), {
      target: { value: 'holded-demo-api-key-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Validar y conectar Holded' }));

    await waitFor(() => {
      expect(getFetchCall(fetchMock, '/api/integrations/accounting/validate')[1]).toEqual(
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    await waitFor(() => {
      expect(getFetchCall(fetchMock, '/api/integrations/accounting/connect')[1]).toEqual(
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    expect(
      JSON.parse(String(getFetchCall(fetchMock, '/api/integrations/accounting/validate')[1].body))
    ).toEqual(expect.objectContaining({ acceptedTerms: true, acceptedPrivacy: true }));
    expect(
      JSON.parse(String(getFetchCall(fetchMock, '/api/integrations/accounting/connect')[1].body))
    ).toEqual(expect.objectContaining({ acceptedTerms: true, acceptedPrivacy: true }));

    expect(screen.queryByText('Datos de empresa y contacto')).not.toBeInTheDocument();
    expect(window.location.hash).toBe('#connected');
  });

  it('uses the tenant created in the direct flow when validating and connecting Holded', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true, tenantId: 'tenant-demo' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true, validationToken: 'validation-token-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      });

    render(
      <HoldedOnboardingClient {...baseProps} captureMode={false} tenantIdHint="tenant-demo" />
    );

    advanceToApiStep();

    fireEvent.change(screen.getByPlaceholderText('Pega aqui la API key de Holded para continuar'), {
      target: { value: 'holded-demo-api-key-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Validar y conectar Holded' }));

    await waitFor(() => {
      expect(getFetchCall(fetchMock, '/api/integrations/accounting/validate')[1]).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-isaak-tenant-id': 'tenant-demo',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(getFetchCall(fetchMock, '/api/integrations/accounting/connect')[1]).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-isaak-tenant-id': 'tenant-demo',
          }),
        })
      );
    });
  });

  it('freezes the final ChatGPT step in capture mode instead of redirecting automatically', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true, tenantId: 'tenant-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true, validationToken: 'validation-token-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      });

    render(<HoldedOnboardingClient {...baseProps} captureMode />);

    advanceToApiStep();

    fireEvent.change(screen.getByPlaceholderText('Pega aqui la API key de Holded para continuar'), {
      target: { value: 'holded-demo-api-key-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Validar y conectar Holded' }));

    await waitFor(() => {
      expect(getFetchCall(fetchMock, '/api/integrations/accounting/connect')[1]).toEqual(
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    await screen.findByText('Tu conexion ya esta lista. Volvemos a ChatGPT.');
    expect(screen.getByRole('link', { name: 'Continuar' })).toHaveAttribute('href', '#connected');
    expect(window.location.hash).toBe('');
  });

  it('creates the tenant, validates the key, and connects after the explicit direct steps', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          ok: true,
          tenantId: 'tenant-123',
          onboardingToken: 'onboarding-token-456',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true, validationToken: 'validation-token-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      });

    render(
      <HoldedOnboardingClient
        {...baseProps}
        captureMode={false}
        onboardingToken="onboarding-token-123"
        summary={{
          companyName: 'Tu empresa',
          companyLegalName: null,
          companyTaxId: null,
          companyAddress: null,
          companyPostalCode: null,
          companyCity: null,
          companyProvince: null,
          companyCountry: null,
          companyWebsite: null,
          companySectorCode: null,
          companySectorLabel: null,
          contactFirstName: 'Usuario',
          contactRole: null,
          contactFullName: null,
          contactEmail: null,
          companyEmail: null,
          contactPhone: null,
        }}
        companySetup={{
          hasResolvedCompany: false,
          needsCompanySetup: true,
          requiresCompanyConfirmation: false,
        }}
        identity={{
          authMethod: 'email',
          email: 'kiabusiness2025@gmail.com',
          emailVerified: true,
          firstName: 'Ksenia',
          lastName: 'Ivanova Lopez',
          verifiedAt: '2026-04-06T10:00:00.000Z',
        }}
      />
    );

    fireEvent.change(screen.getByLabelText(/^Nombre/), {
      target: { value: 'Ksenia' },
    });
    fireEvent.change(screen.getByLabelText(/^Apellidos/), {
      target: { value: 'Ivanova Lopez' },
    });
    fireEvent.change(screen.getByLabelText(/^Rol en la empresa/), {
      target: { value: 'owner' },
    });
    fireEvent.change(screen.getByPlaceholderText('600 000 000'), {
      target: { value: '600 111 222' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con empresa' }));
    fireEvent.change(screen.getByLabelText(/^Razon social/), {
      target: { value: 'Empresa Demo SL' },
    });
    fireEvent.change(screen.getByLabelText(/^CIF \/ NIF/), {
      target: { value: 'B12345678' },
    });
    fireEvent.change(screen.getByLabelText(/^Sector \(CNAE base\)/), {
      target: { value: 'M' },
    });
    fireEvent.change(screen.getByLabelText(/^Domicilio/), {
      target: { value: 'Calle Mayor 1' },
    });
    fireEvent.change(screen.getByLabelText(/^Codigo postal/), {
      target: { value: '28001' },
    });
    fireEvent.change(screen.getByLabelText(/^Ciudad/), {
      target: { value: 'Madrid' },
    });
    fireEvent.change(screen.getByLabelText(/^Provincia/), {
      target: { value: 'Madrid' },
    });
    fireEvent.change(screen.getByLabelText(/^Pais/), {
      target: { value: 'Espana' },
    });
    fireEvent.change(screen.getByLabelText(/^Pagina web \(opcional\)/), {
      target: { value: 'https://empresa-demo.es' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con API key' }));
    fireEvent.change(screen.getByPlaceholderText('Pega aqui la API key de Holded para continuar'), {
      target: { value: 'holded-demo-api-key-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Validar y conectar Holded' }));

    await waitFor(() => {
      expect(getFetchCall(fetchMock, '/api/onboarding/tenant')[1]).toEqual(
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    expect(JSON.parse(String(getFetchCall(fetchMock, '/api/onboarding/tenant')[1].body))).toEqual(
      expect.objectContaining({
        country: 'Espana',
        extra: expect.objectContaining({
          representativeRole: 'owner',
          phone: '+34 600 111 222',
          cnaeCode: 'M',
          cnaeText: 'Actividades profesionales, cientificas y tecnicas',
          address: 'Calle Mayor 1',
          postalCode: '28001',
          city: 'Madrid',
          province: 'Madrid',
          country: 'Espana',
          website: 'https://empresa-demo.es',
        }),
      })
    );

    await waitFor(() => {
      expect(getFetchCall(fetchMock, '/api/integrations/accounting/validate')[1]).toEqual(
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-holded-onboarding-token': 'onboarding-token-456',
            'x-isaak-tenant-id': 'tenant-123',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(getFetchCall(fetchMock, '/api/integrations/accounting/connect')[1]).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-isaak-tenant-id': 'tenant-123',
            'x-holded-onboarding-token': 'onboarding-token-456',
          }),
        })
      );
    });
  });

  it('returns to oauth with the refreshed onboarding token after creating the tenant inline', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          ok: true,
          tenantId: 'tenant-123',
          onboardingToken: 'onboarding-token-456',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true, validationToken: 'validation-token-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      });

    render(
      <HoldedOnboardingClient
        {...baseProps}
        captureMode
        nextUrl="https://app.verifactu.business/oauth/authorize?response_type=code&client_id=openai-chatgpt-test&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback"
        requireConnectionConfirmation
        onboardingToken="onboarding-token-123"
        summary={{
          companyName: 'Tu empresa',
          companyLegalName: null,
          companyTaxId: null,
          companyAddress: null,
          companyPostalCode: null,
          companyCity: null,
          companyProvince: null,
          companyCountry: null,
          companyWebsite: null,
          companySectorCode: null,
          companySectorLabel: null,
          contactFirstName: 'Usuario',
          contactRole: null,
          contactFullName: null,
          contactEmail: null,
          companyEmail: null,
          contactPhone: null,
        }}
        companySetup={{
          hasResolvedCompany: false,
          needsCompanySetup: true,
          requiresCompanyConfirmation: false,
        }}
        identity={{
          authMethod: 'email',
          email: 'kiabusiness2025@gmail.com',
          emailVerified: true,
          firstName: 'Ksenia',
          lastName: 'Ivanova Lopez',
          verifiedAt: '2026-04-06T10:00:00.000Z',
        }}
      />
    );

    fireEvent.change(screen.getByLabelText(/^Nombre/), {
      target: { value: 'Ksenia' },
    });
    fireEvent.change(screen.getByLabelText(/^Apellidos/), {
      target: { value: 'Ivanova Lopez' },
    });
    fireEvent.change(screen.getByLabelText(/^Rol en la empresa/), {
      target: { value: 'owner' },
    });
    fireEvent.change(screen.getByPlaceholderText('600 000 000'), {
      target: { value: '600 111 222' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con empresa' }));
    fireEvent.change(screen.getByLabelText(/^Razon social/), {
      target: { value: 'Empresa Demo SL' },
    });
    fireEvent.change(screen.getByLabelText(/^CIF \/ NIF/), {
      target: { value: 'B12345678' },
    });
    fireEvent.change(screen.getByLabelText(/^Sector \(CNAE base\)/), {
      target: { value: 'M' },
    });
    fireEvent.change(screen.getByLabelText(/^Domicilio/), {
      target: { value: 'Calle Mayor 1' },
    });
    fireEvent.change(screen.getByLabelText(/^Codigo postal/), {
      target: { value: '28001' },
    });
    fireEvent.change(screen.getByLabelText(/^Ciudad/), {
      target: { value: 'Madrid' },
    });
    fireEvent.change(screen.getByLabelText(/^Provincia/), {
      target: { value: 'Madrid' },
    });
    fireEvent.change(screen.getByLabelText(/^Pais/), {
      target: { value: 'Espana' },
    });
    fireEvent.change(screen.getByLabelText(/^Pagina web \(opcional\)/), {
      target: { value: 'https://empresa-demo.es' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con API key' }));
    fireEvent.change(screen.getByPlaceholderText('Pega aqui la API key de Holded para continuar'), {
      target: { value: 'holded-demo-api-key-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Validar y conectar Holded' }));

    const continueLink = await screen.findByRole('link', { name: 'Continuar' });
    const redirectHref = continueLink.getAttribute('href') || '';

    expect(redirectHref).toContain('connection_confirmed=1');
    expect(redirectHref).toContain('onboarding_token=onboarding-token-456');
    expect(redirectHref).toContain('tenant_id=tenant-123');
    expect(redirectHref).not.toContain('onboarding-token-123');
  });

  it('auto-forwards to the confirmed oauth return when the chatgpt connection is already active for the resolved company', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        provider: 'holded',
        status: 'connected',
        lastSyncAt: null,
        lastError: null,
        connected: true,
        degraded: false,
      }),
    });

    render(
      <HoldedOnboardingClient
        {...baseProps}
        captureMode
        nextUrl="https://app.verifactu.business/oauth/authorize?response_type=code&client_id=openai-chatgpt-test&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback"
        requireConnectionConfirmation
        onboardingToken="onboarding-token-123"
        tenantIdHint="tenant-demo"
      />
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/integrations/accounting/status?channel=chatgpt',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-isaak-entry-channel': 'chatgpt',
            'x-holded-onboarding-token': 'onboarding-token-123',
            'x-isaak-tenant-id': 'tenant-demo',
          }),
        })
      );
    });

    const continueLink = await screen.findByRole('link', { name: 'Continuar' });
    const redirectHref = continueLink.getAttribute('href') || '';

    expect(
      screen.queryByPlaceholderText('Pega aqui la API key de Holded para continuar')
    ).not.toBeInTheDocument();
    expect(redirectHref).toContain('connection_confirmed=1');
    expect(redirectHref).toContain('onboarding_token=onboarding-token-123');
    expect(redirectHref).toContain('tenant_id=tenant-demo');
  });
});
