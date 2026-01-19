import { EmailContainer, EmailHeader, CTAButton } from '../landing/emails/EmailHeader';

interface MonthlyReportEmailProps {
  userName: string;
  month: string;
  year: string;
  totalInvoices: number;
  totalRevenue: string;
  totalExpenses: string;
  netProfit: string;
  dashboardLink: string;
}

/**
 * Email: Reporte mensual de actividad
 */
export function MonthlyReportEmailTemplate({
  userName,
  month,
  year,
  totalInvoices,
  totalRevenue,
  totalExpenses,
  netProfit,
  dashboardLink,
}: MonthlyReportEmailProps) {
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
          📊 Reporte mensual - {month} {year}
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#1b2a3a',
            margin: '0 0 24px 0',
            lineHeight: '1.6',
          }}
        >
          Hola <strong>{userName}</strong>, aquí está tu resumen de actividad del mes pasado.
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
        <h3
          style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#0d2b4a',
            margin: '0 0 16px 0',
          }}
        >
          Resumen financiero
        </h3>
        <table style={{ width: '100%', fontSize: '14px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '12px 0', color: '#6b7c8a', borderBottom: '1px solid #e1e4e8' }}>
                Facturas emitidas:
              </td>
              <td style={{ padding: '12px 0', color: '#0d2b4a', fontWeight: '600', textAlign: 'right', borderBottom: '1px solid #e1e4e8' }}>
                {totalInvoices}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '12px 0', color: '#6b7c8a', borderBottom: '1px solid #e1e4e8' }}>
                Ingresos totales:
              </td>
              <td style={{ padding: '12px 0', color: '#22c55e', fontWeight: '600', textAlign: 'right', borderBottom: '1px solid #e1e4e8' }}>
                {totalRevenue}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '12px 0', color: '#6b7c8a', borderBottom: '1px solid #e1e4e8' }}>
                Gastos totales:
              </td>
              <td style={{ padding: '12px 0', color: '#ef4444', fontWeight: '600', textAlign: 'right', borderBottom: '1px solid #e1e4e8' }}>
                {totalExpenses}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '12px 0', color: '#0d2b4a', fontWeight: '700' }}>
                Beneficio neto:
              </td>
              <td style={{ padding: '12px 0', color: '#0d2b4a', fontWeight: '700', fontSize: '18px', textAlign: 'right' }}>
                {netProfit}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <CTAButton href={dashboardLink} text="Ver Detalles en Dashboard" variant="primary" />

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
          💡 <strong>Consejo:</strong> Revisa tus gastos recurrentes y optimiza tus ingresos consultando con Isaak, tu asistente financiero.
        </p>
      </div>
    </EmailContainer>
  );
}
