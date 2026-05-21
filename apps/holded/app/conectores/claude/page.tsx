import type { Metadata } from 'next';
import { ConnectorLandingClient } from '@/app/components/ConnectorLandingClient';
import { ConnectorStatusBadge } from '@/app/components/ConnectorStatusBadge';
import { ConnectorMobileBanner } from '@/app/components/ConnectorMobileBanner';
import { getFaqJsonLd } from '@/app/components/ConnectorFAQData';

const SITE_URL = process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';
const PAGE_URL = `${SITE_URL}/conectores/claude`;
const OG_IMAGE = `${SITE_URL}/api/og/claude`;

export const metadata: Metadata = {
  title: 'Pregunta a Holded desde Claude | Verifactu Business',
  description:
    'Conecta Holded con Claude para consultar facturas, contactos y contabilidad en lenguaje natural. Borradores de factura solo con confirmación.',
  keywords: [
    'conector Holded',
    'Claude Holded',
    'Anthropic Holded',
    'Verifactu',
    'facturas IA',
    'contabilidad IA',
    'Claude IA Holded',
    'asistente Holded',
    'asistente fiscal',
  ],
  alternates: {
    canonical: '/conectores/claude',
  },
  openGraph: {
    title: 'Pregunta a Holded desde Claude | Verifactu Business',
    description:
      'Consulta tus datos de Holded desde Claude. Solo lectura por defecto y borradores con confirmación.',
    url: PAGE_URL,
    siteName: 'Holded by Verifactu Business',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Pregunta a Holded desde Claude',
      },
    ],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pregunta a Holded desde Claude | Verifactu Business',
    description:
      'Consulta tus datos de Holded desde Claude. Solo lectura por defecto y borradores con confirmación.',
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
      alternateName: 'Holded para Claude',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'AI Connector',
      operatingSystem: 'Web (Claude.ai)',
      description:
        'Conector de Verifactu Business que permite a Claude consultar datos de Holded en lenguaje natural. El alcance depende de los permisos concedidos.',
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
        'PDFs de documentos existentes',
        'Borrador de factura con confirmacion explicita',
      ],
      requiresSubscription: 'No',
      isAccessibleForFree: true,
      softwareVersion: '1.0',
    },
    {
      '@type': 'WebPage',
      '@id': PAGE_URL,
      url: PAGE_URL,
      name: 'Pregunta a Holded desde Claude | Verifactu Business',
      description:
        'Consulta datos de Holded desde Claude en lenguaje natural. Solo lectura por defecto, borradores con confirmación y soporte separado.',
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
      <ConnectorStatusBadge connector="claude" />
      <ConnectorLandingClient connector="claude" />
    </>
  );
}
