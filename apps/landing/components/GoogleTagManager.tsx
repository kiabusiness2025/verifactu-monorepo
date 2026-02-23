"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const GTM_ID = "GTM-PHP7QW26";
const COOKIE_CONSENT_KEY = "verifactu_cookie_consent";

function hasAnalyticsConsent() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(COOKIE_CONSENT_KEY) === "all";
}

export function GoogleTagManager() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const syncConsent = () => setEnabled(hasAnalyticsConsent());

    syncConsent();
    window.addEventListener("storage", syncConsent);
    window.addEventListener("verifactu:cookie-consent", syncConsent as EventListener);

    return () => {
      window.removeEventListener("storage", syncConsent);
      window.removeEventListener("verifactu:cookie-consent", syncConsent as EventListener);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Google Tag Manager - Script */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){
              w[l]=w[l]||[];
              w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
              var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),
              dl=l!='dataLayer'?'&l='+l:'';
              j.async=true;
              j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
              f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `,
        }}
      />
    </>
  );
}
