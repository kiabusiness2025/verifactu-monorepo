import type { Metadata, Viewport } from "next";
import React, { Suspense } from "react";
import { Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "./context/AuthContext";
import CookieBanner from "./components/CookieBanner";
import IsaakChat from "./components/IsaakChat";
import DevStatusBanner from "./components/DevStatusBanner";
import { ToastProvider } from "./components/Toast";

import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const title = "Verifactu Business";
const description =
  "Plataforma SaaS para automatizar facturacion y contabilidad cumpliendo VeriFactu (AEAT).";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://verifactu.business"),
  icons: {
    icon: [
      { url: "/brand/favicon/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/brand/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
    images: [
      {
        url: "/brand/social/og-1200x630.png",
        width: 1200,
        height: 630,
        alt: "Verifactu Business - Automatiza tu facturacion con cumplimiento verificado",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/brand/social/og-1200x630.png"],
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
        <link rel="icon" href="/brand/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/brand/favicon/apple-touch-icon.png" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Verifactu" />
      </head>
      <body className={display.className}>
        <AuthProvider>
          <ToastProvider>
            <Suspense>{children}</Suspense>
            {process.env.NODE_ENV !== "production" && <DevStatusBanner />}
            <CookieBanner />
            <IsaakChat />
            <Analytics />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
