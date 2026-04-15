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
