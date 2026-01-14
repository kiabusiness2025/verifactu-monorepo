import type { Metadata, Viewport } from "next";
import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "./context/AuthContext";
import CookieBanner from "./components/CookieBanner";
import DevStatusBanner from "./components/DevStatusBanner";
import { ToastProvider } from "./components/Toast";
import { GoogleTagManager } from "../components/GoogleTagManager";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";

import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const IsaakChat = dynamic(() => import("./components/IsaakChat"), {
  ssr: false,
});

const title = "Verifactu Business";
const description =
  "Plataforma para llevar ventas, gastos y beneficio con tranquilidad, cumpliendo VeriFactu.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://verifactu.business"),
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon-32x32.png"],
  },
  manifest: "/manifest.webmanifest",
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
        alt: "Verifactu Business - Lleva tus ventas, gastos y beneficio con tranquilidad",
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
  themeColor: "#0B0F14",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <GoogleTagManager />
        {/* Preconnect a servicios externos para mejorar performance */}
        <link rel="preconnect" href="https://firebaseauth.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="preconnect" href="https://api.stripe.com" />
      </head>
      <body className={display.className}>
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:bg-[#0060F0] focus:text-white focus:px-4 focus:py-2 focus:rounded-br"
        >
          Ir al contenido principal
        </a>
        
        <AuthProvider>
          <ToastProvider>
            <main id="main-content">
              <Suspense>{children}</Suspense>
            </main>
            {process.env.NODE_ENV !== "production" && <DevStatusBanner />}
            <CookieBanner />
            <IsaakChat />
            <PWAInstallPrompt />
            <Analytics />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
