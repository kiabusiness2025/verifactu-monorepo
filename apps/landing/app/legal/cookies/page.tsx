import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de cookies | Verifactu Business",
  description:
    "Política de cookies de Expert Estudios Profesionales, SLU para los servicios Verifactu Business.",
};

const today = "27/12/2025";

export default function CookiesPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      <header className="space-y-2">
        <p className="text-sm text-gray-500">Última actualización: {today}</p>
        <h1 className="text-3xl font-bold text-gray-900">Política de cookies</h1>
        <p className="text-gray-700">
          Esta web utiliza únicamente cookies técnicas necesarias para el funcionamiento y la seguridad del servicio. No utilizamos cookies de analítica, publicidad ni de terceros.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">1. ¿Qué son las cookies?</h2>
        <p className="text-gray-700">
          Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas una web. Sirven para recordar tus preferencias o mantener la sesión iniciada.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">2. Tipos de cookies que usamos</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li><strong>Cookies técnicas:</strong> Imprescindibles para el funcionamiento básico de la web (por ejemplo, mantener la sesión iniciada o recordar la aceptación de cookies).</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">3. ¿Cómo puedes gestionar las cookies?</h2>
        <p className="text-gray-700">
          Puedes eliminar o bloquear las cookies desde la configuración de tu navegador. Ten en cuenta que, si bloqueas las cookies técnicas, es posible que algunas funcionalidades no estén disponibles.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">4. Más información</h2>
        <p className="text-gray-700">
          Si tienes dudas sobre nuestra política de cookies, puedes contactar con nosotros en <a className="text-blue-600 hover:underline" href="mailto:soporte@verifactu.business">soporte@verifactu.business</a>.
        </p>
        <p className="text-gray-700">
          Consulta también nuestra <Link className="text-blue-600 hover:underline" href="/legal/politica-de-privacidad">Política de privacidad</Link> y <Link className="text-blue-600 hover:underline" href="/legal/terminos-y-condiciones">Términos y condiciones</Link>.
        </p>
      </section>
    </main>
  );
}
