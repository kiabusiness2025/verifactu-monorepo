"use client";

import React, { useState } from "react";

const FAQ_DATA = [
  {
    question: "¿Necesito tarjeta para registrarme?",
    answer:
      "No. El plan Free es completamente gratuito y sin compromiso.",
  },
  {
    question: "¿Puedo conectar varias empresas?",
    answer: "Sí, desde el plan Profesional.",
  },
  {
    question: "¿Cómo funciona la integración bancaria?",
    answer:
      "Usamos proveedores PSD2 certificados. La conexión es segura y puedes darte de baja en cualquier momento.",
  },
  {
    question: "¿Isaak sustituye a una gestoría?",
    answer:
      "Isaak automatiza procesos, cálculos y preparación de datos. Puedes usarlo con o sin gestoría externa.",
  },
  {
    question: "¿Qué implica el cumplimiento Verifactu?",
    answer:
      "Tus facturas quedan registradas automáticamente según los requisitos oficiales de integridad, trazabilidad y seguridad.",
  },
  {
    question: "¿Puedo contratar trámites adicionales desde la app?",
    answer:
      "Sí. Tienes un marketplace interno con constituciones, certificados, servicios notariales y gestiones fiscales.",
  },
  {
    question: "¿Es seguro subir mis documentos?",
    answer:
      "Sí. Utilizamos cifrado extremo a extremo y almacenamiento seguro con control de acceso por empresa.",
  },
];

function FaqItem({
  item,
  isOpen,
  onClick,
}: {
  item: { question: string; answer: string };
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className={`faq-item ${isOpen ? "is-open" : ""}`}>
      <button className="faq-item__question" onClick={onClick}>
        <span>{item.question}</span>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="faq-item__icon"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="faq-item__answer">
        <p>{item.answer}</p>
      </div>
    </div>
  );
}

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="section faq-section">
      <div className="container">
        <div className="section__header">
          <h2>Preguntas Frecuentes</h2>
          <p>
            Resolvemos dudas sobre registro, integraciones, seguridad y cómo Isaak automatiza tu operativa.
          </p>
        </div>
        <div className="faq-list">
          {FAQ_DATA.map((item, index) => (
            <FaqItem
              key={index}
              item={item}
              isOpen={openIndex === index}
              onClick={() => handleToggle(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}