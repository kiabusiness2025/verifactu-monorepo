"use client";

import React, { useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="alert" aria-live="polite">
      <p>
        Usamos cookies para mejorar tu experiencia. Puedes continuar navegando o cerrar este mensaje.
      </p>
      <div className="cookie-banner__actions">
        <button type="button" className="btn btn--ghost" onClick={() => setVisible(false)}>
          Rechazar
        </button>
        <button type="button" className="btn btn--primary" onClick={() => setVisible(false)}>
          Aceptar
        </button>
      </div>
    </div>
  );
}
