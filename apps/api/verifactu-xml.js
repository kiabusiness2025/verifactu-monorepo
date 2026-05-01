function formatAeatDate(value) {
  if (!value) return '';
  if (/^\d{2}-\d{2}-\d{4}$/.test(String(value))) {
    return String(value);
  }
  const date = value instanceof Date ? value : new Date(value);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear());
  return `${day}-${month}-${year}`;
}

function to2(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

export function invoiceToVeriFactuXML(invoice) {
  const number = invoice.number || invoice.id || '';
  const issueDate = formatAeatDate(invoice.issueDate);
  const issuerName = invoice?.issuer?.name || 'Emisor no informado';
  const issuerNif = invoice?.issuer?.nif || invoice?.nif || '';
  const customerName = invoice?.customer?.name || 'Cliente no informado';
  const customerNif = invoice?.customer?.nif || '';
  const taxRate = Number(invoice?.tax?.rate || 0);
  const baseAmount = Number(invoice?.total || 0) - Number(invoice?.tax?.amount || 0);

  return {
    Cabecera: {
      ObligadoEmision: {
        NombreRazon: issuerName,
        NIF: issuerNif,
      },
    },
    RegistroFactura: [
      {
        RegistroAlta: {
          IDVersion: '1.0',
          IDFactura: {
            IDEmisorFactura: issuerNif,
            NumSerieFactura: number,
            FechaExpedicionFactura: issueDate,
          },
          NombreRazonEmisor: issuerName,
          TipoFactura: 'F1',
          DescripcionOperacion: invoice.description || `Factura ${number}`,
          Destinatarios: {
            IDDestinatario: [
              {
                NombreRazon: customerName,
                NIF: customerNif,
              },
            ],
          },
          Desglose: {
            DetalleDesglose: [
              {
                Impuesto: '01',
                ClaveRegimen: '01',
                CalificacionOperacion: 'S1',
                TipoImpositivo: to2(taxRate),
                BaseImponibleOimporteNoSujeto: to2(baseAmount),
                CuotaRepercutida: to2(invoice?.tax?.amount || 0),
              },
            ],
          },
          CuotaTotal: to2(invoice?.tax?.amount || 0),
          ImporteTotal: to2(invoice?.total || 0),
          Encadenamiento: {
            PrimerRegistro: 'S',
          },
          SistemaInformatico: {
            NombreRazon: issuerName,
            NIF: issuerNif,
            NombreSistemaInformatico: 'VerifactuBusiness',
            IdSistemaInformatico: '01',
            Version: '1.0.0',
            NumeroInstalacion: 'CLOUD',
            TipoUsoPosibleSoloVerifactu: 'S',
            TipoUsoPosibleMultiOT: 'N',
            IndicadorMultiplesOT: 'N',
          },
          FechaHoraHusoGenRegistro: new Date().toISOString(),
          TipoHuella: '01',
          Huella: invoice.verifactu_hash || '',
        },
      },
    ],
  };
}
