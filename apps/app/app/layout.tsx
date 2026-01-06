import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Verifactu Business",
  description: "Plataforma para llevar ventas, gastos y beneficio con tranquilidad, cumpliendo VeriFactu.",
  icons: {
    icon: [
      { url: "/brand/favicon/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/brand/favicon/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/brand/favicon/favicon-128.png", sizes: "128x128", type: "image/png" },
      { url: "/brand/favicon/favicon-256.png", sizes: "256x256", type: "image/png" },
    ],
    apple: [{ url: "/brand/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/brand/favicon/favicon-16.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/brand/favicon/favicon-32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/brand/favicon/favicon-48.png" sizes="48x48" type="image/png" />
        <link rel="icon" href="/brand/favicon/favicon-64.png" sizes="64x64" type="image/png" />
        <link rel="icon" href="/brand/favicon/favicon-128.png" sizes="128x128" type="image/png" />
        <link rel="icon" href="/brand/favicon/favicon-256.png" sizes="256x256" type="image/png" />
        <link rel="apple-touch-icon" href="/brand/favicon/apple-touch-icon.png" />
      </head>
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
