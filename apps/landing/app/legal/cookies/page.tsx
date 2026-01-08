import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de cookies | Verifactu Business",
  description:
    "Política de cookies de Expert Estudios Profesionales, SLU para los servicios Verifactu Business.",
};

const today = "08/01/2026";

export default function CookiesPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      <div className="mb-2 text-sm">
        <a href="/" className="text-blue-700 font-semibold hover:text-blue-800">← Volver al inicio</a>
      </div>
      <header className="space-y-2">
        <p className="text-sm text-gray-500">Última actualización: {today}</p>
        <h1 className="text-3xl font-bold text-gray-900">Política de cookies</h1>
        <p className="text-gray-700">
          Esta web utiliza cookies técnicas necesarias para el funcionamiento y la seguridad del servicio.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">1. ¿Qué son las cookies?</h2>
        <p className="text-gray-700">
          Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas una web. 
          Sirven para recordar tus preferencias, mantener la sesión iniciada y mejorar tu experiencia.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">2. Cookies que utilizamos</h2>
        
        <h3 className="text-xl font-semibold text-gray-800 mt-4">2.1 Cookies técnicas (esenciales)</h3>
        <p className="text-gray-700">
          Son imprescindibles para el funcionamiento básico de la web. No requieren consentimiento previo.
        </p>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>
            <strong>__session</strong>: Cookie de sesión cross-dominio que mantiene tu sesión iniciada entre 
            verifactu.business y app.verifactu.business. Caduca a los 14 días.
            <br/>
            <span className="text-sm text-gray-600">Dominio: .verifactu.business | Tipo: HttpOnly, Secure</span>
          </li>
          <li>
            <strong>cookies_accepted</strong>: Recuerda que has aceptado la política de cookies.
            <br/>
            <span className="text-sm text-gray-600">Duración: 1 año | Tipo: Técnica</span>
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-gray-800 mt-6">2.2 Cookies de Firebase Authentication</h3>
        <p className="text-gray-700">
          Utilizamos Firebase para la autenticación de usuarios. Firebase puede establecer las siguientes cookies:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>
            <strong>__Secure-FIREBASE_*</strong>: Cookies de autenticación de Firebase para gestionar sesiones OAuth.
            <br/>
            <span className="text-sm text-gray-600">Proveedor: Google Firebase | Dominio: firebaseapp.com</span>
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-gray-800 mt-6">2.3 Cookies de terceros</h3>
        <p className="text-gray-700">
          Actualmente <strong>no utilizamos</strong> cookies de:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Analítica web (Google Analytics, Mixpanel, etc.)</li>
          <li>Publicidad o marketing</li>
          <li>Redes sociales (exceptuando el login OAuth)</li>
        </ul>
        <p className="text-gray-700 mt-2">
          Si en el futuro incorporamos cookies analíticas o de marketing, te informaremos previamente y 
          solicitaremos tu consentimiento explícito.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">3. ¿Cómo gestionar las cookies?</h2>
        <p className="text-gray-700">
          Puedes eliminar o bloquear las cookies desde la configuración de tu navegador:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>
            <strong>Google Chrome</strong>: Configuración → Privacidad y seguridad → Cookies y otros datos de sitios
          </li>
          <li>
            <strong>Firefox</strong>: Preferencias → Privacidad y seguridad → Cookies y datos del sitio
          </li>
          <li>
            <strong>Safari</strong>: Preferencias → Privacidad → Gestionar datos de sitios web
          </li>
          <li>
            <strong>Edge</strong>: Configuración → Cookies y permisos de sitio → Cookies y datos de sitios
          </li>
        </ul>
        <p className="text-gray-700 mt-3">
          ⚠️ <strong>Importante</strong>: Si bloqueas las cookies técnicas (como <code>__session</code>), 
          no podrás iniciar sesión ni acceder a tu dashboard. Algunas funcionalidades esenciales dejarán de funcionar.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">4. Conservación de cookies</h2>
        <p className="text-gray-700">
          Las cookies tienen diferentes periodos de conservación:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li><strong>Sesión</strong>: Se eliminan al cerrar el navegador</li>
          <li><strong>Persistentes</strong>: Se conservan durante el tiempo indicado (14 días para <code>__session</code>)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">5. Cambios en esta política</h2>
        <p className="text-gray-700">
          Podemos actualizar esta política para reflejar cambios en nuestro uso de cookies. 
          Te notificaremos mediante un aviso en la web si realizamos modificaciones significativas.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">6. Más información y contacto</h2>
        <p className="text-gray-700">
          Si tienes dudas sobre nuestra política de cookies, puedes contactar con nosotros en {" "}
          <a className="text-blue-600 hover:underline" href="mailto:soporte@verifactu.business">
            soporte@verifactu.business
          </a>
        </p>
        <p className="text-gray-700 mt-3">
          Consulta también nuestra {" "}
          <Link className="text-blue-600 hover:underline" href="/legal/privacidad">
            Política de privacidad
          </Link>
          {" "} y {" "}
          <Link className="text-blue-600 hover:underline" href="/legal/terminos">
            Términos y condiciones
          </Link>.
        </p>
      </section>
    </main>
  );
}
