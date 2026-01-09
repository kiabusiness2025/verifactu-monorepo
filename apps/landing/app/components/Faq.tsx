"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQ_DATA = [
  {
    id: "free-card",
    question: "¿Necesito tarjeta para registrarme?",
    answer:
      "No. El plan Gratis es completamente gratuito y sin compromiso. Solo necesitamos tu email para crear la cuenta. Puedes cancelar cuando quieras y seguirás teniendo acceso a tus datos.",
  },
  {
    id: "multiple-companies",
    question: "¿Puedo conectar varias empresas?",
    answer:
      "Sí. Desde el plan Profesional puedes tener varias empresas en la misma cuenta. Cada empresa tiene su propio espacio, usuarios y libros separados.",
  },
  {
    id: "banking-integration",
    question: "¿Cómo funcionará la integración bancaria? (próximamente)",
    answer:
      "Será opcional: podrás activarla o desactivarla en cualquier momento. Los movimientos se sincronizarán con tu permiso y podrás revisarlos antes de registrarlos.",
  },
  {
    id: "gestoria-replacement",
    question: "¿Isaak sustituye a una gestoría?",
    answer:
      "Isaak te ayuda a registrar y ordenar tus documentos, y a entender tu situación. Puedes usarlo con o sin gestoría. Si trabajas con un gestor, puedes darle acceso a tus informes y evidencias.",
  },
  {
    id: "verifactu-compliance",
    question: "¿Qué implica el cumplimiento Verifactu?",
    answer:
      "Guardamos tus facturas con evidencias de integridad, fecha y trazabilidad. Puedes exportar libros y evidencias cuando lo necesites.",
  },
  {
    id: "additional-services",
    question: "¿Puedo contratar trámites adicionales desde la app?",
    answer:
      "Estamos preparando opciones para trámites puntuales. Cuando estén disponibles, podrás gestionarlos desde la plataforma.",
  },
  {
    id: "document-security",
    question: "¿Es seguro subir mis documentos?",
    answer:
      "Sí. Usamos cifrado en tránsito, controles por empresa, registros de acceso y backups. Solo tu organización y los usuarios autorizados pueden ver los documentos.",
  },
];

export default function Faq() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Cargar estado guardado del localStorage
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("faq-expanded");
    if (saved) setExpandedId(saved);
  }, []);

  const toggleFaq = (id: string) => {
    const newId = expandedId === id ? null : id;
    setExpandedId(newId);
    if (newId) {
      localStorage.setItem("faq-expanded", newId);
    } else {
      localStorage.removeItem("faq-expanded");
    }
  };

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

  if (!mounted) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="space-y-3">
        {FAQ_DATA.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all hover:shadow-md"
          >
            {/* Accordion Header */}
            <button
              onClick={() => toggleFaq(item.id)}
              className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              aria-expanded={expandedId === item.id}
              aria-controls={`faq-content-${item.id}`}
            >
              <p className="text-base font-semibold text-slate-900 pr-4">{item.question}</p>
              <motion.div
                animate={{ rotate: expandedId === item.id ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="flex-shrink-0"
              >
                <ChevronDown className="w-5 h-5 text-slate-600" aria-hidden="true" />
              </motion.div>
            </button>

            {/* Accordion Content */}
            <AnimatePresence>
              {expandedId === item.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  id={`faq-content-${item.id}`}
                  className="border-t border-slate-200 px-6 py-5 bg-slate-50"
                >
                  <p className="text-sm leading-6 text-slate-600">{item.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
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