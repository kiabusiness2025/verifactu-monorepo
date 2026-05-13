import type { Metadata } from 'next';
import { ConnectorLandingClient } from '@/app/components/ConnectorLandingClient';
import { ConnectorMobileBanner } from '@/app/components/ConnectorMobileBanner';
import { getFaqJsonLd } from '@/app/components/ConnectorFAQData';

const SITE_URL = process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';
const PAGE_URL = `${SITE_URL}/conectores/claude`;
const OG_IMAGE = `${SITE_URL}/brand/holded/holded-diamond-logo.png`;

export const metadata: Metadata = {
  title: 'Conector Holded para Claude | Verifactu Business',
  description:
    'Conector Holded de Verifactu Business para Claude (Anthropic): consulta facturas, contactos, contabilidad, productos, proyectos y CRM en lenguaje natural. OAuth 2.0 + PKCE. Hasta 24 herramientas. Plan gratis durante el lanzamiento.',
  keywords: [
    'conector Holded',
    'Claude Holded',
    'MCP Holded',
    'Anthropic Holded',
    'Verifactu',
    'facturas IA',
    'contabilidad IA',
    'OAuth Holded',
    'PKCE',
    'asistente fiscal',
  ],
  alternates: {
    canonical: '/conectores/claude',
  },
  openGraph: {
    title: 'Conector Holded para Claude | Verifactu Business',
    description:
      'Habla con tus datos de Holded desde Claude. Hasta 24 tools, lectura segun permisos y borrador con confirmacion. OAuth seguro. Gratis durante el lanzamiento.',
    url: PAGE_URL,
    siteName: 'Holded by Verifactu Business',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Conector Holded para Claude',
      },
    ],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Conector Holded para Claude | Verifactu Business',
    description:
      'Habla con tus datos de Holded desde Claude. Hasta 24 tools, lectura segun permisos y borrador con confirmacion. OAuth seguro.',
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      '@id': `${PAGE_URL}#software`,
      name: 'Conector Holded para Claude',
      alternateName: 'Holded MCP Connector',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'AI Connector',
      operatingSystem: 'Web (Claude.ai)',
      description:
        'Conector MCP de Verifactu Business que permite a Claude consultar facturas, contactos, contabilidad, productos, proyectos y CRM de Holded en lenguaje natural. OAuth 2.0 + PKCE + DCR. Hasta 24 tools segun permisos.',
      url: PAGE_URL,
      image: OG_IMAGE,
      author: {
        '@type': 'Organization',
        name: 'Expert Estudios Profesionales, SLU',
        alternateName: 'Verifactu Business',
        url: 'https://verifactu.business',
      },
      provider: {
        '@type': 'Organization',
        name: 'Verifactu Business',
        url: 'https://verifactu.business',
        sameAs: ['https://holded.verifactu.business'],
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        description: 'Gratis durante el lanzamiento. Sin tarjeta. Sin limites.',
      },
      featureList: [
        'Listado y detalle de facturas',
        'Listado y detalle de contactos',
        'Plan de cuentas y diario contable',
        'Borrador de factura con confirmacion explicita',
        'Productos y stock',
        'Proyectos y tareas',
        'CRM: leads y embudos',
        'PDFs de documentos existentes',
        'Equipo, tesoreria, IVA, almacenes, series',
      ],
      requiresSubscription: 'No',
      isAccessibleForFree: true,
      softwareVersion: '1.0',
    },
    {
      '@type': 'WebPage',
      '@id': PAGE_URL,
      url: PAGE_URL,
      name: 'Conector Holded para Claude | Verifactu Business',
      description:
        'Pagina del conector Holded para Claude. Documentacion, demo, privacidad, DPA y soporte.',
      isPartOf: {
        '@type': 'WebSite',
        name: 'Holded by Verifactu Business',
        url: SITE_URL,
      },
      inLanguage: 'es-ES',
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Conectores', item: `${SITE_URL}/conectores` },
          { '@type': 'ListItem', position: 3, name: 'Claude', item: PAGE_URL },
        ],
      },
    },
    {
      '@type': 'Organization',
      '@id': 'https://verifactu.business#org',
      name: 'Expert Estudios Profesionales, SLU',
      alternateName: 'Verifactu Business',
      url: 'https://verifactu.business',
      logo: OG_IMAGE,
      email: 'soporte@verifactu.business',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'ES',
      },
      sameAs: ['https://holded.verifactu.business'],
    },
  ],
};

// FAQ JSON-LD aparte: schema.org recomienda FAQPage como entidad de primer
// nivel y muchos validadores penalizan mezclarla dentro de un @graph con
// SoftwareApplication/WebPage. Mantenemos dos <script> separados.
const faqJsonLd = getFaqJsonLd('Claude', 'Anthropic');

export default function ClaudeConnectorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* F4.3: banner mobile-only que invita a usar /auth/holded-direct
          (sobrevive al iOS in-app browser de Claude mobile). */}
      <ConnectorMobileBanner provider="claude" />
      <ConnectorLandingClient connector="claude" />
    </>
  );
}
