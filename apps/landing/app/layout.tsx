import type { Metadata } from "next";
import React, { Suspense } from "react";
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Suspense>{children}</Suspense>
        <CookieBanner />
        <IsaakChat />
      </body>
    </html>
  );
}