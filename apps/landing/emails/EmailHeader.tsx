/**
 * Email Header Component
 * Encabezado reutilizable para todas las plantillas de correo de Verifactu
 */

export function EmailHeader() {
  return (
    <table
      cellPadding="0"
      cellSpacing="0"
      border="0"
      style={{
        fontFamily: 'Arial, sans-serif',
        color: '#1b2a3a',
        marginBottom: '32px',
        borderBottom: '1px solid #e0e6eb',
        paddingBottom: '24px',
      }}
    >
      <tbody>
        <tr>
          <td style={{ paddingRight: '16px', verticalAlign: 'middle' }}>
            <img
              src="https://verifactu.business/brand/logo-horizontal-light.png"
              width="140"
              alt="Verifactu Business"
              style={{
                display: 'block',
                border: '0',
                outline: 'none',
              }}
            />
          </td>
          <td style={{ verticalAlign: 'middle' }}>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#0d2b4a',
              }}
            >
              Soporte | Verifactu Business
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#1b2a3a',
                marginTop: '4px',
              }}
            >
              soporte@verifactu.business
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#1b2a3a',
                marginTop: '2px',
              }}
            >
              verifactu.business
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#6b7c8a',
                marginTop: '8px',
              }}
            >
              Registro de usuarios y comunicaciones generales
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Email Footer Component
 * Pie de página reutilizable
 */
export function EmailFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <div
      style={{
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: '1px solid #e0e6eb',
        fontSize: '12px',
        color: '#6b7c8a',
        textAlign: 'center',
      }}
    >
      <p style={{ margin: '0 0 8px 0' }}>
        © {currentYear} Verifactu Business. Todos los derechos reservados.
      </p>
      <p style={{ margin: '0 0 12px 0', lineHeight: '1.6' }}>
        Si tienes preguntas, contáctanos en{' '}
        <a
          href="mailto:soporte@verifactu.business"
          style={{ color: '#0060F0', textDecoration: 'none' }}
        >
          soporte@verifactu.business
        </a>
      </p>
      <p style={{ margin: '0', fontSize: '11px', color: '#9ca8b3' }}>
        <a
          href="https://verifactu.business/privacy"
          style={{ color: '#6b7c8a', textDecoration: 'none', marginRight: '16px' }}
        >
          Política de privacidad
        </a>
        <a
          href="https://verifactu.business/terms"
          style={{ color: '#6b7c8a', textDecoration: 'none' }}
        >
          Términos de servicio
        </a>
      </p>
    </div>
  );
}

/**
 * Email Container
 * Wrapper principal para todas las plantillas
 */
export function EmailContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f8f9fa',
        padding: '32px 16px',
      }}
    >
      <table
        cellPadding="0"
        cellSpacing="0"
        border="0"
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(13, 43, 74, 0.08)',
          overflow: 'hidden',
        }}
      >
        <tbody>
          <tr>
            <td style={{ padding: '32px 24px' }}>
              {children}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * CTA Button
 * Botón de llamada a acción
 */
export function CTAButton({
  href,
  text,
  variant = 'primary',
}: {
  href: string;
  text: string;
  variant?: 'primary' | 'secondary';
}) {
  const isPrimary = variant === 'primary';

  return (
    <table
      cellPadding="0"
      cellSpacing="0"
      border="0"
      style={{
        margin: '24px 0',
      }}
    >
      <tbody>
        <tr>
          <td
            style={{
              borderRadius: '6px',
              backgroundColor: isPrimary ? '#0060F0' : '#f0f3f7',
              padding: '12px 24px',
              textAlign: 'center',
            }}
          >
            <a
              href={href}
              style={{
                color: isPrimary ? '#ffffff' : '#0060F0',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: '14px',
                display: 'inline-block',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              {text}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
