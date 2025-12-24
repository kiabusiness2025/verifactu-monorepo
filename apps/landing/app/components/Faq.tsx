"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

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
  index,
}: {
  item: { question: string; answer: string };
  isOpen: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-shadow hover:shadow-sm"
    >
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition"
      >
        <span className="text-base font-semibold text-slate-900">
          {item.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-6 pb-5 text-sm leading-6 text-slate-600">
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="space-y-3">
        {FAQ_DATA.map((item, index) => (
          <FaqItem
            key={index}
            item={item}
            index={index}
            isOpen={openIndex === index}
            onClick={() => handleToggle(index)}
          />
        ))}
      </div>
    </div>
  );
}