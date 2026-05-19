'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import IssuedInvoicesPanel from './IssuedInvoicesPanel';
import NewInvoiceForm from './NewInvoiceForm';

type Tab = 'list' | 'new';

export default function VentasWorkspaceClient() {
  const [tab, setTab] = useState<Tab>('list');
  const [listKey, setListKey] = useState(0);

  const handleCreated = () => {
    setTab('list');
    setListKey((k) => k + 1);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-2.5">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setTab('list')}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
              tab === 'list'
                ? 'bg-[#2361d8]/10 text-[#2361d8]'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            Emitidas
          </button>
          <button
            type="button"
            onClick={() => setTab('new')}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
              tab === 'new'
                ? 'bg-[#2361d8]/10 text-[#2361d8]'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            Nueva factura
          </button>
        </div>
        {tab === 'list' && (
          <button
            type="button"
            onClick={() => setTab('new')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2361d8] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1f55c0]"
          >
            <Plus size={13} />
            Nueva factura
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === 'list' ? (
          <IssuedInvoicesPanel key={listKey} />
        ) : (
          <div className="overflow-y-auto p-5">
            <NewInvoiceForm onCreated={handleCreated} />
          </div>
        )}
      </div>
    </div>
  );
}
