import "./globals.css";

export const metadata = {
  title: "VeriFactu Business",
  description: "Landing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
