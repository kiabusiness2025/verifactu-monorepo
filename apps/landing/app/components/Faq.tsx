"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

const FAQ_DATA = [
  {
    question: "¿Necesito tarjeta para registrarme?",
    answer:
      "No. El plan Gratis es completamente gratuito y sin compromiso. Solo necesitamos tu email para crear la cuenta. Puedes cancelar cuando quieras y seguirás teniendo acceso a tus datos.",
  },
  {
    question: "¿Puedo conectar varias empresas?",
    answer:
      "Sí. Desde el plan Profesional puedes tener varias empresas en la misma cuenta. Cada empresa tiene su propio espacio, usuarios y libros separados.",
  },
  {
    question: "¿Cómo funcionará la integración bancaria? (próximamente)",
    answer:
      "Lanzaremos conexión PSD2 certificada. Será opcional: podrás activarla o desactivarla en cualquier momento. Los movimientos se sincronizarán con consentimiento explícito y podrás reconciliarlos antes de registrarlos.",
  },
  {
    question: "¿Isaak sustituye a una gestoría?",
    answer:
      "Isaak automatiza procesos (OCR, clasificación, avisos, Verifactu), pero puedes usarlo con o sin gestoría externa. Si trabajas con gestor, le das acceso a tus libros y evidencias.",
  },
  {
    question: "¿Qué implica el cumplimiento Verifactu?",
    answer:
      "Registramos tus facturas con hash encadenado, marca temporal y trazabilidad de eventos (creación, validación, envíos). Puedes exportar libros y evidencias cuando lo necesites.",
  },
  {
    question: "¿Puedo contratar trámites adicionales desde la app?",
    answer:
      "Sí. Dispones de un marketplace con constituciones de sociedades, certificados digitales, gestiones notariales y trámites fiscales puntuales.",
  },
  {
    question: "¿Es seguro subir mis documentos?",
    answer:
      "Sí. Usamos cifrado en tránsito, controles por empresa, registros de acceso y backups. Solo tu organización y los usuarios autorizados pueden ver los documentos.",
  },
];

export default function Faq() {
  const faqSchema = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_DATA.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    }),
    []
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="space-y-3">
        {FAQ_DATA.map((item, index) => (
          <motion.div
            key={item.question}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-shadow hover:shadow-sm"
          >
            <div className="px-6 py-5">
              <p className="text-base font-semibold text-slate-900">{item.question}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </div>
  );
}