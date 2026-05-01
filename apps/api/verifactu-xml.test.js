import { invoiceToVeriFactuXML } from './verifactu-xml.js';

describe('invoiceToVeriFactuXML', () => {
  it('should generate a valid VeriFactu object', () => {
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

    const xmlObject = invoiceToVeriFactuXML(invoice);

    expect(xmlObject).toHaveProperty('Cabecera');
    expect(xmlObject.Cabecera.ObligadoEmision.NIF).toBe('A12345678');
    expect(xmlObject).toHaveProperty('RegistroFactura');
    expect(Array.isArray(xmlObject.RegistroFactura)).toBeTruthy();

    const alta = xmlObject.RegistroFactura[0].RegistroAlta;
    expect(alta.IDVersion).toBe('1.0');
    expect(alta.IDFactura.IDEmisorFactura).toBe('A12345678');
    expect(alta.IDFactura.NumSerieFactura).toBe('F2023-0001');
    expect(alta.TipoFactura).toBe('F1');
    expect(alta.ImporteTotal).toBe('121.00');
  });
});
