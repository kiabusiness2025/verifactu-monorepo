import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PolÃ­tica de privacidad | Verifactu Business",
  description:
    "PolÃ­tica de privacidad de Expert Estudios Profesionales, SLU para los servicios Verifactu Business.",
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
        <Link href="/" className="text-[#0060F0] font-semibold hover:text-[#0080F0]" aria-label="Volver al inicio">â† Volver al inicio</Link>
      </div>
      <header className="space-y-2">
        <p className="text-sm text-gray-500">Ãšltima actualizaciÃ³n: {today}</p>
        <h1 className="text-3xl font-bold text-gray-900">PolÃ­tica de privacidad</h1>
        <p className="text-gray-700">
          Este documento explica cÃ³mo {dataController.name} trata los datos personales en los servicios
          Verifactu Business (incluyendo la web {dataController.domain} y las aplicaciones asociadas).
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">1. Responsable del tratamiento</h2>
        <p className="text-gray-700">Nombre legal: {dataController.name}</p>
        <p className="text-gray-700">NIF/CIF: {dataController.nif}</p>
        <p className="text-gray-700">Domicilio: {dataController.address}</p>
        <p className="text-gray-700">Correo de contacto: {dataController.email}</p>
        <p className="text-gray-700">TelÃ©fono: {dataController.phone}</p>
        <p className="text-gray-700">Dominio: {dataController.domain}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">2. Datos que tratamos</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Datos de identificaciÃ³n: nombre, apellidos, email, telÃ©fono (si se solicita).</li>
          <li>Datos de acceso y autenticaciÃ³n: credenciales cifradas, tokens de sesiÃ³n, ID de usuario.</li>
          <li>Datos de facturaciÃ³n (solo si procede): empresa, NIF, direcciÃ³n fiscal, forma de pago.</li>
          <li>Datos tÃ©cnicos y de uso: IP, logs de acceso, dispositivo, navegador, mÃ©tricas de rendimiento y analÃ­tica agregada.</li>
          <li>Datos obtenidos vÃ­a OAuth de Google: email y nombre de la cuenta de Google para iniciar sesiÃ³n. No solicitamos acceso a Gmail ni a otros datos fuera del perfil bÃ¡sico.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">3. Finalidades</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Gestionar el alta, autenticaciÃ³n y uso del servicio.</li>
          <li>Prestar soporte y atender solicitudes de los usuarios.</li>
          <li>Cumplir obligaciones legales, fiscales y de seguridad.</li>
          <li>Mejorar el producto mediante mÃ©tricas de uso agregadas y anÃ³nimas.</li>
          <li>Comunicar novedades del servicio cuando exista base jurÃ­dica para ello.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">4. LegitimaciÃ³n</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>EjecuciÃ³n de un contrato (art. 6.1.b RGPD) para prestar el servicio solicitado.</li>
          <li>Cumplimiento de obligaciones legales (art. 6.1.c RGPD).</li>
          <li>InterÃ©s legÃ­timo (art. 6.1.f RGPD) para seguridad, prevenciÃ³n de fraude y mejora del servicio.</li>
          <li>Consentimiento (art. 6.1.a RGPD) para comunicaciones comerciales y cookies no tÃ©cnicas.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">5. ConservaciÃ³n</h2>
        <p className="text-gray-700">
          Conservamos los datos mientras exista una relaciÃ³n activa con el usuario y durante los plazos necesarios para cumplir obligaciones legales (por ejemplo, facturaciÃ³n). Los logs tÃ©cnicos se conservan por periodos reducidos orientados a seguridad y soporte.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">6. Destinatarios y encargados</h2>
        <p className="text-gray-700">
          No cedemos datos a terceros salvo obligaciÃ³n legal. Utilizamos proveedores (encargados de tratamiento) para hosting, analÃ­tica y mensajerÃ­a, con contratos que garantizan el cumplimiento del RGPD y, en su caso, clÃ¡usulas contractuales tipo para transferencias internacionales.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">7. Transferencias internacionales</h2>
        <p className="text-gray-700">
          Cuando un proveedor se encuentra fuera del EEE, evaluamos las garantÃ­as adecuadas (por ejemplo, uso de ClÃ¡usulas Contractuales Tipo de la ComisiÃ³n Europea) y medidas adicionales de seguridad.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">8. Derechos de las personas</h2>
        <p className="text-gray-700">
          Puedes ejercer tus derechos de acceso, rectificaciÃ³n, supresiÃ³n, oposiciÃ³n, limitaciÃ³n del tratamiento y portabilidad enviando una solicitud a {dataController.email}. Incluye un medio de verificaciÃ³n de identidad. Si consideras que no hemos atendido correctamente tu solicitud, puedes reclamar ante la Agencia EspaÃ±ola de ProtecciÃ³n de Datos (AEPD).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">9. Seguridad</h2>
        <p className="text-gray-700">
          Aplicamos medidas tÃ©cnicas y organizativas proporcionales (cifrado en trÃ¡nsito, control de accesos, registros de actividad y backups). Ninguna medida es infalible, pero trabajamos de forma continua para mejorar la seguridad del servicio.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">10. Cookies y tecnologÃ­as similares</h2>
        <p className="text-gray-700">
          Utilizamos cookies tÃ©cnicas imprescindibles para el funcionamiento del sitio. Activamos cookies analÃ­ticas y de marketing/terceros cuando das tu consentimiento en el aviso de cookies. Puedes configurar o revocar tu consentimiento en cualquier momento desde el banner o las preferencias del navegador.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">11. Menores</h2>
        <p className="text-gray-700">
          El servicio no estÃ¡ dirigido a menores de 14 aÃ±os. Si detectamos registros de menores, se procederÃ¡ a su eliminaciÃ³n.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">12. Contacto</h2>
        <p className="text-gray-700">
          Para cualquier duda sobre esta polÃ­tica o sobre tus datos personales, puedes escribir a {" "}
          <a className="text-indigo-600 hover:underline" href={`mailto:${dataController.email}`}>
            {dataController.email}
          </a>{" "}
          o llamar al telÃ©fono indicado en el apartado 1.
        </p>
        <p className="text-gray-700">
          Consulta tambiÃ©n los {" "}
          <Link className="text-indigo-600 hover:underline" href="/legal/terminos">
            TÃ©rminos y condiciones
          </Link>{" "}
          del servicio.
        </p>
      </section>
    </main>
  );
}

