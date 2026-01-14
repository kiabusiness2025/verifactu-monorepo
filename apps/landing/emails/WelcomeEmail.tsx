import { EmailContainer, EmailHeader, EmailFooter, CTAButton } from './EmailHeader';

interface WelcomeEmailProps {
  userName: string;
  email: string;
  dashboardLink: string;
}

/**
 * Email: Bienvenida después de confirmación exitosa
 * Se envía cuando el usuario ha verificado su email
 */
export function WelcomeEmailTemplate({
  userName,
  email,
  dashboardLink,
}: WelcomeEmailProps) {
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
          🎉 ¡Bienvenido, {userName}!
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#1b2a3a',
            margin: '0 0 24px 0',
            lineHeight: '1.6',
          }}
        >
          Tu cuenta en <strong>Verifactu Business</strong> está lista. A partir de ahora, puedes gestionar tu contabilidad con total confianza.
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
            fontWeight: '500',
          }}
        >
          💝 <strong>Acceso inmediato a:</strong>
        </p>
        <ul
          style={{
            fontSize: '14px',
            color: '#0d2b4a',
            margin: '8px 0 0 0',
            paddingLeft: '20px',
            lineHeight: '1.8',
          }}
        >
          <li>📊 Dashboard intuitivo con métricas en tiempo real</li>
          <li>📝 Gestión de facturas y documentos</li>
          <li>🔍 Análisis fiscal simplificado</li>
          <li>🛡️ Cumplimiento automático de normativa</li>
          <li>💬 Asistente Isaak disponible 24/7</li>
        </ul>
      </div>

      <CTAButton href={dashboardLink} text="Ir al Dashboard" variant="primary" />

      <div style={{ marginTop: '32px' }}>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#0d2b4a',
            margin: '0 0 16px 0',
          }}
        >
          📚 Primeros pasos recomendados:
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1b2a3a',
              margin: '0 0 6px 0',
            }}
          >
            1️⃣ Completa tu perfil de empresa
          </p>
          <p
            style={{
              fontSize: '13px',
              color: '#6b7c8a',
              margin: '0',
              lineHeight: '1.5',
            }}
          >
            Nos ayudará a personalizar tu experiencia y ofrecer recomendaciones precisas.
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1b2a3a',
              margin: '0 0 6px 0',
            }}
          >
            2️⃣ Conecta tus cuentas bancarias (opcional)
          </p>
          <p
            style={{
              fontSize: '13px',
              color: '#6b7c8a',
              margin: '0',
              lineHeight: '1.5',
            }}
          >
            Automatiza el registro de transacciones. Tus datos están 100% protegidos.
          </p>
        </div>

        <div>
          <p
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1b2a3a',
              margin: '0 0 6px 0',
            }}
          >
            3️⃣ Explora el asistente Isaak
          </p>
          <p
            style={{
              fontSize: '13px',
              color: '#6b7c8a',
              margin: '0',
              lineHeight: '1.5',
            }}
          >
            Pregunta cualquier cosa sobre tu contabilidad. Está diseñado para tranquilizarte.
          </p>
        </div>
      </div>

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
            margin: '0',
            lineHeight: '1.6',
          }}
        >
          <strong>🌟 Dato curioso:</strong> Los usuarios que completan su perfil en los primeros 7 días reportan un 3x más confianza en sus finanzas. ¡Tú también puedes!
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
        ¿Necesitas ayuda?{' '}
        <a
          href="mailto:soporte@verifactu.business"
          style={{ color: '#0060F0', textDecoration: 'none' }}
        >
          Nuestro equipo está aquí
        </a>
        . Respondemos en menos de 2 horas.
      </p>

      <EmailFooter />
    </EmailContainer>
  );
}
