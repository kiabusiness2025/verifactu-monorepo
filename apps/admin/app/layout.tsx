import "./globals.css";
import { ToastProvider } from "@/components/notifications/ToastNotifications";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
