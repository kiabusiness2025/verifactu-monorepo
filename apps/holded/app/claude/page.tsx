'use client';

import {
  BookOpen,
  Building2,
  FolderKanban,
  MessageCircleMore,
  PlugZap,
  Send,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const quickActions = [
  'Facturas pendientes',
  'Últimos contactos',
  'Top productos',
  'Estado proyectos',
  'Análisis financiero',
];

const navSections = [
  {
    label: 'ASISTENTE',
    items: [{ icon: MessageCircleMore, label: 'Chat con Claude', active: true }],
  },
  {
    label: 'HOLDED',
    items: [
      { icon: BookOpen, label: 'Facturas', active: false },
      { icon: Users, label: 'Contactos', active: false },
      { icon: Building2, label: 'Productos', active: false },
      { icon: FolderKanban, label: 'Proyectos', active: false },
    ],
  },
];

export default function ClaudePage() {
  const [apiKey, setApiKey] = useState('');
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lógica de conexión adaptada
  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/holded/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, channel: 'claude' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Error de conexión');

      // Si requiere onboarding, redirige automáticamente
      if (data?.nextStep === 'onboarding_required') {
        // Redirige a onboarding conversacional, pasando el destino final
        const next = encodeURIComponent('/claude');
        window.location.assign(`/onboarding/profile?next=${next}`);
        return;
      }

      setConnected(true);
    } catch (e: any) {
      setError(e?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* ── Header ── */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1D9E75] text-sm font-bold text-white shadow-sm">
            H
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none">Holded + Claude</p>
            <p className="mt-0.5 text-[11px] text-slate-500 leading-none">
              Asistente inteligente para tu negocio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {connected ? (
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Holded conectado
            </div>
          ) : (
            <>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API Key de Holded..."
                className="w-56 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#1D9E75] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20"
                disabled={loading}
              />
              <button
                onClick={handleConnect}
                disabled={apiKey.length < 8 || loading}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1D9E75] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0F7A5C] disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PlugZap className="h-3.5 w-3.5" />
                )}
                {loading ? 'Conectando...' : 'Conectar'}
              </button>
            </>
          )}
          {error && <span className="ml-3 text-xs text-rose-600">{error}</span>}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="flex w-52 shrink-0 flex-col border-r border-slate-200 bg-white">
          {navSections.map((section) => (
            <div key={section.label} className="px-3 pt-5">
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                {section.label}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                      item.active
                        ? 'bg-[#1D9E75]/10 text-[#1D9E75]'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}

          <div className="mt-auto border-t border-slate-100 px-4 py-4">
            <p className="text-[10px] leading-4 text-slate-400">
              Fase I — Solo lectura + borradores de factura.
            </p>
            <Link
              href="/acceso"
              className="mt-2 inline-block text-[10px] font-medium text-[#1D9E75] underline-offset-2 hover:underline"
            >
              Ver plan completo →
            </Link>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Title bar */}
          <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
            <h1 className="text-sm font-bold text-slate-900">Asistente IA con acceso a Holded</h1>
          </div>

          {/* Quick actions */}
          <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-3">
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => setInput(action)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-[#1D9E75]/40 hover:bg-[#1D9E75]/5 hover:text-[#1D9E75]"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* Welcome message */}
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D9E75] text-[10px] font-bold text-white">
                IA
              </div>
              <div className="max-w-2xl rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm leading-6 text-slate-700">
                  Hola, soy tu asistente de Holded. Conéctate con tu API key para que pueda acceder
                  a tus datos de facturación, contactos, productos y proyectos en tiempo real.
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  Puedes preguntarme cosas como{' '}
                  <strong className="text-slate-900">«¿Cuánto he facturado este mes?»</strong> o
                  pedirme que <strong className="text-slate-900">cree una factura</strong>{' '}
                  directamente desde el chat.
                </p>
              </div>
            </div>

            {!connected && (
              <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1D9E75]/10">
                  <Sparkles className="h-5 w-5 text-[#1D9E75]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Conecta tu cuenta de Holded
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Introduce tu API key arriba para empezar a chatear con tus datos.
                  </p>
                </div>
                <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Facturación
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Contactos
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    Contabilidad
                  </span>
                  <span className="flex items-center gap-1">
                    <FolderKanban className="h-3 w-3" />
                    Proyectos
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
            <form
              className="flex items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                setInput('');
              }}
            >
              <div className="relative flex-1">
                <textarea
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pregunta sobre tus datos de Holded o pide que prepare algo…"
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1D9E75] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      setInput('');
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || !connected}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D9E75] text-white transition hover:bg-[#0F7A5C] disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              No modifica tu cuenta de Holded. Los borradores de factura requieren tu confirmación
              explícita.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
