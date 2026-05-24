'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, MessageCircle, Phone, Settings } from 'lucide-react';
import Link from 'next/link';

const ISAAK_WA_NUMBER = '+1 555 983 5009';
const ISAAK_WA_LINK = 'https://wa.me/15559835009';

type WaEvent = {
  id: string;
  direction: string;
  eventType: string;
  body: string | null;
  occurredAt: string;
};

type WaThread = {
  phoneNumber: string;
  status: string;
  lastMessageAt: string | null;
  language: string | null;
};

type WaHistory = {
  ok: boolean;
  thread: WaThread | null;
  events: WaEvent[];
  profilePhone: string | null;
  isaakPhone: string | null;
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1)
    return `Ayer ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

function isSystemMsg(body: string | null) {
  return !body || body.startsWith('[');
}

export default function WhatsAppHistoryClient() {
  const [data, setData] = useState<WaHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/whatsapp/history')
      .then((r) => r.json())
      .then((d) => setData(d.ok ? d : null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-slate-400">Cargando…</div>
    );
  }

  const visibleEvents = (data?.events ?? []).filter((e) => !isSystemMsg(e.body));
  const isLinked = !!data?.thread;
  const phone = data?.profilePhone;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="space-y-4 p-5">
        {/* Status card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${isLinked ? 'bg-emerald-50' : 'bg-slate-100'}`}
              >
                <MessageCircle
                  size={20}
                  className={isLinked ? 'text-emerald-600' : 'text-slate-400'}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#011c67]">Canal WhatsApp</span>
                  {isLinked ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      <CheckCircle2 size={10} /> Activo
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                      No vinculado
                    </span>
                  )}
                </div>
                {isLinked && data?.thread?.lastMessageAt ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    Último mensaje: {fmtTime(data.thread.lastMessageAt)}
                  </p>
                ) : null}
              </div>
            </div>
            <Link
              href="/settings?section=profile"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
            >
              <Settings size={12} />
              Configurar
            </Link>
          </div>
        </div>

        {/* How to use */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Phone size={14} className="text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">
              Habla con Isaak por WhatsApp
            </span>
          </div>
          <div className="space-y-2 text-sm text-emerald-700">
            {!phone ? (
              <p>
                <Link href="/settings?section=profile" className="font-medium underline">
                  Añade tu teléfono en el perfil
                </Link>{' '}
                para que Isaak te reconozca automáticamente.
              </p>
            ) : (
              <p>
                Tu teléfono <span className="font-mono font-medium">{phone}</span> está registrado.
                Isaak te reconocerá automáticamente.
              </p>
            )}
            <p>
              Envía un mensaje al número{' '}
              <span className="font-mono font-semibold">{ISAAK_WA_NUMBER}</span> y Isaak responderá
              como tu asesor fiscal.
            </p>
          </div>
          <a
            href={ISAAK_WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <MessageCircle size={14} />
            Abrir WhatsApp
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Conversation history */}
        {visibleEvents.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-[#011c67]">Historial reciente</h2>
            <div className="flex flex-col gap-2">
              {[...visibleEvents].reverse().map((e) => {
                const isInbound = e.direction === 'inbound';
                return (
                  <div key={e.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                        isInbound
                          ? 'rounded-tl-sm bg-slate-100 text-slate-700'
                          : 'rounded-tr-sm bg-[#2361d8] text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{e.body}</p>
                      <p
                        className={`mt-1 text-right text-[10px] ${
                          isInbound ? 'text-slate-400' : 'text-white/60'
                        }`}
                      >
                        {fmtTime(e.occurredAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
            <MessageCircle size={28} className="mx-auto mb-2 text-slate-200" />
            <p className="text-sm text-slate-400">Aún no has enviado mensajes por WhatsApp.</p>
            <a
              href={ISAAK_WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline"
            >
              Iniciar conversación <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
