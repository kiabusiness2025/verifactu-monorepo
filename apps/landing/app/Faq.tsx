"use client";

import React, { useState } from "react";

const FAQ_DATA = [
  {
    question: "¿Qué es exactamente VeriFactu?",
    answer:
      "VeriFactu es un sistema de emisión de facturas verificables que exige la Agencia Tributaria (AEAT) en España, según el Real Decreto 1007/2023. Obliga a que todo el software de facturación genere facturas con una firma digital y un código QR para garantizar su integridad y trazabilidad.",
  },
  {
    question: "¿Estoy obligado a usar un software VeriFactu?",
    answer:
      "Sí, prácticamente todas las empresas y autónomos que emiten facturas en España deberán usar un software adaptado a VeriFactu. La obligatoriedad se implementará de forma progresiva, pero es fundamental adaptarse cuanto antes para evitar sanciones.",
  },
  {
    question: "¿Qué hace VeriFactu Business por mí?",
    answer:
      "VeriFactu Business no solo te ayuda a cumplir la ley. Nuestra plataforma, con el asistente Isaak, automatiza todo el ciclo: emite, firma y envía las facturas a la AEAT, y además analiza tus datos para darte informes y sugerencias que te ayudarán a mejorar los márgenes de tu negocio.",
  },
  {
    question: "¿Es seguro utilizar la plataforma?",
    answer:
      "Totalmente. La seguridad es nuestra máxima prioridad. Utilizamos cifrado de extremo a extremo para todas las comunicaciones, almacenamos tus datos en la nube con los más altos estándares de seguridad y realizamos copias de seguridad automáticas para que tu información fiscal esté siempre protegida.",
  },
  {
    question: "Ya uso otro programa de contabilidad, ¿puedo integrarlo?",
    answer:
      "Sí. VeriFactu Business está diseñado para integrarse con otras herramientas. Puedes conectar tu ERP, software de contabilidad o incluso carpetas en la nube (Drive, Dropbox) para que Isaak importe y procese tus datos de forma automática, centralizando toda tu operativa.",
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
            Resolvemos las dudas más comunes sobre VeriFactu y cómo nuestra
            plataforma puede ayudarte.
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