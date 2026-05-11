import fs from 'fs';
import soap from 'soap';
import { getClient, queryInvoice, registerInvoice, resetClient } from './soap-client.js';

// Mock the soap library
jest.mock('soap', () => {
  const createClientAsync = jest.fn();
  const ClientSSLSecurityPFX = jest.fn(function ClientSSLSecurityPFX(pfx, passphrase, options) {
    this.pfx = pfx;
    this.passphrase = passphrase;
    this.options = options;
  });

  return {
    __esModule: true,
    default: {
      createClientAsync,
      ClientSSLSecurityPFX,
    },
    createClientAsync,
    ClientSSLSecurityPFX,
  };
});

// Mock the fs library
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

describe('SOAP Client', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    resetClient();
  });

  describe('getClient', () => {
    it('should create a SOAP client', async () => {
      // Mock the return values of fs.readFileSync
      fs.readFileSync.mockReturnValueOnce('cert-content');
      fs.readFileSync.mockReturnValueOnce('password');
      fs.readFileSync.mockReturnValueOnce('http://aeat.es/wsdl/VeriFactu.wsdl');

      // Mock the return value of soap.createClientAsync
      const mockClient = {
        setSecurity: jest.fn(),
        RegFactuSistemaFacturacionAsync: jest.fn(),
        ConsultaFactuSistemaFacturacionAsync: jest.fn(),
      };
      soap.createClientAsync.mockResolvedValue(mockClient);

      const client = await getClient();

      expect(fs.readFileSync).toHaveBeenCalledWith('/var/secrets/aeat_wsdl/wsdl_url.txt', 'utf8');
      expect(fs.readFileSync).toHaveBeenCalledWith('/var/secrets/aeat_cert/cert.p12');
      expect(fs.readFileSync).toHaveBeenCalledWith('/var/secrets/aeat_pass/cert_pass.txt', 'utf8');
      expect(soap.createClientAsync).toHaveBeenCalledWith('http://aeat.es/wsdl/VeriFactu.wsdl', {
        pfx: 'cert-content',
        passphrase: 'password',
        wsdl_options: {
          pfx: 'cert-content',
          passphrase: 'password',
          rejectUnauthorized: true,
        },
      });
      expect(soap.ClientSSLSecurityPFX).toHaveBeenCalledWith('cert-content', 'password', {
        rejectUnauthorized: true,
      });
      expect(mockClient.setSecurity).toHaveBeenCalledWith(expect.any(soap.ClientSSLSecurityPFX));
      expect(client).toBe(mockClient);
    });
  });

  describe('registerInvoice', () => {
    it('should register an invoice', async () => {
      // Mock the return values of fs.readFileSync
      fs.readFileSync.mockReturnValueOnce('cert-content');
      fs.readFileSync.mockReturnValueOnce('password');
      fs.readFileSync.mockReturnValueOnce('http://aeat.es/wsdl/VeriFactu.wsdl');

      // Mock the return value of soap.createClientAsync
      const mockClient = {
        setSecurity: jest.fn(),
        RegFactuSistemaFacturacionAsync: jest.fn().mockResolvedValue('result'),
      };
      soap.createClientAsync.mockResolvedValue(mockClient);

      const invoice = {
        id: 'F2023-0001',
        number: 'F2023-0001',
        issueDate: '2023-10-27T10:00:00Z',
        total: 121,
        tax: {
          rate: 0.21,
          amount: 21,
        },
        customer: {
          name: 'Cliente de Prueba',
          nif: '12345678Z',
        },
        issuer: {
          name: 'Mi Empresa',
          nif: 'A12345678',
        },
      };

      const result = await registerInvoice(invoice);

      expect(mockClient.RegFactuSistemaFacturacionAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          Cabecera: expect.objectContaining({
            ObligadoEmision: expect.objectContaining({
              NIF: 'A12345678',
              NombreRazon: 'Mi Empresa',
            }),
          }),
          RegistroFactura: [
            expect.objectContaining({
              RegistroAlta: expect.objectContaining({
                IDFactura: expect.objectContaining({
                  NumSerieFactura: 'F2023-0001',
                }),
                ImporteTotal: '121.00',
              }),
            }),
          ],
        })
      );
      expect(result).toBe('result');
    });
  });

  describe('queryInvoice', () => {
    it('should query an invoice', async () => {
      // Mock the return values of fs.readFileSync
      fs.readFileSync.mockReturnValueOnce('cert-content');
      fs.readFileSync.mockReturnValueOnce('password');
      fs.readFileSync.mockReturnValueOnce('http://aeat.es/wsdl/VeriFactu.wsdl');

      // Mock the return value of soap.createClientAsync
      const mockClient = {
        setSecurity: jest.fn(),
        ConsultaFactuSistemaFacturacionAsync: jest.fn().mockResolvedValue('result'),
      };
      soap.createClientAsync.mockResolvedValue(mockClient);

      const query = {
        nif: 'A12345678',
        invoiceId: 'F2023-0001',
      };

      const result = await queryInvoice(query);

      expect(mockClient.ConsultaFactuSistemaFacturacionAsync).toHaveBeenCalledWith({
        datosConsulta: query,
      });
      expect(result).toBe('result');
    });
  });
});
