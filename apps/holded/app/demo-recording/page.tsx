import { CheckCircle2, Clapperboard } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Material de demostración | Compatibilidad Holded',
  description: 'Checklist y material de demostración para la compatibilidad de Isaak con Holded.',
};

const checklist = [
  'Abrir la experiencia pública desde una cuenta limpia.',
  'Mostrar discovery inicial y descripcion de la app.',
  'Ejecutar el flujo Conectar con cuenta.',
  'Pegar la API key de Holded en onboarding.',
  'Mostrar al menos un caso de lectura de facturas, contactos y cuentas.',
  'Mostrar una accion de borrador con confirmacion explicita.',
  'Cerrar mostrando que la experiencia revisada en ChatGPT es gratuita y sin compra dentro del flujo.',
];

export default function HoldedDemoRecordingPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_45%,#ffffff_100%)] text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
            <Clapperboard className="h-4 w-4" />
            Demo recording
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
            Demo recording pending final upload
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            Esta URL está preparada como referencia pública del material de demo, pero para la
            revisión en OpenAI debes usar una grabación real accesible por URL directa o compartida,
            por ejemplo Loom, YouTube oculto o vídeo hosteado.
          </p>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="text-sm font-semibold text-slate-900">
              Checklist recomendada para la grabación
            </div>
            <div className="mt-4 grid gap-3">
              {checklist.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-700"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white hover:bg-[#ef4654]"
            >
              Volver a compatibilidad Holded
            </Link>
            <Link
              href="/support"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Ver soporte
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
