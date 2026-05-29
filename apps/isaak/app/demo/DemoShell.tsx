'use client';

import { ArrowRight, FlaskConical, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import IsaakChatSection from '@/app/(workspace)/components/IsaakChatSection';
import { DEMO_COMPANY_NAME, DEMO_DAILY_LIMIT } from '@/app/lib/isaak-demo-context';

export default function DemoShell({
  userName,
  demoUsed,
}: {
  userName?: string | null;
  demoUsed: number;
}) {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const remaining = Math.max(0, DEMO_DAILY_LIMIT - demoUsed);

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      {/* Demo banner */}
      {!bannerDismissed && (
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <div className="flex items-center gap-2 min-w-0">
            <FlaskConical className="h-4 w-4 flex-shrink-0 text-amber-600" />
            <span className="font-medium">Modo demo</span>
            <span className="hidden text-amber-700 sm:inline">
              — Estás viendo datos de <strong className="font-semibold">{DEMO_COMPANY_NAME}</strong>
              , una empresa de demostración de Holded. Las acciones de escritura están desactivadas.
            </span>
            <span className="text-amber-600">
              {remaining}/{DEMO_DAILY_LIMIT} mensajes restantes hoy.
            </span>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <Link
              href="/integraciones"
              className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-amber-700"
            >
              Conectar mi Holded
              <ArrowRight className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="Cerrar banner demo"
              className="flex h-6 w-6 items-center justify-center rounded-full text-amber-600 hover:bg-amber-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Full chat — same experience as Pro workspace */}
      <div className="min-h-0 flex-1">
        <IsaakChatSection
          context="demo"
          streamEndpoint="/api/demo/chat/stream"
          holdedConnected={true}
          isFreePlan={false}
          userName={userName}
          welcomeTitle={`Bienvenido a la demo de Isaak`}
          welcomeSubtitle={`Estás conectado a ${DEMO_COMPANY_NAME}. Pregunta lo que quieras sobre las finanzas de esta empresa de ejemplo.`}
        />
      </div>
    </div>
  );
}
