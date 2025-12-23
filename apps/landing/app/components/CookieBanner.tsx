"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <p className="text-sm text-slate-600">
          Utilizamos cookies técnicas para asegurar el correcto funcionamiento de la web. 
          <strong> No usamos cookies de analítica o marketing.</strong>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleAccept}
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Entendido
          </button>
          <button
            onClick={() => setShowBanner(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}