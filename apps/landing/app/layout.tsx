import type { Metadata, Viewport } from "next";
import React, { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "./context/AuthContext";
import CookieBanner from "./components/CookieBanner";
import IsaakChat from "./components/IsaakChat";

import "./globals.css";

const title = "Verifactu Business";
const description =
  "Plataforma SaaS para automatizar facturación y contabilidad cumpliendo VeriFactu (AEAT).";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://verifactu.business"),
  icons: {
    icon: "/favicon.svg",
    apple: "/icon-192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title,
  },
  openGraph: {
    title,
    description,
    type: "website",
    locale: "es_ES",
    url: "https://verifactu.business",
    siteName: "Verifactu Business",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Verifactu" />
      </head>
      <body>
        <AuthProvider>
          <Suspense>{children}</Suspense>
          <CookieBanner />
          <IsaakChat />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}