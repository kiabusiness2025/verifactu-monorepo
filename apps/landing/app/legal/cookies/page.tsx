import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de cookies | Verifactu Business",
  description: "Uso de cookies en Verifactu Business: tipos, finalidades y cómo gestionarlas.",
};

const today = "25/12/2025";

const owner = {
  name: process.env.ORGANIZATION_NAME ?? "Expert Estudios Profesionales, SLU",
  email: "soporte@verifactu.business",
  domain: "verifactu.business",
};

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
          Esta política explica cómo usamos cookies y tecnologías similares en {owner.domain}. Puedes gestionar tu
          consentimiento en el banner de cookies o en la configuración de tu navegador.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">1. ¿Qué son las cookies?</h2>
        <p className="text-gray-700">
          Son pequeños archivos que se almacenan en tu dispositivo cuando navegas. Pueden ser necesarias para que la
          web funcione o servir para analizar el uso y personalizar la experiencia.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">2. Tipos de cookies que usamos</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li><strong>Cookies técnicas (necesarias):</strong> imprescindibles para que la web y el área de cliente funcionen.</li>
          <li><strong>Cookies de preferencias:</strong> recuerdan ajustes como idioma o sesión (cuando lo autorices).</li>
          <li><strong>Cookies analíticas:</strong> nos permiten medir uso y rendimiento (solo si aceptas en el banner).</li>
          <li><strong>Cookies de terceros/marketing:</strong> para funcionalidades externas o remarketing (solo si las aceptas).</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">3. Base legal</h2>
        <p className="text-gray-700">
          Las cookies técnicas se usan por interés legítimo para el funcionamiento del sitio. El resto se activan
          únicamente con tu consentimiento, que puedes otorgar, rechazar o revocar en cualquier momento.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">4. Cómo gestionar o desactivar</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Desde el banner de cookies puedes aceptar o rechazar categorías no esenciales.</li>
          <li>En tu navegador puedes borrar cookies o bloquear su uso. Consulta la ayuda de Chrome, Firefox, Edge o Safari.</li>
          <li>Si bloqueas cookies técnicas, algunas funciones pueden dejar de operar correctamente.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">5. Cambios en la política</h2>
        <p className="text-gray-700">
          Podemos actualizar esta política para reflejar cambios técnicos o legales. Publicaremos la versión vigente
          con su fecha de actualización.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">6. Contacto</h2>
        <p className="text-gray-700">
          Si tienes dudas sobre el uso de cookies, escribe a {" "}
          <a className="text-indigo-600 hover:underline" href={`mailto:${owner.email}`}>
            {owner.email}
          </a>.
        </p>
      </section>
    </main>
  );
}
