import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad | Verifactu Business",
  description:
    "Política de privacidad de Expert Estudios Profesionales, SLU para los servicios Verifactu Business.",
};

const today = "08/01/2026";

const dataController = {
  name: process.env.ORGANIZATION_NAME ?? "Expert Estudios Profesionales, SLU",
  nif: process.env.ORGANIZATION_CIF ?? "B44991776",
  address: process.env.ORGANIZATION_ADDRESS ?? "C/ Pintor Agrassot, 19 - 03110 Mutxamel (Alicante)",
  email: "soporte@verifactu.business",
  phone: "+34 669 04 55 28",
  domain: "verifactu.business",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      <div className="mb-2 text-sm">
        <Link href="/" className="text-blue-700 font-semibold hover:text-blue-800" aria-label="Volver al inicio">← Volver al inicio</Link>
      </div>
      <header className="space-y-2">
        <p className="text-sm text-gray-500">Última actualización: {today}</p>
        <h1 className="text-3xl font-bold text-gray-900">Política de privacidad</h1>
        <p className="text-gray-700">
          Este documento explica cómo {dataController.name} trata los datos personales en los servicios
          Verifactu Business (incluyendo la web {dataController.domain} y las aplicaciones asociadas).
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">1. Responsable del tratamiento</h2>
        <p className="text-gray-700">Nombre legal: {dataController.name}</p>
        <p className="text-gray-700">NIF/CIF: {dataController.nif}</p>
        <p className="text-gray-700">Domicilio: {dataController.address}</p>
        <p className="text-gray-700">Correo de contacto: {dataController.email}</p>
        <p className="text-gray-700">Teléfono: {dataController.phone}</p>
        <p className="text-gray-700">Dominio: {dataController.domain}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">2. Datos que tratamos</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Datos de identificación: nombre, apellidos, email, teléfono (si se solicita).</li>
          <li>Datos de acceso y autenticación: credenciales cifradas, tokens de sesión, ID de usuario.</li>
          <li>Datos de facturación (solo si procede): empresa, NIF, dirección fiscal, forma de pago.</li>
          <li>Datos técnicos y de uso: IP, logs de acceso, dispositivo, navegador, métricas de rendimiento y analítica agregada.</li>
          <li>Datos obtenidos vía OAuth de Google: email y nombre de la cuenta de Google para iniciar sesión. No solicitamos acceso a Gmail ni a otros datos fuera del perfil básico.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">3. Finalidades</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Gestionar el alta, autenticación y uso del servicio.</li>
          <li>Prestar soporte y atender solicitudes de los usuarios.</li>
          <li>Cumplir obligaciones legales, fiscales y de seguridad.</li>
          <li>Mejorar el producto mediante métricas de uso agregadas y anónimas.</li>
          <li>Comunicar novedades del servicio cuando exista base jurídica para ello.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">4. Legitimación</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Ejecución de un contrato (art. 6.1.b RGPD) para prestar el servicio solicitado.</li>
          <li>Cumplimiento de obligaciones legales (art. 6.1.c RGPD).</li>
          <li>Interés legítimo (art. 6.1.f RGPD) para seguridad, prevención de fraude y mejora del servicio.</li>
          <li>Consentimiento (art. 6.1.a RGPD) para comunicaciones comerciales y cookies no técnicas.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">5. Conservación</h2>
        <p className="text-gray-700">
          Conservamos los datos mientras exista una relación activa con el usuario y durante los plazos necesarios para cumplir obligaciones legales (por ejemplo, facturación). Los logs técnicos se conservan por periodos reducidos orientados a seguridad y soporte.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">6. Destinatarios y encargados</h2>
        <p className="text-gray-700">
          No cedemos datos a terceros salvo obligación legal. Utilizamos proveedores (encargados de tratamiento) para hosting, analítica y mensajería, con contratos que garantizan el cumplimiento del RGPD y, en su caso, cláusulas contractuales tipo para transferencias internacionales.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">7. Transferencias internacionales</h2>
        <p className="text-gray-700">
          Cuando un proveedor se encuentra fuera del EEE, evaluamos las garantías adecuadas (por ejemplo, uso de Cláusulas Contractuales Tipo de la Comisión Europea) y medidas adicionales de seguridad.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">8. Derechos de las personas</h2>
        <p className="text-gray-700">
          Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad enviando una solicitud a {dataController.email}. Incluye un medio de verificación de identidad. Si consideras que no hemos atendido correctamente tu solicitud, puedes reclamar ante la Agencia Española de Protección de Datos (AEPD).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">9. Seguridad</h2>
        <p className="text-gray-700">
          Aplicamos medidas técnicas y organizativas proporcionales (cifrado en tránsito, control de accesos, registros de actividad y backups). Ninguna medida es infalible, pero trabajamos de forma continua para mejorar la seguridad del servicio.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">10. Cookies y tecnologías similares</h2>
        <p className="text-gray-700">
          Utilizamos cookies técnicas imprescindibles para el funcionamiento del sitio. Activamos cookies analíticas y de marketing/terceros cuando das tu consentimiento en el aviso de cookies. Puedes configurar o revocar tu consentimiento en cualquier momento desde el banner o las preferencias del navegador.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">11. Menores</h2>
        <p className="text-gray-700">
          El servicio no está dirigido a menores de 14 años. Si detectamos registros de menores, se procederá a su eliminación.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">12. Contacto</h2>
        <p className="text-gray-700">
          Para cualquier duda sobre esta política o sobre tus datos personales, puedes escribir a {" "}
          <a className="text-indigo-600 hover:underline" href={`mailto:${dataController.email}`}>
            {dataController.email}
          </a>{" "}
          o llamar al teléfono indicado en el apartado 1.
        </p>
        <p className="text-gray-700">
          Consulta también los {" "}
          <Link className="text-indigo-600 hover:underline" href="/legal/terminos">
            Términos y condiciones
          </Link>{" "}
          del servicio.
        </p>
      </section>
    </main>
  );
}
