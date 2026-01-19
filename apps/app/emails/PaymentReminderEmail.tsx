import { EmailContainer, EmailHeader, CTAButton } from '../landing/emails/EmailHeader';

interface PaymentReminderEmailProps {
  userName: string;
  companyName: string;
  invoiceNumber: string;
  invoiceAmount: string;
  dueDate: string;
  paymentLink: string;
}

/**
 * Email: Recordatorio de pago pendiente
 */
export function PaymentReminderEmailTemplate({
  userName,
  companyName,
  invoiceNumber,
  invoiceAmount,
  dueDate,
  paymentLink,
}: PaymentReminderEmailProps) {
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
          ⏰ Recordatorio de pago
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#1b2a3a',
            margin: '0 0 24px 0',
            lineHeight: '1.6',
          }}
        >
          Hola <strong>{userName}</strong>, te recordamos que tienes un pago pendiente con <strong>{companyName}</strong>.
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#fff3cd',
          borderLeft: '4px solid #ffc107',
          padding: '16px',
          marginBottom: '24px',
          borderRadius: '4px',
        }}
      >
        <p
          style={{
            fontSize: '14px',
            color: '#856404',
            margin: '0',
            lineHeight: '1.6',
            fontWeight: '600',
          }}
        >
          ⚠️ Fecha de vencimiento: <strong>{dueDate}</strong>
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
              <td style={{ padding: '8px 0', color: '#6b7c8a' }}>Factura:</td>
              <td style={{ padding: '8px 0', color: '#0d2b4a', fontWeight: '600' }}>
                {invoiceNumber}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', color: '#6b7c8a' }}>Importe a pagar:</td>
              <td style={{ padding: '8px 0', color: '#0d2b4a', fontWeight: '600', fontSize: '18px' }}>
                {invoiceAmount}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <CTAButton href={paymentLink} text="Realizar Pago" variant="primary" />

      <p
        style={{
          fontSize: '13px',
          color: '#6b7c8a',
          margin: '24px 0 0 0',
          lineHeight: '1.6',
          textAlign: 'center',
        }}
      >
        Si ya realizaste el pago, por favor ignora este mensaje.
      </p>
    </EmailContainer>
  );
}
