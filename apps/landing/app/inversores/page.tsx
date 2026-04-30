import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Globe2,
  Handshake,
  LineChart,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Header from '../components/Header';
import { Container, Footer } from '../lib/home/ui';
import InvestorContactForm from './InvestorContactForm';

const navLinks = [
  { label: 'VeriFactu', href: '/verifactu/que-es' },
  { label: 'Isaak', href: '/que-es-isaak' },
  { label: 'Modo Excel', href: '/modo-excel' },
  { label: 'Conectores', href: '/conectores' },
  { label: 'Asesorias', href: '/asesorias' },
  { label: 'Precios / Demo', href: '/demo' },
  { label: 'Contacto', href: '/recursos/contacto' },
];

export const metadata: Metadata = {
  title: 'Inversores | Verifactu Business',
  description:
    'Pagina publica para conversaciones con inversores, partners y advisors sobre la vision de verifactu.business e Isaak.',
};

export default function InversoresPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_70%)] py-16 sm:py-20">
        <Container>
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              Inversores y partners estrategicos
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-6xl sm:leading-[1.04]">
              Estamos construyendo la nueva capa inteligente para operar empresas.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              Empezamos por VeriFactu en Espana, conectando cumplimiento fiscal, ERP, Excel,
              asesorias e IA en un unico ecosistema empresarial.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="#contacto"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
              >
                Solicitar informacion para inversores
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#contacto"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Contactar con el equipo fundador
              </a>
            </div>
          </div>
        </Container>
      </section>

      <section id="oportunidad" className="py-16 sm:py-20">
        <Container>
          <div className="max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <LineChart className="h-4 w-4" />
              La oportunidad
            </div>
            <p className="mt-5 text-base leading-8 text-slate-700">
              Millones de autonomos, pymes y asesorias en Espana se enfrentan a una transicion
              obligatoria hacia nuevos sistemas de facturacion, trazabilidad y cumplimiento fiscal.
              Pero el problema real va mas alla de VeriFactu: las empresas viven fragmentadas entre
              ERP, Excel, bancos, CRM, facturacion, documentos y asesorias.
            </p>
            <p className="mt-4 text-base leading-8 text-slate-700">
              verifactu.business nace para convertir esa obligacion regulatoria en una oportunidad:
              crear una capa inteligente que ayude a las empresas a entender, conectar y ejecutar su
              operativa diaria.
            </p>
          </div>
        </Container>
      </section>

      <section id="tesis" className="border-y border-slate-200 bg-slate-50/70 py-16 sm:py-20">
        <Container>
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <Sparkles className="h-4 w-4" />
              Nuestra tesis
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              El futuro no sera otro ERP. Sera una capa inteligente sobre todos ellos.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">
              No queremos sustituir los ERPs, las asesorias ni las herramientas empresariales
              existentes. Queremos hacerlas comprensibles, conectadas y accionables desde una
              experiencia unica.
            </p>
          </div>

          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {[
              'VeriFactu como punto de entrada regulatorio.',
              'Isaak como orquestador empresarial.',
              'Excel como modo in-house para empresas no integradas.',
              'Holded como primer ecosistema conectado.',
              'ChatGPT y Claude como primeros canales externos en beta.',
              'Expansion futura hacia mas ERPs, bancos, e-commerce, CRM y herramientas SaaS.',
            ].map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm leading-7 text-slate-700"
              >
                {item}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section id="ecosistema" className="py-16 sm:py-20">
        <Container>
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <Globe2 className="h-4 w-4" />
              Ecosistema
            </div>
            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-[#011c67] p-8 text-blue-50 shadow-sm sm:p-10">
              <pre className="overflow-x-auto whitespace-pre-wrap text-sm leading-7 text-blue-100">
                {`verifactu.business
       |
       |-- Isaak
       |     Orquestador empresarial inteligente
       |
       |-- holded.verifactu.business
       |     Primer hub vertical de conectores
       |
       |-- Modo Excel / in-house
       |     Empresas sin integracion API
       |
       |-- Futuros conectores
             ERP · bancos · CRM · e-commerce · asesorias`}
              </pre>
            </div>
            <p className="mt-6 text-base leading-8 text-slate-700">
              verifactu.business actua como hub regulatorio y de confianza. Isaak es el producto
              principal: una capa conversacional empresarial para entender datos, detectar riesgos y
              ejecutar tareas con permisos. holded.verifactu.business es el primer hub vertical de
              conectores.
            </p>
          </div>
        </Container>
      </section>

      <section id="traccion" className="border-y border-slate-200 bg-slate-50/70 py-16 sm:py-20">
        <Container>
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <ShieldCheck className="h-4 w-4" />
              Estado actual
            </div>
            <ul className="mt-6 grid gap-3 md:grid-cols-2">
              {[
                'Implementacion VeriFactu avanzada.',
                'Pruebas de conexion con AEAT superadas.',
                'Integracion in-house con Excel en desarrollo.',
                'Primer hub vertical sobre Holded.',
                'Conectores ChatGPT y Claude operativos en beta interna.',
                'Arquitectura preparada para permisos, auditoria e integraciones.',
                'Fase de captacion de pilotos con empresas y asesorias.',
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm leading-7 text-slate-700"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section id="modelo" className="py-16 sm:py-20">
        <Container>
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Modelo de negocio
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">
              El modelo combina SaaS B2B, planes para pymes y autonomos, soluciones multiempresa
              para asesorias, conectores premium, implantacion y futuras oportunidades de
              marketplace/API.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-5 py-3 font-semibold">Linea</th>
                  <th className="px-5 py-3 font-semibold">Descripcion</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['SaaS empresas', 'Planes mensuales para autonomos y pymes'],
                  ['Asesorias', 'Gestion multiempresa y clientes conectados'],
                  ['Conectores', 'Add-ons para ERP, bancos, e-commerce y herramientas'],
                  ['Implantacion', 'Setup y acompanamiento'],
                  ['Plataforma', 'API, marketplace y partners futuros'],
                ].map(([line, description]) => (
                  <tr key={line} className="border-t border-slate-200">
                    <td className="px-5 py-3 font-semibold text-slate-900">{line}</td>
                    <td className="px-5 py-3 text-slate-700">{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      <section id="mercado" className="border-y border-slate-200 bg-slate-50/70 py-16 sm:py-20">
        <Container>
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Mercado
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">
              Espana es el primer mercado por la oportunidad regulatoria de VeriFactu y por la
              fragmentacion del tejido pyme. La vision posterior es adaptar la capa de Isaak a otros
              marcos fiscales, ecosistemas empresariales e integraciones internacionales.
            </p>
            <p className="mt-4 text-base leading-8 text-slate-700">
              España como mercado inicial. VeriFactu como catalizador. Expansion europea futura.
              Capa global de operaciones empresariales.
            </p>
          </div>
        </Container>
      </section>

      <section id="buscamos" className="py-16 sm:py-20">
        <Container>
          <div className="max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <Handshake className="h-4 w-4" />
              Que buscamos
            </div>
            <p className="mt-5 text-base leading-8 text-slate-700">
              Estamos abiertos a conversaciones con inversores, business angels, fondos early-stage,
              partners estrategicos y perfiles con experiencia en SaaS B2B, fiscalidad, ERP,
              asesorias, IA aplicada o expansion internacional.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                'Inversion pre-seed / seed.',
                'Partnerships estrategicos.',
                'Pilotos con asesorias.',
                'Integraciones con software empresarial.',
                'Advisors sectoriales.',
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section id="contacto" className="border-y border-slate-200 bg-slate-50/70 py-16 sm:py-20">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                <Building2 className="h-4 w-4" />
                Contacto para inversores
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Solicitar investor brief
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-700">
                Comparte tu perfil y el tipo de conversacion que te interesa. Te responderemos desde
                el equipo fundador.
              </p>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
                Email directo:{' '}
                <a
                  className="font-semibold text-[#2361d8] hover:underline"
                  href="mailto:investors@verifactu.business"
                >
                  investors@verifactu.business
                </a>
              </div>
            </div>

            <InvestorContactForm />
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">
            La informacion publicada en esta pagina tiene caracter meramente informativo y no
            constituye una oferta publica de inversion, asesoramiento financiero ni invitacion
            formal a suscribir participaciones. La documentacion financiera detallada se facilitara
            unicamente bajo solicitud y, en su caso, bajo acuerdo de confidencialidad.
          </div>
          <div className="mt-8 text-center text-base font-semibold text-slate-900">
            No estamos construyendo otro ERP. Estamos construyendo la capa que hara que los ERP,
            Excels, bancos, documentos y asesorias trabajen juntos.
          </div>
          <div className="mt-4 text-center text-sm text-slate-600">
            <Link href="/" className="font-semibold text-[#2361d8] hover:underline">
              Volver al hub principal
            </Link>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
