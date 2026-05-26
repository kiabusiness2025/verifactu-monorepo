import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Plug } from 'lucide-react';
import Header from '../../components/Header';
import { Container, Footer } from '../../lib/home/ui';
import IntegrationRequestForm from '../IntegrationRequestForm';

export const metadata: Metadata = {
  title: 'Solicitar integración | Isaak',
  description:
    'Cuéntanos qué software de gestión usas y añadimos tu sector al roadmap de Isaak. Si tiene API, podemos integrarlo.',
  openGraph: {
    title: 'Solicitar integración con Isaak',
    description:
      'Conecta tu software sectorial con Isaak — Revo, Gesden, Inmovilla, Mindbody y más. Si tiene API, lo integramos.',
    type: 'website',
    locale: 'es_ES',
    url: 'https://verifactu.business/integraciones/solicitar',
    siteName: 'Verifactu Business',
  },
};

const navLinks = [
  { label: 'Integraciones', href: '/integraciones' },
  { label: 'Precios', href: '/precios' },
  { label: 'Contacto', href: '/contacto' },
];

export default function SolicitarIntegracionPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      <section className="border-b border-slate-100 bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_60%)] py-14 sm:py-18">
        <Container>
          <Link
            href="/integraciones"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Todas las integraciones
          </Link>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <Plug className="h-3.5 w-3.5" />
              Integración personalizada
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              ¿Tu software no está
              <br />
              en la lista?
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Si tiene API, podemos integrarlo. Cuéntanos qué usas y te contactamos en menos de 48h
              para evaluar el caso de uso. Las mejores integraciones nacen de una necesidad real.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-14">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
            {/* Form */}
            <div>
              <IntegrationRequestForm />
            </div>

            {/* Side info */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <h3 className="text-sm font-bold text-slate-800">Cómo funciona</h3>
                <ol className="mt-4 space-y-4">
                  {[
                    {
                      n: '1',
                      title: 'Rellena el formulario',
                      desc: 'Dinos qué software usas y qué necesitas de la integración.',
                    },
                    {
                      n: '2',
                      title: 'Te contactamos',
                      desc: 'En menos de 48h evaluamos el caso de uso y la viabilidad técnica.',
                    },
                    {
                      n: '3',
                      title: 'Roadmap o proyecto',
                      desc: 'O lo añadimos al roadmap trimestral o lo desarrollamos como proyecto a medida.',
                    },
                  ].map((step) => (
                    <li key={step.n} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2361d8]/10 text-xs font-bold text-[#2361d8]">
                        {step.n}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">{step.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-2xl border border-[#2361d8]/10 bg-[#2361d8]/3 p-6">
                <h3 className="text-sm font-bold text-[#011c67]">Ya integrados o en roadmap</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {[
                    { name: 'HotelGest', status: '✓ Activo', statusClass: 'text-emerald-600' },
                    { name: 'Revo XEF', status: 'Q3 2026', statusClass: 'text-amber-600' },
                    { name: 'Gesden', status: 'Q3 2026', statusClass: 'text-amber-600' },
                    { name: 'Inmovilla', status: 'Q3 2026', statusClass: 'text-amber-600' },
                    { name: 'Mindbody', status: 'Q4 2026', statusClass: 'text-slate-500' },
                    { name: 'ClinicCloud', status: 'Q4 2026', statusClass: 'text-slate-500' },
                    { name: 'Loyverse', status: 'Q4 2026', statusClass: 'text-slate-500' },
                    { name: 'PrestaShop', status: 'Q1 2027', statusClass: 'text-slate-400' },
                  ].map((item) => (
                    <li key={item.name} className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">{item.name}</span>
                      <span className={`text-xs font-semibold ${item.statusClass}`}>
                        {item.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
