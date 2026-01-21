import { EmailContainer, EmailHeader, EmailFooter, CTAButton } from './EmailHeader';

interface PasswordChangedEmailProps {
  userName: string;
  dashboardLink: string;
}

/**
 * Email: Confirmación de cambio de contraseña
 * Se envía cuando el usuario ha cambiado exitosamente su contraseña
 */
export function PasswordChangedEmailTemplate({
  userName,
  dashboardLink,
}: PasswordChangedEmailProps) {
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
          ✅ Contraseña actualizada
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#1b2a3a',
            margin: '0 0 24px 0',
            lineHeight: '1.6',
          }}
        >
          Tu contraseña en Verifactu Business ha sido cambiada exitosamente. Tu cuenta está segura.
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#e8f5e9',
          borderLeft: '4px solid #4caf50',
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
          🛡️ <strong>Tu cuenta está protegida.</strong> Ahora puedes acceder con tu nueva contraseña.
        </p>
      </div>

      <CTAButton href={dashboardLink} text="Ir a mi Dashboard" variant="primary" />

      <div
        style={{
          backgroundColor: '#f9fafc',
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
          <strong>📋 Información de seguridad:</strong>
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
          <li>Cambio de contraseña confirmado en: {new Date().toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</li>
          <li>Dirección IP del cambio: Se registró para tu seguridad</li>
          <li>Todos tus datos siguen intactos y protegidos</li>
        </ul>
      </div>

      <div
        style={{
          backgroundColor: '#fff3e0',
          borderLeft: '4px solid #ff9800',
          padding: '16px',
          borderRadius: '4px',
          marginTop: '24px',
        }}
      >
        <p
          style={{
            fontSize: '13px',
            color: '#0d2b4a',
            margin: '0 0 8px 0',
            lineHeight: '1.5',
          }}
        >
          <strong>⚠️ Si no fuiste tú quien realizó este cambio:</strong>
        </p>
        <p
          style={{
            fontSize: '13px',
            color: '#0d2b4a',
            margin: '0',
            lineHeight: '1.5',
          }}
        >
          Contacta inmediatamente a{' '}
          <a
            href="mailto:info@verifactu.business?subject=URGENTE:%20Cambio%20de%20contrase%C3%B1a%20no%20autorizado"
            style={{ color: '#ff9800', fontWeight: 'bold', textDecoration: 'none' }}
          >
            info@verifactu.business
          </a>
          . Tomaremos acción inmediata para proteger tu cuenta.
        </p>
      </div>

      <p
        style={{
          fontSize: '13px',
          color: '#6b7c8a',
          margin: '24px 0 0 0',
          lineHeight: '1.6',
          textAlign: 'center',
        }}
      >
        <strong>💡 Recuerda:</strong> Nunca compartiremos tu contraseña contigo por email. Si alguien te pide tu contraseña, es un intento de fraude.
      </p>

      <EmailFooter />
    </EmailContainer>
  );
}

