export function invoiceToVeriFactuXML(invoice) {
  const { 
    id, 
    number, 
    issueDate, 
    total, 
    tax, 
    customer, 
    issuer,
    verifactu_hash,
    verifactu_qr 
  } = invoice;

  const xmlObject = {
    Facturae: {
      Factura: {
        IDFactura: id,
        NumeroFactura: number,
        FechaExpedicionFactura: issueDate,
        ImporteTotalFactura: total,
        Impuestos: {
          TipoImpositivo: tax.rate,
          CuotaTributaria: tax.amount,
        },
        Cliente: {
          Nombre: customer.name,
          NIF: customer.nif,
        },
        Emisor: {
          Nombre: issuer.name,
          NIF: issuer.nif,
        },
        // Campos VeriFactu
        DatosVeriFactu: {
          HuellaDigital: verifactu_hash,
          CodigoQR: verifactu_qr ? 'incluido' : 'no',
        }
      },
    },
  };

  return xmlObject;
}