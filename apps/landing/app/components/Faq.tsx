"use client";

import React from "react";
import Link from "next/link";

const FAQ_DATA: {
  question: string;
  answer: React.ReactNode;
  answerText: string;
}[] = [
  {
    question: "Como funciona el acceso gratis para siempre?",
    answer: (
      <>
        Tienes 30 dias para crear y registrar. Despues mantienes acceso en modo lectura y exportacion
        AEAT (Excel). Si necesitas seguir operando sin limites, puedes elegir un plan en{" "}
        <Link href="/planes" className="font-semibold text-[#2361d8] hover:text-[#2361d8]">
          planes
        </Link>
        .
      </>
    ),
    answerText:
      "Tienes 30 dias para crear y registrar. Despues mantienes acceso en modo lectura y exportacion AEAT (Excel). Si necesitas seguir operando sin limites, puedes elegir un plan en planes.",
  },
  {
    question: "Como se calcula el exceso de facturas?",
    answer: (
      <>
        Si superas las facturas incluidas, puedes seguir facturando. El exceso se calcula por tramos y
        se refleja en la siguiente factura mensual junto con tu cuota de plan. Puedes estimarlo en{" "}
        <Link href="/#planes" className="font-semibold text-[#2361d8] hover:text-[#2361d8]">
          la calculadora de exceso
        </Link>{" "}
        .
      </>
    ),
    answerText:
      "Si superas las facturas incluidas, puedes seguir facturando. El exceso se calcula por tramos y se refleja en la siguiente factura mensual junto con tu cuota de plan. Puedes estimarlo en la calculadora de exceso.",
  },
  {
    question: "Isaak es lo mismo que ChatGPT u otra IA general?",
    answer: (
      <>
        No. Isaak esta especializado en el flujo de facturacion, gastos, plazos y cumplimiento de
        tu empresa dentro de Verifactu. Una IA general no conoce por defecto tu operativa ni tus
        reglas internas.
      </>
    ),
    answerText:
      "No. Isaak esta especializado en el flujo de facturacion, gastos, plazos y cumplimiento de tu empresa dentro de Verifactu. Una IA general no conoce por defecto tu operativa ni tus reglas internas.",
  },
  {
    question: "Que puede hacer Isaak por mi en el dia a dia?",
    answer: (
      <>
        Puede revisar documentos, ordenar gastos, detectar incidencias, recordar plazos y resumirte
        ventas, gastos y beneficio para que decidas antes del cierre.
      </>
    ),
    answerText:
      "Puede revisar documentos, ordenar gastos, detectar incidencias, recordar plazos y resumirte ventas, gastos y beneficio para que decidas antes del cierre.",
  },
  {
    question: "Isaak guarda contexto de mi empresa para ayudar mejor?",
    answer: (
      <>
        Si. Puede usar informacion de tu tenant (configuracion, historico y documentos autorizados)
        para darte respuestas mas utiles y menos genericas.
      </>
    ),
    answerText:
      "Si. Puede usar informacion de tu tenant (configuracion, historico y documentos autorizados) para darte respuestas mas utiles y menos genericas.",
  },
  {
    question: "Compartis mis datos con humanos sin permiso?",
    answer: (
      <>
        No. Tus datos no se comparten con ningun humano sin tu autorizacion previa, salvo obligaciones
        legales aplicables.
      </>
    ),
    answerText:
      "No. Tus datos no se comparten con ningun humano sin tu autorizacion previa, salvo obligaciones legales aplicables.",
  },
  {
    question: "Puedo borrar historial y memoria de Isaak?",
    answer: (
      <>
        Si. Puedes solicitar borrado de historial y reinicio de memoria para tu espacio de trabajo.
        Tambien puedes gestionar conservacion desde configuracion y soporte.
      </>
    ),
    answerText:
      "Si. Puedes solicitar borrado de historial y reinicio de memoria para tu espacio de trabajo. Tambien puedes gestionar conservacion desde configuracion y soporte.",
  },
  {
    question: "Existe modo de mensaje temporal?",
    answer: (
      <>
        Si. Estamos preparando mensajes temporales para consultas puntuales que no se incorporen al
        contexto persistente.
      </>
    ),
    answerText:
      "Si. Estamos preparando mensajes temporales para consultas puntuales que no se incorporen al contexto persistente.",
  },
  {
    question: "Habra modo voz con Isaak?",
    answer: (
      <>
        Si. La funcion de voz esta en roadmap para dictar consultas y escuchar respuestas sin teclear.
        Si quieres acceso temprano,{" "}
        <Link href="/recursos/contacto" className="font-semibold text-[#2361d8] hover:text-[#2361d8]">
          apuntate aqui
        </Link>{" "}
        .
      </>
    ),
    answerText:
      "Si. La funcion de voz esta en roadmap para dictar consultas y escuchar respuestas sin teclear. Si quieres acceso temprano, apuntate aqui.",
  },
  {
    question: "Isaak sustituye a mi gestor?",
    answer: (
      <>
        No. Isaak y la plataforma son un apoyo para trabajar mejor con datos diarios. Tu asesor sigue
        siendo la referencia para cierre y criterio fiscal final.
      </>
    ),
    answerText:
      "No. Isaak y la plataforma son un apoyo para trabajar mejor con datos diarios. Tu asesor sigue siendo la referencia para cierre y criterio fiscal final.",
  },
  {
    question: "VeriFactu esta incluido?",
    answer: (
      <>
        Si. Incluye sellado, trazabilidad y evidencias exportables para auditoria. Puedes ver el estado en{" "}
        <Link href="/verifactu/estado" className="font-semibold text-[#2361d8] hover:text-[#2361d8]">
          estado del servicio
        </Link>
        .
      </>
    ),
    answerText:
      "Si. Incluye sellado, trazabilidad y evidencias exportables para auditoria. Puedes ver el estado en estado del servicio.",
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
        text: item.answerText,
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
        <div className="text-sm text-slate-600">
          Quieres ver en detalle todo lo que puede hacer Isaak para tu empresa?
        </div>
        <div className="flex gap-3">
          <Link
            href="/que-es-isaak"
            className="mt-2 inline-block rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Que es Isaak
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


