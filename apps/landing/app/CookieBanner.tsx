"use client";

import React, { useState, useEffect } from "react";

const COOKIE_CONSENT_KEY = "verifactu_cookie_consent";

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent !== "true") {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="cookie-banner">
      <div className="container cookie-banner__inner">
        <p>Utilizamos cookies técnicas para asegurar el correcto funcionamiento de la web. Por ahora no usamos cookies de analítica o marketing.</p>
        <button className="btn btn--primary" onClick={handleAccept}>Entendido</button>
      </div>
    </div>
  );
}