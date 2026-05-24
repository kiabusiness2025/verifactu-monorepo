import type { Metadata } from 'next';
import { MessageCircle } from 'lucide-react';
import WhatsAppHistoryClient from './WhatsAppHistoryClient';

export const metadata: Metadata = { title: 'WhatsApp — Isaak' };

export default function WhatsAppPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
            <MessageCircle size={16} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-[#011c67]">WhatsApp</h1>
            <p className="text-[12px] text-slate-500">
              Consulta a Isaak directamente desde tu WhatsApp
            </p>
          </div>
        </div>
      </div>
      <WhatsAppHistoryClient />
    </div>
  );
}
