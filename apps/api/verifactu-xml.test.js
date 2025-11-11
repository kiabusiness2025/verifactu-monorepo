const { invoiceToVeriFactuXML } = require("./verifactu-xml.js");

describe("invoiceToVeriFactuXML", () => {
  it("should generate a valid VeriFactu XML", () => {
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

    const xml = invoiceToVeriFactuXML(invoice);

    expect(xml).toContain("<Facturae>");
    expect(xml).toContain("<IDFactura>F2023-0001</IDFactura>");
    expect(xml).toContain("<NumeroFactura>F2023-0001</NumeroFactura>");
    expect(xml).toContain("<FechaExpedicionFactura>2023-10-27T10:00:00Z</FechaExpedicionFactura>");
    expect(xml).toContain("<ImporteTotalFactura>121</ImporteTotalFactura>");
    expect(xml).toContain("<TipoImpositivo>0.21</TipoImpositivo>");
    expect(xml).toContain("<CuotaTributaria>21</CuotaTributaria>");
    expect(xml).toContain("<Nombre>Cliente de Prueba</Nombre>");
    expect(xml).toContain("<NIF>12345678Z</NIF>");
    expect(xml).toContain("<Nombre>Mi Empresa</Nombre>");
    expect(xml).toContain("<NIF>A12345678</NIF>");
  });
});
