import React from "react";

const title = "Veri*Factu Business - Automatiza tu facturación con IA";
const description =
  "Cumple con VeriFactu y haz crecer tu negocio. Isaak centraliza la emisión, valida con AEAT y te sugiere cómo mejorar tus márgenes automáticamente.";
const url = "https://verifactu.business";

export const metadata = {
  title,
  description,
  icons: [{ rel: "icon", url: "/assets/favicon.svg" }],
  metadataBase: new URL(url),
  openGraph: {
    title,
    description,
    url,
    siteName: "Veri*Factu Business",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
