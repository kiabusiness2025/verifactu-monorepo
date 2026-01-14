import { EmailContainer, EmailHeader, EmailFooter, CTAButton } from './EmailHeader';

interface ResetPasswordEmailProps {
  userName: string;
  resetLink: string;
  expiryMinutes?: number;
}

/**
 * Email: Recuperación de contraseña
 * Se envía cuando el usuario solicita restablecer su contraseña
 */
export function ResetPasswordEmailTemplate({
  userName,
  resetLink,
  expiryMinutes = 60,
}: ResetPasswordEmailProps) {
  return (
    <EmailContainer>
      <EmailHeader />

      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#0d2b4a',
            margin: '0 0 16px 0',
            lineHeight: '1.3',
          }}
        >
          🔐 Restablecer tu contraseña
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#1b2a3a',
            margin: '0 0 24px 0',
            lineHeight: '1.6',
          }}
        >
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en Verifactu Business. No te preocupes, esto es seguro y solo tú puedes completar este proceso.
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#fff3cd',
          borderLeft: '4px solid #ff9800',
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
            lineHeight: '1.5',
          }}
        >
          ⏱️ <strong>Este enlace expira en {expiryMinutes} minutos.</strong> Si no solicitaste este cambio, puedes ignorar este email.
        </p>
      </div>

      <CTAButton href={resetLink} text="Restablecer contraseña" variant="primary" />

      <p
        style={{
          fontSize: '13px',
          color: '#6b7c8a',
          margin: '24px 0 0 0',
          lineHeight: '1.6',
        }}
      >
        O copia este enlace en tu navegador:
        <br />
        <code
          style={{
            display: 'block',
            backgroundColor: '#f8f9fa',
            padding: '8px 12px',
            borderRadius: '4px',
            marginTop: '8px',
            fontSize: '12px',
            wordBreak: 'break-all',
            color: '#0060F0',
          }}
        >
          {resetLink}
        </code>
      </p>

      <div
        style={{
          backgroundColor: '#f0f3f7',
          padding: '16px',
          borderRadius: '6px',
          marginTop: '24px',
        }}
      >
        <p
          style={{
            fontSize: '13px',
            color: '#1b2a3a',
            margin: '0 0 12px 0',
            lineHeight: '1.5',
          }}
        >
          <strong>✅ Consejos de seguridad:</strong>
        </p>
        <ul
          style={{
            fontSize: '13px',
            color: '#1b2a3a',
            margin: '0',
            paddingLeft: '20px',
            lineHeight: '1.7',
          }}
        >
          <li>Elige una contraseña única y segura</li>
          <li>Combina mayúsculas, minúsculas, números y símbolos</li>
          <li>Evita datos personales (nombres, fechas de nacimiento)</li>
          <li>Si usas gestor de contraseñas, es aún mejor</li>
        </ul>
      </div>

      <div
        style={{
          backgroundColor: '#e8f4ff',
          borderLeft: '4px solid #0060F0',
          padding: '16px',
          borderRadius: '4px',
          marginTop: '24px',
        }}
      >
        <p
          style={{
            fontSize: '13px',
            color: '#0d2b4a',
            margin: '0',
            lineHeight: '1.6',
          }}
        >
          💡 <strong>Récuerda:</strong> Una vez cambies tu contraseña, tendrás acceso inmediato a tu dashboard y todos tus datos seguirán intactos. Nada se pierde.
        </p>
      </div>

      <p
        style={{
          fontSize: '13px',
          color: '#6b7c8a',
          margin: '24px 0 0 0',
          lineHeight: '1.6',
        }}
      >
        <strong>¿Problemas para restablecer tu contraseña?</strong>
        <br />
        Si el enlace no funciona o necesitas ayuda, escribe a{' '}
        <a
          href="mailto:soporte@verifactu.business?subject=Problemas%20con%20recuperaci%C3%B3n%20de%20contrase%C3%B1a"
          style={{ color: '#0060F0', textDecoration: 'none' }}
        >
          soporte@verifactu.business
        </a>
      </p>

      <EmailFooter />
    </EmailContainer>
  );
}
