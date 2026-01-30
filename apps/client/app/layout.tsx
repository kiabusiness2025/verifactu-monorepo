import { ThemeProvider } from "@verifactu/ui";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="vf-client">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
