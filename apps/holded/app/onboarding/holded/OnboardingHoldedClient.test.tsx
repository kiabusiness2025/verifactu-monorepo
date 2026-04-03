/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockSearchParamGet = jest.fn();
const mockMintSessionCookie = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockSearchParamGet,
  }),
}));

jest.mock('@/app/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

jest.mock('@/app/lib/serverSession', () => ({
  mintSessionCookie: (...args: unknown[]) => mockMintSessionCookie(...args),
}));

import OnboardingHoldedClient, { buildHoldedReauthHref } from './OnboardingHoldedClient';

describe('OnboardingHoldedClient', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    mockSearchParamGet.mockReset();
    mockSearchParamGet.mockReturnValue(null);
    mockMintSessionCookie.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    window.history.pushState({}, '', '/onboarding/holded?channel=dashboard');
  });

  it('shows the session email as a read-only notification target', () => {
    render(<OnboardingHoldedClient sessionEmail="ana@example.com" />);

    const input = screen.getByLabelText('Correo para avisarte cuando quede conectado');

    expect(input).toHaveValue('ana@example.com');
    expect(input).toHaveAttribute('readonly');
    expect(screen.getByText('Usaremos el correo de tu acceso actual.')).toBeInTheDocument();
  });

  it('allows entering a fallback notification email when there is no session email', () => {
    render(<OnboardingHoldedClient sessionEmail={null} />);

    const input = screen.getByLabelText('Correo para avisarte cuando quede conectado');

    fireEvent.change(input, { target: { value: 'equipo@example.com' } });

    expect(input).toHaveValue('equipo@example.com');
    expect(input).not.toHaveAttribute('readonly');
  });

  it('allows connecting with a valid api key and email even before manual validation', () => {
    render(<OnboardingHoldedClient sessionEmail={null} />);

    fireEvent.change(screen.getByPlaceholderText('Pega aqui la API key generada en Holded'), {
      target: { value: 'abcdefghijklmnop' },
    });
    fireEvent.change(screen.getByLabelText('Correo para avisarte cuando quede conectado'), {
      target: { value: 'equipo@example.com' },
    });

    expect(screen.getByRole('button', { name: 'Conectar Holded' })).toBeEnabled();
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
