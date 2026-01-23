import React from "react";
import Link from "next/link";
import { Clock, ArrowLeft } from "lucide-react";
import { getLandingUrl } from "../lib/urls";


export const metadata = {
  title: "Próximamente | VeriFactu",
  description: "Funcionalidad en desarrollo. Vuelve pronto para descubrir las novedades.",
};

export default function ProximamentePage() {
  return (
    <div className="min-h-screen bg-[#2361d8]/5 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#2361d8]/10 mb-6">
          <Clock className="w-10 h-10 text-blue-600" />
        </div>
        
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Próximamente
        </h1>
        
        <p className="text-lg text-slate-600 mb-8">
          Estamos trabajando en esta funcionalidad. Vuelve pronto para descubrir las novedades.
        </p>
        
        <Link
          href={getLandingUrl()}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}







