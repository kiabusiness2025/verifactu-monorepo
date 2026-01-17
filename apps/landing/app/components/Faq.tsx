"use client";

import React from "react";
import Link from "next/link";

const FAQ_DATA = [
  {
    question: "Como se calcula el precio?",
    answer:
      "Pagas por uso real: base mensual + tramo de facturas y, si activas conciliacion bancaria, tramo de movimientos. Sin comisiones sobre ventas.",
  },
  {
    question: "Que cuenta como factura?",
    answer:
      "Factura emitida o generada en el mes. Si se numera, cuenta en el tramo correspondiente.",
  },
  {
    question: "Que cuenta como movimiento?",
    answer:
      "Movimiento procesado para conciliacion, tanto si viene de banco como si lo importas desde Excel.",
  },
  {
    question: "Cuando se recalcula la cuota?",
    answer:
      "Durante la prueba medimos el uso y antes del cobro te avisamos del importe final.",
  },
  {
    question: "Isaak sustituye a mi gestor?",
    answer:
      "No. Isaak y la plataforma son un apoyo. Te dan visibilidad diaria de ventas, gastos y beneficio para decidir sin esperar al cierre contable.",
  },
  {
    question: "Que puede hacer Isaak por mi?",
    answer:
      "Interpreta documentos, clasifica gastos, sugiere acciones, avisa de plazos y genera resumenes con ventas, gastos y beneficio.",
  },
  {
    question: "Puedo ver beneficio e impuesto estimado?",
    answer:
      "Si. Obtienes un beneficio aproximado y un impuesto estimado para comparar con tu asesoria y ajustar decisiones a tiempo.",
  },
  {
    question: "Necesito tarjeta para probar?",
    answer:
      "Tienes 1 mes gratis. El cobro se activa solo si confirmas la suscripcion.",
  },
  {
    question: "Puedo exportar y compartir con mi gestoria?",
    answer:
      "Si. Puedes exportar en PDF o Excel y compartir resultados con tu gestor o asesor cuando lo necesites.",
  },
  {
    question: "Que pasa si supero un tramo de facturas o movimientos?",
    answer:
      "El precio se ajusta al tramo correspondiente. Siempre veras el importe antes de renovar.",
  },
  {
    question: "VeriFactu esta incluido?",
    answer:
      "Si. Incluye sellado, trazabilidad y evidencias exportables para auditoria.",
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
        <div className="text-sm text-slate-600">Quieres ver el precio exacto antes de activar?</div>
        <div className="flex gap-3">
          <Link
            href="/#precios"
            className="mt-2 inline-block rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Calcula tu precio
          </Link>
          <Link
            href="/recursos/contacto"
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

