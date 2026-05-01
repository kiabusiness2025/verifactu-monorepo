'use client';

import { useState } from 'react';
import IsaakChatSection from '../components/IsaakChatSection';
import IssuedInvoicesPanel from './IssuedInvoicesPanel';

type ViewMode = 'chat' | 'issued_invoices';

export default function VentasWorkspaceClient() {
  const [view, setView] = useState<ViewMode>('chat');

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 bg-white px-5 py-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setView('chat')}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
              view === 'chat'
                ? 'bg-white text-[#011c67] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Chat de ventas
          </button>
          <button
            type="button"
            onClick={() => setView('issued_invoices')}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
              view === 'issued_invoices'
                ? 'bg-white text-[#011c67] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Facturas emitidas
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === 'chat' ? (
          <IsaakChatSection
            context="ventas"
            welcomeTitle="Analiza tus ventas"
            welcomeSubtitle="Consulta facturas, cobros pendientes y rendimiento por cliente."
          />
        ) : (
          <IssuedInvoicesPanel />
        )}
      </div>
    </div>
  );
}
