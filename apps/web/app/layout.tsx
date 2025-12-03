import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "verifactu.business · Infraestructura fiscal-as-a-service",
  description:
    "Gestión fiscal y contable automatizada con Verifactu, bancos, Google Drive e Isaak en un único panel inteligente.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  metadataBase: new URL("https://verifactu.business"),
  openGraph: {
    title: "verifactu.business · Infraestructura fiscal-as-a-service",
    description:
      "Control financiero en tiempo real con Verifactu, bancos, Drive, calendario fiscal e Isaak en una única plataforma.",
    url: "https://verifactu.business",
    siteName: "verifactu.business",
    images: [
      {
        url: "/brand/logo-light.svg",
        width: 420,
        height: 120,
        alt: "VeriFactu Business",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "verifactu.business",
    description:
      "IA fiscal que entiende tu negocio: facturación Verifactu, bancos, Drive, calendario fiscal y servicios on-demand.",
    images: ["/brand/logo-light.svg"],
  },
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
