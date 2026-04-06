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

  it('shows the direct connector messaging for ChatGPT entry', () => {
    render(<HoldedOnboardingClient {...baseProps} captureMode={false} />);

    expect(screen.getByText('Conector directo Holded + ChatGPT')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Esta pantalla valida tu API key de Holded, prepara la empresa y te devuelve a ChatGPT sin mostrarte login ni registro.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Sin login visible ni registro en este paso.')).toBeInTheDocument();
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

    await screen.findByText('Tu conexion ya esta lista. Volvemos a ChatGPT.');
    expect(screen.getByRole('link', { name: 'Continuar' })).toHaveAttribute('href', '#connected');
    expect(window.location.hash).toBe('');
  });

  it('submits the direct connector form in one pass when the company is not resolved yet', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true, validationToken: 'validation-token-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true, tenantId: 'tenant-123' }),
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
          contactFirstName: 'Usuario',
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
      />
    );

    fireEvent.change(screen.getByLabelText('Empresa'), {
      target: { value: 'Empresa Demo SL' },
    });
    fireEvent.change(screen.getByLabelText('NIF / CIF'), {
      target: { value: 'B12345678' },
    });
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Ksenia' },
    });
    fireEvent.change(screen.getByLabelText('Apellidos'), {
      target: { value: 'Ivanova Lopez' },
    });
    fireEvent.change(screen.getByLabelText('Correo'), {
      target: { value: 'kiabusiness2025@gmail.com' },
    });
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
          headers: expect.objectContaining({
            'x-holded-onboarding-token': 'onboarding-token-123',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        '/api/onboarding/tenant',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        '/api/integrations/accounting/connect',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-isaak-tenant-id': 'tenant-123',
            'x-holded-onboarding-token': 'onboarding-token-123',
          }),
        })
      );
    });

    expect(
      fetchMock.mock.calls.find((call) => call[0] === '/api/session/tenant-switch')
    ).toBeUndefined();
    expect(window.location.hash).toBe('#connected');
  });
});
