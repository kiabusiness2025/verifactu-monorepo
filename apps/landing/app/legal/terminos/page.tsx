import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terminos de servicio | Verifactu Business",
  description:
    "Condiciones de uso del servicio Verifactu Business operado por Expert Estudios Profesionales, SLU.",
};

const today = "08/01/2026";

const owner = {
  name: process.env.ORGANIZATION_NAME ?? "Expert Estudios Profesionales, SLU",
  nif: process.env.ORGANIZATION_CIF ?? "B44991776",
  address: process.env.ORGANIZATION_ADDRESS ?? "C/ Pintor Agrassot, 19 - 03110 Mutxamel (Alicante)",
  email: "soporte@verifactu.business",
  phone: "+34 669 04 55 28",
  domain: "verifactu.business",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 space-y-10">
      <div className="mb-2 text-sm">
        <Link
          href="/"
          className="text-blue-700 font-semibold hover:text-blue-800"
          aria-label="Volver al inicio"
        >
          Volver al inicio
        </Link>
      </div>
      <header className="space-y-2">
        <p className="text-sm text-gray-500">Ultima actualizacion: {today}</p>
        <h1 className="text-3xl font-bold text-gray-900">
          Terminos y condiciones de uso
        </h1>
        <p className="text-gray-700">
          Estos terminos regulan el acceso y uso de los servicios Verifactu Business
          ofrecidos a traves de <span className="font-semibold">{owner.domain}</span> por{" "}
          {owner.name}.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">1. Titular del servicio</h2>
        <p className="text-gray-700">Razon social: {owner.name}</p>
        <p className="text-gray-700">NIF/CIF: {owner.nif}</p>
        <p className="text-gray-700">Domicilio: {owner.address}</p>
        <p className="text-gray-700">Correo de contacto: {owner.email}</p>
        <p className="text-gray-700">Telefono: {owner.phone}</p>
        <p className="text-gray-700">Dominio principal: {owner.domain}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">2. Aceptacion</h2>
        <p className="text-gray-700">
          El uso del servicio implica la aceptacion integra de estos terminos. Si no
          estas de acuerdo, debes abstenerte de utilizar la plataforma.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">3. Objeto del servicio</h2>
        <p className="text-gray-700">
          Verifactu Business es una plataforma SaaS orientada a la gestion y generacion
          de facturas VeriFactu, con funcionalidades de autenticacion, panel de usuario
          y servicios asociados.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">4. Registro y cuentas</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Debes aportar informacion veraz y mantenerla actualizada.</li>
          <li>Protege tus credenciales; eres responsable de su uso. Notifica accesos no autorizados.</li>
          <li>Podemos suspender o cancelar cuentas ante uso fraudulento, incumplimientos o riesgos para el servicio.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">5. Uso permitido</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Queda prohibido usar el servicio para actividades ilicitas, envio de spam o vulneracion de derechos.</li>
          <li>No realices ingenieria inversa, extraccion masiva de datos o pruebas de seguridad sin autorizacion.</li>
          <li>Respeta los limites tecnicos y de cuota establecidos para garantizar la disponibilidad.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">6. Precios y facturacion</h2>
        <p className="text-gray-700">
          Si existen planes de pago, se publicaran las tarifas vigentes y condiciones de
          facturacion. Los impuestos aplicables se anadiran segun la normativa. Las facturas
          se emitiran a los datos fiscales que proporciones.
        </p>
        <p className="text-gray-700">
          La politica de precios y medicion de uso esta disponible en{" "}
          <Link className="text-indigo-600 hover:underline" href="/politica-de-precios">
            verifactu.business/politica-de-precios
          </Link>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">7. Propiedad intelectual</h2>
        <p className="text-gray-700">
          El software, disenos y contenidos del servicio son titularidad de {owner.name} o
          de sus licenciantes. Concedes una licencia limitada para operar tus datos dentro
          de la plataforma con la unica finalidad de prestar el servicio. No se transfieren
          derechos de propiedad intelectual.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">8. Proteccion de datos</h2>
        <p className="text-gray-700">
          El tratamiento de datos personales se rige por la{" "}
          <Link className="text-indigo-600 hover:underline" href="/legal/privacidad">
            Politica de privacidad
          </Link>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">9. Disponibilidad y soporte</h2>
        <p className="text-gray-700">
          Trabajamos para mantener el servicio disponible, pero no podemos garantizar
          disponibilidad ininterrumpida. Podran realizarse mantenimientos programados o
          urgentes. El soporte se atendera a traves de{" "}
          <a className="text-indigo-600 hover:underline" href={`mailto:${owner.email}`}>
            {owner.email}
          </a>{" "}
          en horario razonable.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">10. Responsabilidad</h2>
        <p className="text-gray-700">
          El servicio se presta tal cual dentro de los limites legales. No nos hacemos
          responsables de danos indirectos, lucro cesante o perdida de datos derivados del uso
          de la plataforma, salvo dolo o culpa grave.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">11. Terminacion</h2>
        <p className="text-gray-700">
          Puedes cancelar tu cuenta en cualquier momento. Podemos suspender o cancelar el
          acceso por incumplimiento de estos terminos o por requisitos legales. Algunas
          obligaciones (confidencialidad, pagos pendientes, limitacion de responsabilidad)
          sobreviviran a la terminacion.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">12. Cambios en los terminos</h2>
        <p className="text-gray-700">
          Podemos actualizar estos terminos para reflejar mejoras del servicio o cambios
          normativos. Publicaremos la version vigente con su fecha. El uso continuado tras la
          publicacion implica aceptacion de las modificaciones.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">13. Ley aplicable y jurisdiccion</h2>
        <p className="text-gray-700">
          Estos terminos se rigen por la legislacion espanola. Para cualquier conflicto, las
          partes se someten a los juzgados y tribunales del domicilio del usuario consumidor;
          en caso de usuario empresarial, a los de la ciudad donde radique el domicilio del
          titular indicado en el apartado 1.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">14. Contacto</h2>
        <p className="text-gray-700">
          Si tienes dudas sobre estos terminos, escribe a{" "}
          <a className="text-indigo-600 hover:underline" href={`mailto:${owner.email}`}>
            {owner.email}
          </a>{" "}
          o llama al telefono indicado en el apartado 1.
        </p>
      </section>
    </main>
  );
}
