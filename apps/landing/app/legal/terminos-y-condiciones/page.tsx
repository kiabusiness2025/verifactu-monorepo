import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones | Verifactu Business",
  description:
    "Condiciones de uso del servicio Verifactu Business operado por EXPERT ESTUDIOS PROFESIONALES, SLU.",
};

const today = "25/12/2025";

const owner = {
  name: "EXPERT ESTUDIOS PROFESIONALES, SLU",
  nif: "B44991776",
  address: "C/ Pintor Agrassot, a9 - 03110 Mutxamel (Alicante)",
  email: "soporte@verifactu.business",
  phone: "+34 669 04 55 28",
  domain: "verifactu.business",
};

export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      <header className="space-y-2">
        <p className="text-sm text-gray-500">Última actualización: {today}</p>
        <h1 className="text-3xl font-bold text-gray-900">Términos y condiciones de uso</h1>
        <p className="text-gray-700">
          Estos términos regulan el acceso y uso de los servicios Verifactu Business ofrecidos a través de
          {" "}
          <span className="font-semibold">{owner.domain}</span> por {owner.name}.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">1. Titular del servicio</h2>
        <p className="text-gray-700">Razón social: {owner.name}</p>
        <p className="text-gray-700">NIF/CIF: {owner.nif}</p>
        <p className="text-gray-700">Domicilio: {owner.address}</p>
        <p className="text-gray-700">Correo de contacto: {owner.email}</p>
        <p className="text-gray-700">Teléfono: {owner.phone}</p>
        <p className="text-gray-700">Dominio principal: {owner.domain}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">2. Aceptación</h2>
        <p className="text-gray-700">
          El uso del servicio implica la aceptación íntegra de estos términos. Si no estás de acuerdo, debes
          abstenerte de utilizar la plataforma.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">3. Objeto del servicio</h2>
        <p className="text-gray-700">
          Verifactu Business es una plataforma SaaS orientada a la gestión y generación de facturas VeriFactu, con
          funcionalidades de autenticación, panel de usuario y servicios asociados.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">4. Registro y cuentas</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Debes aportar información veraz y mantenerla actualizada.</li>
          <li>Protege tus credenciales; eres responsable de su uso. Notifica accesos no autorizados.</li>
          <li>Podemos suspender o cancelar cuentas ante uso fraudulento, incumplimientos o riesgos para el servicio.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">5. Uso permitido</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Queda prohibido usar el servicio para actividades ilícitas, envío de spam o vulneración de derechos.</li>
          <li>No realices ingeniería inversa, extracción masiva de datos o pruebas de seguridad sin autorización.</li>
          <li>Respeta los límites técnicos y de cuota establecidos para garantizar la disponibilidad.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">6. Precios y facturación</h2>
        <p className="text-gray-700">
          Si existen planes de pago, se publicarán las tarifas vigentes y condiciones de facturación. Los impuestos
          aplicables se añadirán según la normativa. Las facturas se emitirán a los datos fiscales que proporciones.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">7. Propiedad intelectual</h2>
        <p className="text-gray-700">
          El software, diseños y contenidos del servicio son titularidad de {owner.name} o de sus licenciantes.
          Concedes una licencia limitada para operar tus datos dentro de la plataforma con la única finalidad de
          prestar el servicio. No se transfieren derechos de propiedad intelectual.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">8. Protección de datos</h2>
        <p className="text-gray-700">
          El tratamiento de datos personales se rige por la <Link className="text-indigo-600 hover:underline" href="/legal/politica-de-privacidad">Política de privacidad</Link>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">9. Disponibilidad y soporte</h2>
        <p className="text-gray-700">
          Trabajamos para mantener el servicio disponible, pero no podemos garantizar disponibilidad ininterrumpida.
          Podrán realizarse mantenimientos programados o urgentes. El soporte se atenderá a través de
          {" "}
          <a className="text-indigo-600 hover:underline" href={`mailto:${owner.email}`}>
            {owner.email}
          </a>{" "}
          en horario razonable.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">10. Responsabilidad</h2>
        <p className="text-gray-700">
          El servicio se presta “tal cual” dentro de los límites legales. No nos hacemos responsables de daños
          indirectos, lucro cesante o pérdida de datos derivados del uso de la plataforma, salvo dolo o culpa grave.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">11. Terminación</h2>
        <p className="text-gray-700">
          Puedes cancelar tu cuenta en cualquier momento. Podemos suspender o cancelar el acceso por incumplimiento
          de estos términos o por requisitos legales. Algunas obligaciones (confidencialidad, pagos pendientes,
          limitación de responsabilidad) sobrevivirán a la terminación.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">12. Cambios en los términos</h2>
        <p className="text-gray-700">
          Podemos actualizar estos términos para reflejar mejoras del servicio o cambios normativos. Publicaremos la
          versión vigente con su fecha. El uso continuado tras la publicación implica aceptación de las modificaciones.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">13. Ley aplicable y jurisdicción</h2>
        <p className="text-gray-700">
          Estos términos se rigen por la legislación española. Para cualquier conflicto, las partes se someten a los
          juzgados y tribunales del domicilio del usuario consumidor; en caso de usuario empresarial, a los de la
          ciudad donde radique el domicilio del titular indicado en el apartado 1.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">14. Contacto</h2>
        <p className="text-gray-700">
          Si tienes dudas sobre estos términos, escribe a
          {" "}
          <a className="text-indigo-600 hover:underline" href={`mailto:${owner.email}`}>
            {owner.email}
          </a>{" "}
          o llama al teléfono indicado en el apartado 1.
        </p>
      </section>
    </main>
  );
}
