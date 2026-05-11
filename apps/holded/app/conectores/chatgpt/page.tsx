import type { Metadata } from 'next';
import { ConnectorLandingClient } from '@/app/components/ConnectorLandingClient';
import { ConnectorMobileBanner } from '@/app/components/ConnectorMobileBanner';

const SITE_URL = process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';
const PAGE_URL = `${SITE_URL}/conectores/chatgpt`;
const OG_IMAGE = `${SITE_URL}/brand/holded/holded-diamond-logo.png`;

export const metadata: Metadata = {
  title: 'Conector Holded para ChatGPT | Verifactu Business',
  description:
    'Conector Holded de Verifactu Business para ChatGPT: consulta facturas, contactos, contabilidad, proyectos y CRM en lenguaje natural. Tools segun permisos. Borradores solo con confirmacion.',
  keywords: [
    'conector Holded',
    'ChatGPT Holded',
    'OpenAI Holded',
    'Apps SDK Holded',
    'Verifactu',
    'facturas IA',
    'contabilidad IA',
    'asistente fiscal',
  ],
  alternates: {
    canonical: '/conectores/chatgpt',
  },
  openGraph: {
    title: 'Conector Holded para ChatGPT | Verifactu Business',
    description:
      'Habla con tus datos de Holded desde ChatGPT. Lectura segun permisos y borrador con confirmacion.',
    url: PAGE_URL,
    siteName: 'Holded by Verifactu Business',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Conector Holded para ChatGPT',
      },
    ],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Conector Holded para ChatGPT | Verifactu Business',
    description:
      'Habla con tus datos de Holded desde ChatGPT. Lectura segun permisos y borrador con confirmacion.',
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
      name: 'Conector Holded para ChatGPT',
      alternateName: 'Holded ChatGPT App',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'AI Connector',
      operatingSystem: 'Web (ChatGPT)',
      description:
        'Conector de Verifactu Business que permite a ChatGPT consultar datos de Holded en lenguaje natural. La superficie de tools depende de los permisos concedidos.',
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
      },
      requiresSubscription: 'No',
      isAccessibleForFree: true,
      softwareVersion: '1.0',
    },
    {
      '@type': 'WebPage',
      '@id': PAGE_URL,
      url: PAGE_URL,
      name: 'Conector Holded para ChatGPT | Verifactu Business',
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
          { '@type': 'ListItem', position: 3, name: 'ChatGPT', item: PAGE_URL },
        ],
      },
    },
  ],
};

export default function ChatGPTConnectorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* F4.3: banner mobile-only que invita a usar /auth/holded-direct
          (sobrevive al iOS in-app browser de ChatGPT mobile). */}
      <ConnectorMobileBanner provider="chatgpt" />
      <ConnectorLandingClient connector="chatgpt" />
    </>
  );
}
