import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Verifactu - Cumple con la facturación digital',
  description: 'Centraliza tus puntos de emisión y automatiza el envío de los libros de facturas al SII con una plataforma segura y certificada.',
  keywords: 'Verifactu, facturación digital, SII, facturas, tickets, automatización',
  authors: [{ name: 'Verifactu' }],
  openGraph: {
    title: 'Verifactu - Cumple con la facturación digital',
    description: 'La forma más simple de emitir y cumplir con Verifactu para tu negocio',
    type: 'website',
    locale: 'es_ES',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
