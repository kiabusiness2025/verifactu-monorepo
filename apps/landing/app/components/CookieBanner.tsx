"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const COOKIE_CONSENT_KEY = "verifactu_cookie_consent";

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = (mode: "essential" | "all") => {
    localStorage.setItem(COOKIE_CONSENT_KEY, mode);
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
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
        <p className="text-sm text-slate-600">
          Utilizamos cookies técnicas para el funcionamiento esencial. Puedes aceptar solo las esenciales o todas. Más detalle en {" "}
          <Link href="/legal/cookies" className="text-[#2361d8] font-semibold hover:text-[#2361d8]" aria-label="Leer política de cookies">Política de cookies</Link>.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => handleAccept("essential")}
            className="inline-flex items-center justify-center rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-200"
          >
            Solo esenciales
          </button>
          <button
            onClick={() => handleAccept("all")}
            className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f55c0]"
          >
            Aceptar todo
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


