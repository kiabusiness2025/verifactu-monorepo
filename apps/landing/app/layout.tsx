import React, { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import CookieBanner from "./components/CookieBanner";

const title = "Veri*Factu Business - Automatiza tu facturación con IA";
const description = "Cumple con VeriFactu y haz crecer tu negocio. Isaak centraliza la emisión, valida con AEAT y te sugiere cómo mejorar tus márgenes automáticamente.";
const url = "https://verifactu.business";

export const metadata = {
  title: "Veri*Factu Business - Automatiza tu facturación con IA",
  description: "Cumple con VeriFactu y haz crecer tu negocio. Isaak centraliza la emisión, valida con AEAT y te sugiere cómo mejorar tus márgenes automáticamente.",
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
  themeColor: "#2563eb",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SessionProvider>
          <Suspense>{children}</Suspense>
          <CookieBanner />
        </SessionProvider>
      </body>
    </html>
  );
}