import { EmailContainer, EmailHeader, EmailFooter, CTAButton } from './EmailHeader';

interface TeamInviteEmailProps {
  inviteeEmail: string;
  inviterName: string;
  companyName: string;
  acceptLink: string;
  role?: string;
}

/**
 * Email: Invitación a unirse al equipo
 * Se envía cuando un usuario es invitado a colaborar
 */
export function TeamInviteEmailTemplate({
  inviteeEmail,
  inviterName,
  companyName,
  acceptLink,
  role = 'miembro del equipo',
}: TeamInviteEmailProps) {
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
          👋 ¡Te han invitado a colaborar!
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#1b2a3a',
            margin: '0 0 24px 0',
            lineHeight: '1.6',
          }}
        >
          <strong>{inviterName}</strong> te ha invitado a unirte a <strong>{companyName}</strong> en Verifactu Business como <strong>{role}</strong>.
        </p>
      </div>

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
          ✨ <strong>Desde aquí podrán:</strong>
        </p>
        <ul
          style={{
            fontSize: '14px',
            color: '#0d2b4a',
            margin: '12px 0 0 0',
            paddingLeft: '20px',
            lineHeight: '1.8',
          }}
        >
          <li>Colaborar en facturas y documentos</li>
          <li>Ver reportes y análisis fiscal</li>
          <li>Trabajar en equipo con total seguridad</li>
          <li>Mantener todo organizado y actualizado</li>
        </ul>
      </div>

      <CTAButton href={acceptLink} text="Aceptar invitación" variant="primary" />

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
          {acceptLink}
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
          <strong>📝 Detalles de la invitación:</strong>
        </p>
        <ul
          style={{
            fontSize: '13px',
            color: '#1b2a3a',
            margin: '8px 0 0 0',
            paddingLeft: '20px',
            lineHeight: '1.7',
          }}
        >
          <li>Email: {inviteeEmail}</li>
          <li>Empresa: {companyName}</li>
          <li>Rol: {role}</li>
          <li>Invitado por: {inviterName}</li>
        </ul>
      </div>

      <div
        style={{
          backgroundColor: '#f0f3f7',
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
          🔒 <strong>Privacidad garantizada:</strong> Solo verás la información que {inviterName} decida compartir contigo. Cada rol tiene permisos específicos.
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
        <strong>¿Dudas sobre esta invitación?</strong>
        <br />
        Contacta directamente a {inviterName} o escribe a{' '}
        <a
          href="mailto:soporte@verifactu.business"
          style={{ color: '#0060F0', textDecoration: 'none' }}
        >
          soporte@verifactu.business
        </a>
      </p>

      <EmailFooter />
    </EmailContainer>
  );
}
