function invoiceToVeriFactuXML(invoice) {
  const { id, number, issueDate, total, tax, customer, issuer } = invoice;

  const xml = `
    <Facturae>
      <Factura>
        <IDFactura>${id}</IDFactura>
        <NumeroFactura>${number}</NumeroFactura>
        <FechaExpedicionFactura>${issueDate}</FechaExpedicionFactura>
        <ImporteTotalFactura>${total}</ImporteTotalFactura>
        <Impuestos>
          <TipoImpositivo>${tax.rate}</TipoImpositivo>
          <CuotaTributaria>${tax.amount}</CuotaTributaria>
        </Impuestos>
        <Cliente>
          <Nombre>${customer.name}</Nombre>
          <NIF>${customer.nif}</NIF>
        </Cliente>
        <Emisor>
          <Nombre>${issuer.name}</Nombre>
          <NIF>${issuer.nif}</NIF>
        </Emisor>
      </Factura>
    </Facturae>
  `;

  return xml;
}

module.exports = {
  invoiceToVeriFactuXML,
};