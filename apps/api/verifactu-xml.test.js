import { invoiceToVeriFactuXML } from "./verifactu-xml.js";

describe("invoiceToVeriFactuXML", () => {
  it("should generate a valid VeriFactu object", () => {
    const invoice = {
      id: "F2023-0001",
      number: "F2023-0001",
      issueDate: "2023-10-27T10:00:00Z",
      total: 121,
      tax: {
        rate: 0.21,
        amount: 21,
      },
      customer: {
        name: "Cliente de Prueba",
        nif: "12345678Z",
      },
      issuer: {
        name: "Mi Empresa",
        nif: "A12345678",
      },
    };

    const xmlObject = invoiceToVeriFactuXML(invoice);

    expect(xmlObject).toHaveProperty("Facturae");
    expect(xmlObject.Facturae).toHaveProperty("Factura");
    const factura = xmlObject.Facturae.Factura;
    expect(factura.IDFactura).toBe("F2023-0001");
    expect(factura.NumeroFactura).toBe("F2023-0001");
    expect(factura.FechaExpedicionFactura).toBe("2023-10-27T10:00:00Z");
    expect(factura.ImporteTotalFactura).toBe(121);
    expect(factura.Impuestos.TipoImpositivo).toBe(0.21);
    expect(factura.Impuestos.CuotaTributaria).toBe(21);
    expect(factura.Cliente.Nombre).toBe("Cliente de Prueba");
    expect(factura.Cliente.NIF).toBe("12345678Z");
    expect(factura.Emisor.Nombre).toBe("Mi Empresa");
    expect(factura.Emisor.NIF).toBe("A12345678");
  });
});
