import { EmailContainer, EmailHeader, EmailFooter, CTAButton } from './EmailHeader';

interface VerifyEmailProps {
  email: string;
  verificationLink: string;
  userName?: string;
}

/**
 * Email: Verificación de correo electrónico
 * Se envía después del registro inicial
 */
export function VerifyEmailTemplate({
  email,
  verificationLink,
  userName = 'Usuario',
}: VerifyEmailProps) {
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
          ✨ ¡Casi listo, {userName}!
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#1b2a3a',
            margin: '0 0 24px 0',
            lineHeight: '1.6',
          }}
        >
          Bienvenido a <strong>Verifactu Business</strong>. Solo necesitamos verificar tu correo electrónico para completar tu registro.
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#f0f3f7',
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
            lineHeight: '1.5',
          }}
        >
          💡 <strong>Una vez confirmado tu email:</strong> Podrás acceder al dashboard, crear tu primer proyecto y comenzar a trabajar con tranquilidad en tu contabilidad.
        </p>
      </div>

      <CTAButton href={verificationLink} text="Verificar mi correo" variant="primary" />

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
          {verificationLink}
        </code>
      </p>

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
            margin: '0 0 8px 0',
            lineHeight: '1.5',
          }}
        >
          <strong>🛡️ Tu seguridad es importante:</strong>
        </p>
        <ul
          style={{
            fontSize: '13px',
            color: '#1b2a3a',
            margin: '8px 0 0 0',
            paddingLeft: '20px',
            lineHeight: '1.6',
          }}
        >
          <li>Este enlace expira en 24 horas</li>
          <li>Nunca compartiremos tu información con terceros</li>
          <li>Tu contraseña está encriptada y segura</li>
        </ul>
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
        ¿Problemas para verificar tu correo?{' '}
        <a
          href="mailto:info@verifactu.business?subject=Problemas%20con%20verificaci%C3%B3n%20de%20correo"
          style={{ color: '#0060F0', textDecoration: 'none' }}
        >
          Contáctanos
        </a>
      </p>

      <EmailFooter />
    </EmailContainer>
  );
}

