import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PolÃ­tica de cookies | Verifactu Business",
  description:
    "PolÃ­tica de cookies de Expert Estudios Profesionales, SLU para los servicios Verifactu Business.",
};

const today = "08/01/2026";

export default function CookiesPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      <div className="mb-2 text-sm">
        <Link href="/" className="text-[#0060F0] font-semibold hover:text-[#0080F0]" aria-label="Volver al inicio">â† Volver al inicio</Link>
      </div>
      <header className="space-y-2">
        <p className="text-sm text-gray-500">Ãšltima actualizaciÃ³n: {today}</p>
        <h1 className="text-3xl font-bold text-gray-900">PolÃ­tica de cookies</h1>
        <p className="text-gray-700">
          Esta web utiliza cookies tÃ©cnicas necesarias para el funcionamiento y la seguridad del servicio.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">1. Â¿QuÃ© son las cookies?</h2>
        <p className="text-gray-700">
          Las cookies son pequeÃ±os archivos de texto que se almacenan en tu dispositivo cuando visitas una web. 
          Sirven para recordar tus preferencias, mantener la sesiÃ³n iniciada y mejorar tu experiencia.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">2. Cookies que utilizamos</h2>
        
        <h3 className="text-xl font-semibold text-gray-800 mt-4">2.1 Cookies tÃ©cnicas (esenciales)</h3>
        <p className="text-gray-700">
          Son imprescindibles para el funcionamiento bÃ¡sico de la web. No requieren consentimiento previo.
        </p>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>
            <strong>__session</strong>: Cookie de sesiÃ³n cross-dominio que mantiene tu sesiÃ³n iniciada entre 
            verifactu.business y app.verifactu.business. Caduca a los 14 dÃ­as.
            <br/>
            <span className="text-sm text-gray-600">Dominio: .verifactu.business | Tipo: HttpOnly, Secure</span>
          </li>
          <li>
            <strong>cookies_accepted</strong>: Recuerda que has aceptado la polÃ­tica de cookies.
            <br/>
            <span className="text-sm text-gray-600">DuraciÃ³n: 1 aÃ±o | Tipo: TÃ©cnica</span>
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-gray-800 mt-6">2.2 Cookies de Firebase Authentication</h3>
        <p className="text-gray-700">
          Utilizamos Firebase para la autenticaciÃ³n de usuarios. Firebase puede establecer las siguientes cookies:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>
            <strong>__Secure-FIREBASE_*</strong>: Cookies de autenticaciÃ³n de Firebase para gestionar sesiones OAuth.
            <br/>
            <span className="text-sm text-gray-600">Proveedor: Google Firebase | Dominio: firebaseapp.com</span>
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-gray-800 mt-6">2.3 Cookies de terceros</h3>
        <p className="text-gray-700">
          Actualmente <strong>no utilizamos</strong> cookies de:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>AnalÃ­tica web (Google Analytics, Mixpanel, etc.)</li>
          <li>Publicidad o marketing</li>
          <li>Redes sociales (exceptuando el login OAuth)</li>
        </ul>
        <p className="text-gray-700 mt-2">
          Si en el futuro incorporamos cookies analÃ­ticas o de marketing, te informaremos previamente y 
          solicitaremos tu consentimiento explÃ­cito.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">3. Â¿CÃ³mo gestionar las cookies?</h2>
        <p className="text-gray-700">
          Puedes eliminar o bloquear las cookies desde la configuraciÃ³n de tu navegador:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>
            <strong>Google Chrome</strong>: ConfiguraciÃ³n â†’ Privacidad y seguridad â†’ Cookies y otros datos de sitios
          </li>
          <li>
            <strong>Firefox</strong>: Preferencias â†’ Privacidad y seguridad â†’ Cookies y datos del sitio
          </li>
          <li>
            <strong>Safari</strong>: Preferencias â†’ Privacidad â†’ Gestionar datos de sitios web
          </li>
          <li>
            <strong>Edge</strong>: ConfiguraciÃ³n â†’ Cookies y permisos de sitio â†’ Cookies y datos de sitios
          </li>
        </ul>
        <p className="text-gray-700 mt-3">
          âš ï¸ <strong>Importante</strong>: Si bloqueas las cookies tÃ©cnicas (como <code>__session</code>), 
          no podrÃ¡s iniciar sesiÃ³n ni acceder a tu dashboard. Algunas funcionalidades esenciales dejarÃ¡n de funcionar.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">4. ConservaciÃ³n de cookies</h2>
        <p className="text-gray-700">
          Las cookies tienen diferentes periodos de conservaciÃ³n:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li><strong>SesiÃ³n</strong>: Se eliminan al cerrar el navegador</li>
          <li><strong>Persistentes</strong>: Se conservan durante el tiempo indicado (14 dÃ­as para <code>__session</code>)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">5. Cambios en esta polÃ­tica</h2>
        <p className="text-gray-700">
          Podemos actualizar esta polÃ­tica para reflejar cambios en nuestro uso de cookies. 
          Te notificaremos mediante un aviso en la web si realizamos modificaciones significativas.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">6. MÃ¡s informaciÃ³n y contacto</h2>
        <p className="text-gray-700">
          Si tienes dudas sobre nuestra polÃ­tica de cookies, puedes contactar con nosotros en {" "}
          <a className="text-[#0060F0] hover:underline" href="mailto:soporte@verifactu.business">
            soporte@verifactu.business
          </a>
        </p>
        <p className="text-gray-700 mt-3">
          Consulta tambiÃ©n nuestra {" "}
          <Link className="text-[#0060F0] hover:underline" href="/legal/privacidad">
            PolÃ­tica de privacidad
          </Link>
          {" "} y {" "}
          <Link className="text-[#0060F0] hover:underline" href="/legal/terminos">
            TÃ©rminos y condiciones
          </Link>.
        </p>
      </section>
    </main>
  );
}

