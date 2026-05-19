'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Building2, Loader2, X } from 'lucide-react';

export default function AdvisorModeBanner({
  clientAlias,
  clientCompanyName,
}: {
  clientAlias: string;
  clientCompanyName: string | null;
}) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  const handleExit = async () => {
    setExiting(true);
    try {
      await fetch('/api/isaak/advisor/clients/clear/switch', { method: 'POST' });
      router.refresh();
    } finally {
      setExiting(false);
    }
  };

  const label = clientCompanyName || clientAlias;

  return (
    <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-5 py-2">
      <div className="flex items-center gap-2 text-[12px] text-amber-800">
        <Building2 size={13} className="shrink-0 text-amber-600" />
        <span>
          Modo asesoría activo: <strong className="font-semibold">{label}</strong>
        </span>
      </div>
      <button
        type="button"
        onClick={() => void handleExit()}
        disabled={exiting}
        className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
      >
        {exiting ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
        Salir
      </button>
    </div>
  );
}
