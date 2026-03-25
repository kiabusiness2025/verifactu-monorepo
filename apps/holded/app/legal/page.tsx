import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aviso legal | Isaak para Holded',
  description: 'Informacion legal y de titularidad de holded.verifactu.business.',
};

export default function HoldedLegalPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_45%,#ffffff_100%)] text-slate-900">
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="inline-flex rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
            Aviso legal
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
            Titular del sitio
          </h1>
          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
            <p>
              <strong>holded.verifactu.business</strong> es una experiencia de producto operada por
              la misma entidad desarrolladora responsable de <strong>verifactu.business</strong>.
            </p>
            <p>
              La mencion a Holded en este sitio se utiliza para identificar la integracion y la
              compatibilidad del servicio. La experiencia no debe interpretarse como un producto
              oficial de Holded salvo que se indique expresamente.
            </p>
            <p>
              Este sitio ofrece una version gratuita inicial de acceso, conexion mediante API key de
              Holded y uso del dashboard con Isaak.
            </p>
            <p>
              Para cuestiones legales o de soporte, el canal de contacto operativo es{' '}
              <a
                href="mailto:info@verifactu.business"
                className="font-semibold text-[#ff5460] hover:text-[#ef4654]"
              >
                info@verifactu.business
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
