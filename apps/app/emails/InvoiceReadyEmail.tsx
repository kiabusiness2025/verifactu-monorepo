import { EmailContainer, EmailHeader, CTAButton } from '../landing/emails/EmailHeader';

interface InvoiceReadyEmailProps {
  userName: string;
  invoiceNumber: string;
  invoiceAmount: string;
  invoiceDate: string;
  downloadLink: string;
}

/**
 * Email: Factura lista para descargar
 */
export function InvoiceReadyEmailTemplate({
  userName,
  invoiceNumber,
  invoiceAmount,
  invoiceDate,
  downloadLink,
}: InvoiceReadyEmailProps) {
  return (
    <EmailContainer>
      <EmailHeader />

      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#0d2b4a',
            margin: '0 0 16px 0',
            lineHeight: '1.2',
          }}
        >
          📄 Tu factura está lista
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#1b2a3a',
            margin: '0 0 24px 0',
            lineHeight: '1.6',
          }}
        >
          Hola <strong>{userName}</strong>, tu factura ha sido generada y está disponible para descargar.
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#f0f3f7',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <table style={{ width: '100%', fontSize: '14px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px 0', color: '#6b7c8a' }}>Número de factura:</td>
              <td style={{ padding: '8px 0', color: '#0d2b4a', fontWeight: '600' }}>
                {invoiceNumber}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', color: '#6b7c8a' }}>Fecha:</td>
              <td style={{ padding: '8px 0', color: '#0d2b4a', fontWeight: '600' }}>
                {invoiceDate}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', color: '#6b7c8a' }}>Importe:</td>
              <td style={{ padding: '8px 0', color: '#0d2b4a', fontWeight: '600', fontSize: '18px' }}>
                {invoiceAmount}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <CTAButton href={downloadLink} text="Descargar Factura" variant="primary" />

      <div
        style={{
          backgroundColor: '#e8f4ff',
          borderLeft: '4px solid #0060F0',
          padding: '16px',
          marginTop: '24px',
          borderRadius: '4px',
        }}
      >
        <p
          style={{
            fontSize: '14px',
            color: '#0d2b4a',
            margin: '0',
            lineHeight: '1.6',
          }}
        >
          💡 <strong>Recordatorio:</strong> Esta factura se almacena automáticamente en tu dashboard y cumple con todas las normativas fiscales vigentes.
        </p>
      </div>
    </EmailContainer>
  );
}
