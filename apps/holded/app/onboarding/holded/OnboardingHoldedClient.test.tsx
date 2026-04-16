/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
const mockMintSessionCookie = jest.fn();

jest.mock('@/app/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

jest.mock('@/app/lib/serverSession', () => ({
  mintSessionCookie: (...args: unknown[]) => mockMintSessionCookie(...args),
}));

import OnboardingHoldedClient, { buildHoldedReauthHref } from './OnboardingHoldedClient';

const defaultProps = {
  channel: 'dashboard' as const,
  nextTarget: '/onboarding/success',
  initialIdentity: {
    companyName: 'Acme SL',
    legalName: 'Acme Sociedad Limitada',
    taxId: 'B12345678',
    contactFirstName: 'Ana',
    contactLastName: 'Garcia',
    contactRole: 'Administrador',
    contactEmail: 'ana@example.com',
    contactPhone: '+34600111222',
  },
};

describe('OnboardingHoldedClient', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    mockMintSessionCookie.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    window.history.pushState({}, '', '/onboarding/holded?channel=dashboard');
  });

  it('starts directly at API key step to reduce friction', () => {
    render(<OnboardingHoldedClient {...defaultProps} />);

    // Always-visible header elements
    expect(screen.getAllByText('Conector Holded')[0]).toBeInTheDocument();
    expect(screen.getByText('Conecta tu cuenta de Holded')).toBeInTheDocument();

    // API key and consent are visible immediately
    expect(screen.getByText('API key de Holded')).toBeInTheDocument();
    expect(screen.getByText(/Confirmo que puedo conectar esta empresa/i)).toBeInTheDocument();
  });

  it('starts from step 1 with prefilled editable fields when reset mode is enabled', () => {
    render(<OnboardingHoldedClient {...defaultProps} forceFullReset />);

    expect(screen.getByText('Nombre y apellidos')).toBeInTheDocument();
    expect(screen.queryByText('API key de Holded')).not.toBeInTheDocument();

    const continueButton = screen.getByRole('button', { name: 'Continuar' });
    expect(continueButton).toBeEnabled();
    expect(screen.getByPlaceholderText('Tu nombre')).toHaveValue('Ana');
    expect(screen.getByPlaceholderText('Tus apellidos')).toHaveValue('Garcia');
  });

  it('keeps API key first when ChatGPT flow is reset', () => {
    render(<OnboardingHoldedClient {...defaultProps} channel="chatgpt" forceFullReset />);

    expect(screen.getByText('API key de Holded')).toBeInTheDocument();
    expect(screen.queryByText('Nombre y apellidos')).not.toBeInTheDocument();
  });

  it('allows continuing from company step without NIF/CIF or razon social', () => {
    render(<OnboardingHoldedClient {...defaultProps} forceFullReset />);

    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), {
      target: { value: 'Ana' },
    });
    fireEvent.change(screen.getByPlaceholderText('Tus apellidos'), {
      target: { value: 'Garcia' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    fireEvent.change(screen.getByPlaceholderText('Tu empresa'), {
      target: { value: 'Acme SL' },
    });
    fireEvent.change(screen.getByPlaceholderText('nombre@empresa.com'), {
      target: { value: 'ana@acme.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con API key' }));

    expect(screen.getByText('API key de Holded')).toBeInTheDocument();
  });

  it('shows explicit step-2 errors when optional fields are filled with invalid format', () => {
    render(<OnboardingHoldedClient {...defaultProps} forceFullReset />);

    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), {
      target: { value: 'Ana' },
    });
    fireEvent.change(screen.getByPlaceholderText('Tus apellidos'), {
      target: { value: 'Garcia' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    fireEvent.change(screen.getByPlaceholderText('Tu empresa'), {
      target: { value: 'Acme SL' },
    });
    fireEvent.change(screen.getByPlaceholderText('nombre@empresa.com'), {
      target: { value: 'ana@acme.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('B12345678'), {
      target: { value: '??' },
    });
    fireEvent.change(screen.getByPlaceholderText('Si coincide con el nombre, dejalo vacio'), {
      target: { value: 'A' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continuar con API key' }));

    expect(
      screen.getByText('El NIF/CIF tiene un formato invalido. Corrigelo o dejalo vacio por ahora.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('La razon social parece incompleta. Ampliala o dejala vacia.')
    ).toBeInTheDocument();
  });

  it('enables submit when identity and api key are valid', () => {
    render(<OnboardingHoldedClient {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Pega aqui la API key generada en Holded'), {
      target: { value: 'abcdefghijklmnop' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /confirmo que puedo conectar esta empresa/i,
      })
    );

    expect(screen.getByRole('button', { name: 'Validar y conectar' })).toBeEnabled();
  });

  it('runs validate then connect with company and contact data', async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ ok: true, validationToken: 'token-123' }),
      })
      .mockResolvedValueOnce({
        status: 400,
        ok: false,
        json: async () => ({ ok: false, error: 'Error de prueba en connect' }),
      });

    render(<OnboardingHoldedClient {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Pega aqui la API key generada en Holded'), {
      target: { value: 'abcdefghijklmnop' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /confirmo que puedo conectar esta empresa/i,
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Validar y conectar' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/holded/validate',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/holded/connect',
      expect.objectContaining({ method: 'POST' })
    );

    const connectBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(connectBody).toEqual(
      expect.objectContaining({
        companyName: 'Acme SL',
        legalName: 'Acme Sociedad Limitada',
        taxId: 'B12345678',
        contactFirstName: 'Ana',
        contactLastName: 'Garcia',
        contactRole: 'Administrador',
        contactEmail: 'ana@example.com',
        contactPhone: '+34600111222',
        notificationEmail: 'ana@example.com',
        validationToken: 'token-123',
        acceptedTerms: true,
        acceptedPrivacy: true,
        authorizationConfirmed: true,
      })
    );
    expect(screen.getByText('Error de prueba en connect')).toBeInTheDocument();
  });

  it('builds the expected reauth url for session recovery after a 401', async () => {
    expect(
      buildHoldedReauthHref({
        origin: 'https://holded.verifactu.business',
        pathname: '/onboarding/holded',
        search: '?channel=dashboard',
      })
    ).toBe(
      '/auth/holded?source=holded_onboarding_retry&next=%2Fonboarding%2Fholded%3Fchannel%3Ddashboard'
    );
  });
});
