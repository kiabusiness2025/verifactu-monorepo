import { VideoIcon } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demo OpenAI Review | Holded con ChatGPT',
  description:
    'Grabación real de la demo para revisión OpenAI. Incluye flows de conexión, lectura y confirmación de borradores.',
};

export default function OpenAIReviewDemoPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center py-16">
      <div className="flex flex-col items-center gap-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#10a37f]/20 bg-[#10a37f]/10 px-3 py-1 text-xs font-semibold text-[#10a37f]">
          <VideoIcon className="h-4 w-4" />
          Demo OpenAI Review
        </div>
        <h1 className="text-3xl font-bold">Grabación real de la demo</h1>
        <p className="max-w-xl text-center text-base text-slate-600">
          Este vídeo muestra el flujo real de conexión, lectura de datos y confirmación de
          borradores en el conector Holded para ChatGPT, tal como se requiere en la revisión de
          OpenAI Platform.
        </p>
        <div className="w-full max-w-2xl aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black">
          {/* Sustituye la ruta por la grabación real cuando esté disponible */}
          <video controls poster="/brand/holded/holded-diamond-logo.png" className="w-full h-full">
            <source src="/video/Video Holded App 1.mp4" type="video/mp4" />
            Tu navegador no soporta la reproducción de vídeo.
          </video>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Si necesitas la grabación en otro formato o enlace, contacta con
          soporte@verifactu.business
        </p>
      </div>
    </main>
  );
}
