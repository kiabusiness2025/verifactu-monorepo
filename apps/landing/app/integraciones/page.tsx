import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Code2,
  CreditCard,
  Dumbbell,
  Hotel,
  Landmark,
  MessageSquare,
  Package,
  Puzzle,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  Users,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react';
import Header from '../components/Header';
import { Container, Footer } from '../lib/home/ui';
import { getIsaakUrl } from '../lib/urls';

export const metadata: Metadata = {
  title: 'Integraciones | Isaak',
  description:
    'Isaak conecta con más de 30 plataformas: ERPs sectoriales, banca PSD2, pasarelas de pago, CRMs y logística. Una API key — inteligencia fiscal y contable en tiempo real.',
  openGraph: {
    title: 'Integraciones | Isaak',
    description:
      'Holded, Revo XEF, Stripe, Mollie, HubSpot, Salesforce, Sendcloud y más. Isaak se convierte en la inteligencia fiscal encima del software que ya usas.',
    type: 'website',
    locale: 'es_ES',
    url: 'https://verifactu.business/integraciones',
    siteName: 'Verifactu Business',
  },
};

const navLinks = [
  { label: 'Servicios', href: '/servicios' },
  { label: 'Integraciones', href: '/integraciones' },
  { label: 'Suscripciones', href: '/suscripciones' },
  { label: 'Developers', href: '/developers' },
  { label: 'Contacto', href: '/contacto' },
];

// ── Data ───────────────────────────────────────────────────────────────────────

const erpConnectors = [
  {
    icon: Hotel,
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    title: 'Holded',
    body: 'El ERP de referencia para pymes españolas. Facturación, CRM, contabilidad y gastos — Isaak convierte tus datos en asesoramiento fiscal proactivo.',
    cta: 'Conectar Holded',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
  {
    icon: Hotel,
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    title: 'HotelGest — Hoteles',
    body: 'Conecta tu PMS HotelGest con Isaak. Reservas, ocupación, RevPAR, facturación e IVA hostelería en tiempo real. Modelo 303 con el desglose correcto automáticamente.',
    cta: 'Ver integración',
    href: '/integraciones/hotelgest',
    external: false,
  },
  {
    icon: UtensilsCrossed,
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    title: 'Revo XEF — Restaurantes',
    body: 'Tu TPV Revo conectado con Isaak. Cierres diarios, IVA reducido al 10%, desglose por servicio y modelo 303 trimestral automático.',
    cta: 'Conectar ahora',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
  {
    icon: Zap,
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    title: 'Loyverse — Retail y TPV',
    body: 'El TPV en la nube para tiendas y comercios. Ventas, inventario, empleados e IVA repercutido — Isaak prepara tu modelo 303 desde los datos reales de caja.',
    cta: 'Conectar ahora',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
  {
    icon: ShoppingCart,
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    title: 'WooCommerce — Tiendas online',
    body: 'La plataforma e-commerce más usada en España. Ventas online, devoluciones, IVA intracomunitario y facturación electrónica automática.',
    cta: 'Conectar ahora',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
  {
    icon: ShoppingCart,
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    title: 'PrestaShop — E-commerce',
    body: 'La plataforma e-commerce de referencia en España. Pedidos, devoluciones, múltiples tipos de IVA y gestión de marketplaces — Isaak calcula tu posición fiscal en tiempo real.',
    cta: 'Conectar ahora',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
  {
    icon: Dumbbell,
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    title: 'Mindbody — Gimnasios y wellness',
    body: 'Centros deportivos, spas y estudios de yoga. Membresías, reservas de clases e IVA de servicios deportivos — todo en el modelo 303 trimestral.',
    cta: 'Conectar ahora',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
  {
    icon: Stethoscope,
    status: 'Próximo',
    statusColor: 'bg-slate-100 text-slate-600',
    title: 'Gesden · Nubimed · Inmovilla',
    body: 'Clínicas dentales, centros médicos e inmobiliarias. Acuerdos de partner en curso — en cuanto tengamos acceso a sus APIs, será lo primero en el roadmap.',
    cta: 'Solicitar integración',
    href: '/integraciones/solicitar',
    external: false,
  },
];

const paymentConnectors = [
  {
    title: 'Stripe',
    body: 'Pagos online, suscripciones y marketplaces. Isaak consolida tus cobros de Stripe con el resto de tu contabilidad y prepara el IVA repercutido.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
  {
    title: 'Mollie',
    body: 'La pasarela europea de pagos por excelencia. Cobros, reembolsos y liquidaciones — Isaak los convierte en asientos contables listos para tu modelo 303.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
  {
    title: 'PayPal',
    body: 'Cobros en PayPal integrados con tu fiscalidad española. Isaak calcula el IVA de tus ventas internacionales y gestiona las diferencias de cambio.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
  {
    title: 'Redsys',
    body: 'El gateway bancario español que procesa el 90% del e-commerce en España. Bizum, tarjeta y SEPA con IVA desglosado automáticamente.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
  {
    title: 'Paylands',
    body: 'Gateway español con Bizum nativo. Transacciones, liquidaciones y cálculo de IVA en tiempo real para negocios que operan en España.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
  {
    title: 'GoCardless',
    body: 'Cobros recurrentes por domiciliación bancaria SEPA. Isaak reconcilia tus mandatos, gestiona los impagos y cuadra con tu contabilidad.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
  {
    title: 'SumUp',
    body: 'TPV físico para cobros presenciales. Ventas, propinas y reembolsos — Isaak cruza tus cobros de SumUp con el cierre de caja diario.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
];

const crmConnectors = [
  {
    title: 'HubSpot',
    body: 'Tu pipeline de ventas conectado con la fiscalidad real. Isaak cruzará cada deal cerrado con su factura, IVA y asiento contable correspondiente.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
  {
    title: 'Salesforce',
    body: 'Oportunidades, cuentas y contactos de Salesforce integrados con Isaak. Isaak convierte tu pipeline en previsión fiscal trimestral automática.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
  {
    title: 'Pipedrive',
    body: 'El CRM más usado por los equipos de ventas europeos. Deals, contactos y organizaciones — Isaak convierte tu pipeline en visibilidad fiscal en tiempo real.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
];

const bankingConnectors = [
  {
    title: 'BBVA',
    body: 'El mayor banco español por activos. Cuentas corrientes, saldos en tiempo real y movimientos sincronizados con Isaak vía PSD2. Conciliación bancaria automática.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/banking',
    external: true,
  },
  {
    title: 'Santander',
    body: 'Banco internacional con presencia global. Cuentas de empresa y particular conectadas con Isaak para conciliación automática de cobros y pagos.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/banking',
    external: true,
  },
  {
    title: 'CaixaBank',
    body: 'La mayor caja de ahorros española. Movimientos de cuenta, recibos domiciliados y préstamos integrados con la contabilidad de Isaak en tiempo real.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/banking',
    external: true,
  },
  {
    title: 'ING España',
    body: 'El banco digital de referencia para autónomos y pymes. Cuenta Nómina, Cuenta Negocio y movimientos sincronizados automáticamente con Isaak.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/banking',
    external: true,
  },
  {
    title: 'Sabadell · Bankinter · Unicaja',
    body: 'Banco Sabadell, Bankinter y Unicaja disponibles vía Open Banking PSD2. Conecta cualquiera de los tres desde Isaak con una sola autorización.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/banking',
    external: true,
  },
  {
    title: '+30 bancos españoles y europeos',
    body: 'Kutxabank, Ibercaja, Abanca, Cajamar, Revolut, N26, Wise y más. Todos vía Enable Banking (PSD2 AIS). Si tu banco tiene open banking, Isaak puede conectarse.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/banking',
    external: true,
  },
];

const logisticsConnectors = [
  {
    title: 'Sendcloud',
    body: 'El agregador de transportistas líder en Europa. Envíos, devoluciones y costes logísticos de todos tus carriers desde una sola integración.',
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    href: 'https://isaak.verifactu.business/integrations',
    external: true,
  },
  {
    title: 'DHL Express · SEUR · MRW · GLS',
    body: 'Integración directa con los principales transportistas españoles y europeos. En cuanto tengamos los acuerdos API de cada operador, estará disponible en Isaak.',
    status: 'Próximo',
    statusColor: 'bg-slate-100 text-slate-600',
    href: '/integraciones/solicitar',
    external: false,
  },
  {
    title: 'Correos Express',
    body: 'El operador postal oficial integrado con Isaak para empresas con alto volumen de envíos nacionales. Pendiente acceso API empresarial.',
    status: 'Próximo',
    statusColor: 'bg-slate-100 text-slate-600',
    href: '/integraciones/solicitar',
    external: false,
  },
];

const channelConnectors = [
  {
    icon: Bot,
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    title: 'Isaak — Asistente nativo',
    body: 'Chat fiscal, VeriFactu, alertas AEAT, open banking y modelos AEAT directamente en isaak.verifactu.business con IA incluida en el precio.',
    cta: 'Abrir Isaak',
    href: 'https://isaak.verifactu.business',
    external: true,
  },
  {
    icon: Code2,
    status: 'Beta',
    statusColor: 'bg-blue-100 text-blue-800',
    title: 'Isaak Platform API + MCP',
    body: 'API REST y protocolo MCP para que tu software sectorial conecte directamente con Isaak. Facturas, VeriFactu y contabilidad desde cualquier entorno con Bearer token.',
    cta: 'Ver documentación developer',
    href: '/developers',
    external: false,
  },
  {
    icon: MessageSquare,
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    title: 'WhatsApp Business',
    body: 'Recibe alertas fiscales, responde consultas de Isaak y aprueba acciones contables desde WhatsApp. Tu negocio en el bolsillo.',
    cta: 'Saber más',
    href: 'https://isaak.verifactu.business',
    external: true,
  },
  {
    icon: Puzzle,
    status: 'Siempre',
    statusColor: 'bg-slate-100 text-slate-600',
    title: 'Tu sector no está en la lista',
    body: 'Si tu software de gestión tiene API, podemos integrarlo. Cuéntanos qué usas y añadimos tu sector al roadmap.',
    cta: 'Solicitar integración',
    href: '/integraciones/solicitar',
    external: false,
  },
];

const roadmapRows = [
  // ERP
  { name: 'Holded', sector: 'ERP / Contabilidad', status: '✓ Disponible' },
  { name: 'HotelGest', sector: 'Hoteles', status: '✓ Disponible' },
  { name: 'Revo XEF', sector: 'Restaurantes', status: '✓ Disponible' },
  { name: 'Loyverse', sector: 'Retail / TPV', status: '✓ Disponible' },
  { name: 'WooCommerce', sector: 'E-commerce', status: '✓ Disponible' },
  { name: 'PrestaShop', sector: 'E-commerce', status: '✓ Disponible' },
  { name: 'Mindbody', sector: 'Gimnasios / wellness', status: '✓ Disponible' },
  { name: 'Gesden', sector: 'Clínicas dental', status: 'Próximo' },
  { name: 'Nubimed', sector: 'Clínicas / Dental', status: 'Próximo' },
  { name: 'Inmovilla', sector: 'Inmobiliarias', status: 'Próximo' },
  // Pagos
  { name: 'Stripe', sector: 'Pagos', status: '✓ Disponible' },
  { name: 'Mollie', sector: 'Pagos', status: '✓ Disponible' },
  { name: 'PayPal', sector: 'Pagos', status: '✓ Disponible' },
  { name: 'Redsys', sector: 'Pagos', status: '✓ Disponible' },
  { name: 'Paylands', sector: 'Pagos', status: '✓ Disponible' },
  { name: 'GoCardless', sector: 'Pagos (débito directo)', status: '✓ Disponible' },
  { name: 'SumUp', sector: 'Pagos (TPV físico)', status: '✓ Disponible' },
  // Banca
  { name: 'BBVA', sector: 'Open Banking', status: '✓ Disponible' },
  { name: 'Santander', sector: 'Open Banking', status: '✓ Disponible' },
  { name: 'CaixaBank', sector: 'Open Banking', status: '✓ Disponible' },
  { name: 'ING España', sector: 'Open Banking', status: '✓ Disponible' },
  { name: 'Sabadell', sector: 'Open Banking', status: '✓ Disponible' },
  { name: 'Bankinter', sector: 'Open Banking', status: '✓ Disponible' },
  { name: 'Unicaja · Kutxabank · Ibercaja', sector: 'Open Banking', status: '✓ Disponible' },
  { name: 'Revolut · N26 · Wise', sector: 'Open Banking (banca digital)', status: '✓ Disponible' },
  // CRM
  { name: 'HubSpot', sector: 'CRM', status: '✓ Disponible' },
  { name: 'Salesforce', sector: 'CRM', status: '✓ Disponible' },
  { name: 'Pipedrive', sector: 'CRM', status: '✓ Disponible' },
  // Logística
  { name: 'Sendcloud', sector: 'Logística (agregador)', status: '✓ Disponible' },
  { name: 'DHL · SEUR · MRW · GLS', sector: 'Logística', status: 'Próximo' },
  { name: 'Correos Express', sector: 'Logística', status: 'Próximo' },
];

// ── Shared card components ────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  label,
  title,
  description,
}: {
  icon: React.ElementType;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#2361d8]" />
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2361d8]">{label}</p>
      </div>
      <h2 className="text-2xl font-bold text-[#011c67]">{title}</h2>
      <p className="mt-1.5 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ConnectorCard({
  title,
  body,
  status,
  statusColor,
  cta,
  href,
  external,
  icon: Icon,
}: {
  title: string;
  body: string;
  status: string;
  statusColor: string;
  cta: string;
  href: string;
  external: boolean;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        {Icon && (
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#2361d8]/8">
            <Icon className="h-5 w-5 text-[#2361d8]" />
          </div>
        )}
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusColor}`}>
          {status}
        </span>
      </div>
      <h3 className="text-base font-semibold text-[#011c67]">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{body}</p>
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#2361d8] hover:underline"
        >
          {cta} <ArrowRight className="h-3.5 w-3.5" />
        </a>
      ) : (
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#2361d8] hover:underline"
        >
          {cta} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IntegracionesPage() {
  const isaakUrl = getIsaakUrl();
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      {/* Hero */}
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_70%)] py-16 sm:py-20">
        <Container>
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <Sparkles className="h-3.5 w-3.5" />
              +30 integraciones disponibles
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-6xl sm:leading-[1.04]">
              La capa de inteligencia
              <br />
              encima del software
              <br />
              que ya usas.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              ERP sectoriales, pasarelas de pago, CRMs y transportistas. Isaak no sustituye tu
              software — se convierte en la inteligencia que lo conecta todo y te dice qué hacer a
              continuación.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={isaakUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
              >
                Abrir Isaak
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/integraciones/solicitar"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Solicitar mi sector
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Roadmap table */}
      <section className="border-b border-slate-100 bg-slate-50 py-12">
        <Container>
          <p className="mb-6 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Catálogo completo de integraciones
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-6">Software</th>
                  <th className="pb-3 pr-6">Categoría</th>
                  <th className="pb-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roadmapRows.map((s) => (
                  <tr key={s.name}>
                    <td className="py-3 pr-6 font-semibold text-slate-800">{s.name}</td>
                    <td className="py-3 pr-6 text-slate-600">{s.sector}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          s.status.startsWith('✓')
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.status.startsWith('⚙')
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* ERP Sectorial */}
      <section className="border-b border-slate-100 py-14">
        <Container>
          <SectionHeader
            icon={Building2}
            label="ERP Sectorial"
            title="El software que ya usas, con inteligencia fiscal encima"
            description="Tu hotel ya tiene HotelGest. Tu restaurante ya tiene Revo. Isaak no sustituye tu software — añade la capa fiscal, contable y de inteligencia de negocio."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {erpConnectors.map((c) => (
              <ConnectorCard key={c.title} {...c} cta={c.cta} />
            ))}
          </div>
        </Container>
      </section>

      {/* Pagos */}
      <section className="border-b border-slate-100 bg-slate-50/50 py-14">
        <Container>
          <SectionHeader
            icon={CreditCard}
            label="Pasarelas de pago"
            title="Todos tus cobros, un solo modelo 303"
            description="Stripe, Mollie, PayPal, Redsys, Paylands, GoCardless, SumUp — Isaak consolida todas tus fuentes de ingresos en la declaración trimestral correcta."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paymentConnectors.map((c) => (
              <ConnectorCard
                key={c.title}
                {...c}
                cta={c.status === 'Disponible' ? 'Conectar ahora' : 'Solicitar integración'}
              />
            ))}
          </div>
        </Container>
      </section>

      {/* CRM */}
      <section className="border-b border-slate-100 py-14">
        <Container>
          <SectionHeader
            icon={Users}
            label="CRM"
            title="Pipeline de ventas conectado con tu fiscalidad"
            description="Cada deal cerrado tiene su factura, su IVA y su asiento contable. Isaak cruza tu CRM con la realidad fiscal en tiempo real."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {crmConnectors.map((c) => (
              <ConnectorCard
                key={c.title}
                {...c}
                cta={c.status === 'Disponible' ? 'Conectar ahora' : 'Solicitar integración'}
              />
            ))}
          </div>
        </Container>
      </section>

      {/* Open Banking */}
      <section className="border-b border-slate-100 bg-slate-50/50 py-14">
        <Container>
          <SectionHeader
            icon={Landmark}
            label="Open Banking PSD2"
            title="Tus cuentas bancarias, dentro de Isaak"
            description="BBVA, Santander, CaixaBank, ING y más de 30 bancos españoles y europeos vía Enable Banking. Saldos en tiempo real, movimientos sincronizados y conciliación bancaria automática."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {bankingConnectors.map((c) => (
              <ConnectorCard key={c.title} {...c} cta="Conectar banco" />
            ))}
          </div>
        </Container>
      </section>

      {/* Logística */}
      <section className="border-b border-slate-100 bg-slate-50/50 py-14">
        <Container>
          <SectionHeader
            icon={Package}
            label="Logística y transportistas"
            title="Costes de envío dentro de la contabilidad"
            description="Sendcloud agrega todos tus carriers en una sola integración. Isaak cruza los gastos de envío con las ventas y calcula el margen real por pedido."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {logisticsConnectors.map((c) => (
              <ConnectorCard
                key={c.title}
                {...c}
                cta={c.status === 'Disponible' ? 'Conectar ahora' : 'Solicitar integración'}
              />
            ))}
          </div>
        </Container>
      </section>

      {/* Canales y plataformas */}
      <section className="border-b border-slate-100 py-14">
        <Container>
          <SectionHeader
            icon={Bot}
            label="Canales y plataformas"
            title="Isaak donde ya trabajas"
            description="Chat nativo, WhatsApp, API REST y protocolo MCP. Isaak se adapta a tu flujo de trabajo — no al revés."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {channelConnectors.map((c) => (
              <ConnectorCard key={c.title} {...c} cta={c.cta} />
            ))}
          </div>
        </Container>
      </section>

      {/* Why sector-first */}
      <section className="border-t border-slate-100 bg-[#f4f8ff] py-16">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67]">
              Una API key. Tu software de siempre. Inteligencia fiscal incluida.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Sin migraciones, sin formación, sin instalar nada. La API key de tu cuenta de siempre
              — y Isaak ya tiene todos tus datos fiscales, contables y operativos en tiempo real.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                title: 'Una API key. Listo.',
                body: 'Sin migraciones, sin formación, sin instalar nada. La API key de tu cuenta de siempre — y Isaak ya tiene todos tus datos.',
              },
              {
                title: 'Datos operativos, no solo contables',
                body: 'Reservas, citas, tickets de caja, pedidos de e-commerce — no solo facturas. Isaak entiende tu negocio desde dentro.',
              },
              {
                title: 'Fiscal automático por sector',
                body: 'IVA al 10% en hostelería, exento en sanidad, retenciones en inmobiliaria. Isaak conoce las reglas de tu sector.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-[#2361d8]/10 bg-white p-7 shadow-sm"
              >
                <h3 className="text-base font-bold text-[#011c67]">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>

          {/* Before/After table */}
          <div className="mt-12 overflow-hidden rounded-2xl border border-[#2361d8]/10 bg-white shadow-sm">
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="p-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Modelo anterior
                </p>
                <ul className="space-y-3">
                  {[
                    'Adoptar un ERP diferente al que ya usas',
                    'Datos contables genéricos y secos',
                    'Alta fricción en el onboarding',
                    'Asesoría fiscal desconectada del negocio',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-500">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#2361d8]/2 p-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#2361d8]">
                  Con Isaak
                </p>
                <ul className="space-y-3">
                  {[
                    'Usas lo que ya tienes — Isaak se conecta encima',
                    'Datos operativos ricos: reservas, citas, pedidos, cobros',
                    'Una API key — listo en 2 minutos',
                    'Copiloto fiscal y contable vertical para cada sector',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 py-16">
        <Container>
          <div className="rounded-[2rem] border border-[#2361d8]/15 bg-[linear-gradient(135deg,#f0f5ff_0%,#ffffff_100%)] p-10 text-center sm:p-14">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              ¿Tu software no está en la lista?
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Si tu software de gestión tiene API, podemos integrarlo. Cuéntanos qué usas.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/integraciones/solicitar"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
              >
                Solicitar integración
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/developers"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-8 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Ver API para developers
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
