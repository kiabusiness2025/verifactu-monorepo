import { CTAButton, EmailContainer, EmailHeader } from '../../landing/emails/EmailHeader';

interface SupportTicketEmailProps {
  userName: string;
  ticketNumber: string;
  ticketSubject: string;
  ticketStatus: 'open' | 'in-progress' | 'resolved';
  ticketLink: string;
  message?: string;
}

/**
 * Email: Actualización de ticket de soporte
 */
export function SupportTicketEmailTemplate({
  userName,
  ticketNumber,
  ticketSubject,
  ticketStatus,
  ticketLink,
  message,
}: SupportTicketEmailProps) {
  const statusMap = {
    open: { text: 'Abierto', color: '#fbbf24', emoji: '🔔' },
    'in-progress': { text: 'En progreso', color: '#3b82f6', emoji: '⚙️' },
    resolved: { text: 'Resuelto', color: '#22c55e', emoji: '✅' },
  };

  const status = statusMap[ticketStatus];

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
          {status.emoji} Ticket de soporte actualizado
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#1b2a3a',
            margin: '0 0 24px 0',
            lineHeight: '1.6',
          }}
        >
          Hola <strong>{userName}</strong>, hay una actualización en tu ticket de soporte.
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
              <td style={{ padding: '8px 0', color: '#6b7c8a' }}>Ticket:</td>
              <td style={{ padding: '8px 0', color: '#0d2b4a', fontWeight: '600' }}>
                #{ticketNumber}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', color: '#6b7c8a' }}>Asunto:</td>
              <td style={{ padding: '8px 0', color: '#0d2b4a', fontWeight: '600' }}>
                {ticketSubject}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', color: '#6b7c8a' }}>Estado:</td>
              <td style={{ padding: '8px 0' }}>
                <span
                  style={{
                    display: 'inline-block',
                    backgroundColor: status.color,
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {status.text}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {message && (
        <div
          style={{
            backgroundColor: '#e8f4ff',
            borderLeft: '4px solid #0060F0',
            padding: '16px',
            marginBottom: '24px',
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
            <strong>Mensaje del equipo:</strong>
            <br />
            {message}
          </p>
        </div>
      )}

      <CTAButton href={ticketLink} text="Ver Detalles del Ticket" variant="primary" />
    </EmailContainer>
  );
}
