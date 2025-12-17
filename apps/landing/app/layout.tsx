 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/apps/landing/app/layout.tsx b/apps/landing/app/layout.tsx
index d19b74ff6df5e82429af6a63b989944aa2defc63..61a454e2146dc9f50f672ce5875b371da61ce7a6 100644
--- a/apps/landing/app/layout.tsx
+++ b/apps/landing/app/layout.tsx
@@ -1,37 +1,40 @@
 import React, { Suspense } from "react";
 import { SessionProvider } from "next-auth/react";
 import CookieBanner from "./components/CookieBanner";
 
 const title = "Veri*Factu Business - Automatiza tu facturación con IA";
 const description = "Cumple con VeriFactu y haz crecer tu negocio. Isaak centraliza la emisión, valida con AEAT y te sugiere cómo mejorar tus márgenes automáticamente.";
 const url = "https://verifactu.business";
 
 export const metadata = {
   title: "Veri*Factu Business - Automatiza tu facturación con IA",
   description: "Cumple con VeriFactu y haz crecer tu negocio. Isaak centraliza la emisión, valida con AEAT y te sugiere cómo mejorar tus márgenes automáticamente.",
-  icons: [{ rel: "icon", url: "/assets/favicon.svg" }],
+  icons: {
+    icon: "/icon.png",
+    apple: "/apple-icon.png",
+  },
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
 
EOF
)