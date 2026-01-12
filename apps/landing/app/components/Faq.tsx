"use client";

import React from "react";
import Link from "next/link";

const FAQ_DATA = [
  {
    question: "¿Cómo se calcula el precio?",
    answer:
      "Pagas por uso real: una base mensual + tramo de facturas y, si activas conciliación bancaria, tramo de movimientos.",
  },
  {
    question: "¿Hay permanencia o comisiones sobre facturación?",
    answer:
      "No. Puedes subir o bajar uso cuando quieras y nunca cobramos porcentaje sobre tus ventas.",
  },
  {
    question: "¿Necesito tarjeta para probar?",
    answer:
      "Tienes 1 mes gratis. El cobro se activa solo si confirmas la suscripción.",
  },
  {
    question: "¿Qué pasa si supero un tramo de facturas o movimientos?",
    answer:
      "El precio se ajusta al tramo correspondiente. Siempre verás el importe antes de renovar.",
  },
  {
    question: "¿La conciliación bancaria es opcional?",
    answer:
      "Sí. Puedes activarla o desactivarla cuando quieras. Si no la activas, movimientos = 0.",
  },
  {
    question: "¿Necesito certificado? ¿Cómo firmo?",
    answer:
      "Te guiamos paso a paso. La firma y el sellado se gestionan desde la plataforma según la normativa aplicable.",
  },
  {
    question: "¿Qué pasa si la AEAT está caída?",
    answer:
      "Seguimos generando y guardando evidencias. Reintentamos el envío y puedes ver el estado en /verifactu/estado.",
  },
  {
    question: "¿VeriFactu está incluido?",
    answer:
      "Sí. Incluye sellado, trazabilidad y evidencias exportables para auditoría.",
  },
  {
    question: "¿Puedo exportar mis datos?",
    answer:
      "Siempre. Tus facturas, documentos y evidencias son tuyos.",
  },
];

export default function Faq() {
  const faqSchema = {
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
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="space-y-3">
        {FAQ_DATA.map((item) => (
          <div
            key={item.question}
            className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-shadow hover:shadow-sm"
          >
            <div className="px-6 py-5">
              <p className="text-base font-semibold text-slate-900">{item.question}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">¿Quieres ver el precio exacto antes de activar?</div>
        <div className="flex gap-3">
          <Link
            href="/demo#calculadora"
            className="mt-2 inline-block rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Calcula tu precio
          </Link>
          <Link
            href="/verifactu/soporte"
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-200"
          >
            Abrir soporte
          </Link>
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </div>
  );
}
