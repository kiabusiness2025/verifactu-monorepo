/** @jest-environment jsdom */
/* eslint-disable @next/next/no-img-element */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt || ''} />,
}));

import HoldedOnboardingClient from './HoldedOnboardingClient';

const baseProps = {
  entryChannel: 'chatgpt' as const,
  nextUrl: '#connected',
  onboardingToken: null,
  requireConnectionConfirmation: false,
  summary: {
    companyName: 'ALVILS ESP',
    companyLegalName: 'ALVILS ESP SL',
    companyTaxId: 'B12345678',
    contactFirstName: 'Ksenia',
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

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    window.location.hash = '';
  });

  it('connects directly after validating the API key when company data is already resolved', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ ok: true }),
    });

    render(<HoldedOnboardingClient {...baseProps} captureMode={false} />);

    fireEvent.change(screen.getByPlaceholderText('Pega aqui la API key de Holded para continuar'), {
      target: { value: 'holded-demo-api-key-123' },
    });
    fireEvent.click(screen.getByLabelText(/Acepto los Terminos de verifactu\.business/i));
    fireEvent.click(
      screen.getByLabelText(/Acepto la Politica de Privacidad de verifactu\.business/i)
    );
    fireEvent.click(screen.getByRole('button', { name: 'Validar y conectar Holded' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        '/api/integrations/accounting/validate',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        '/api/integrations/accounting/connect',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    expect(screen.queryByText('Datos de empresa y contacto')).not.toBeInTheDocument();
    expect(window.location.hash).toBe('#connected');
  });

  it('freezes the final ChatGPT step in capture mode instead of redirecting automatically', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ ok: true }),
    });

    render(<HoldedOnboardingClient {...baseProps} captureMode />);

    fireEvent.change(screen.getByPlaceholderText('Pega aqui la API key de Holded para continuar'), {
      target: { value: 'holded-demo-api-key-123' },
    });
    fireEvent.click(screen.getByLabelText(/Acepto los Terminos de verifactu\.business/i));
    fireEvent.click(
      screen.getByLabelText(/Acepto la Politica de Privacidad de verifactu\.business/i)
    );
    fireEvent.click(screen.getByRole('button', { name: 'Validar y conectar Holded' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        '/api/integrations/accounting/connect',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    await screen.findByText('Tu conexion ya esta lista. Te devolvemos a ChatGPT.');
    expect(screen.getByRole('link', { name: 'Continuar' })).toHaveAttribute('href', '#connected');
    expect(window.location.hash).toBe('');
  });
});
