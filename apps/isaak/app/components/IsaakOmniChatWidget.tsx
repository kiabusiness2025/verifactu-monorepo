'use client';

// V1 LAUNCH (2026-05-28) — Widget flotante "Omni-chat" para la landing
// pública (verifactu.business + isaak.verifactu.business).
//
// 1 botón flotante azul (esquina inferior derecha) que abre un panel con
// 3 opciones para hablar con Isaak:
//   1. Chat aquí mismo  → /signup (lleva al chat propio)
//   2. WhatsApp         → wa.me/15559835009
//   3. Telegram         → t.me/IsaakFiscalBot
//
// Reemplaza al `WhatsAppButton` antiguo (solo WhatsApp) y al
// `IsaakPublicSupportWidget` (chat embebido que competía visualmente).
//
// Se esconde automáticamente en rutas del workspace logueado — allí el
// usuario ya tiene Isaak nativo en el sidebar.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowRight,
  MessageCircle,
  MessageSquare,
  Send,
  X,
} from 'lucide-react';

// Rutas internas del workspace (post-login). En estas el widget NO se muestra.
const WORKSPACE_PREFIXES = [
  '/chat',
  '/resumen',
  '/alertas',
  '/ventas',
  '/gastos',
  '/banking',
  '/informes',
  '/fiscal',
  '/auditoria',
  '/inspector',
  '/sede',
  '/perfil-fiscal',
  '/mail',
  '/calendario',
  '/whatsapp',
  '/microsoft',
  '/contactos',
  '/equipo',
  '/advisor',
  '/sede-corpus',
  '/integrations',
  '/integration-holded',
  '/ayuda',
  '/settings',
];

// Destinos públicos. Cambiables vía env si en algún momento rotamos número
// o handle del bot.
const WHATSAPP_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_URL ?? 'https://wa.me/15559835009';
const TELEGRAM_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_URL ?? 'https://t.me/IsaakFiscalBot';
const CHAT_URL = '/signup';

type Channel = {
  id: 'chat' | 'whatsapp' | 'telegram';
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  href: string;
  external: boolean;
  badge?: string;
};

const CHANNELS: Channel[] = [
  {
    id: 'chat',
    icon: MessageSquare,
    iconBg: 'bg-[#2361d8]',
    iconColor: 'text-white',
    title: 'Chat con Isaak',
    subtitle: 'En esta misma web · respuesta instantánea',
    href: CHAT_URL,
    external: false,
    badge: 'Más rápido',
  },
  {
    id: 'whatsapp',
    icon: MessageCircle,
    iconBg: 'bg-[#25D366]',
    iconColor: 'text-white',
    title: 'WhatsApp',
    subtitle: 'Isaak responde 24/7 en tu chat',
    href: WHATSAPP_URL,
    external: true,
  },
  {
    id: 'telegram',
    icon: Send,
    iconBg: 'bg-[#229ED9]',
    iconColor: 'text-white',
    title: 'Telegram',
    subtitle: '@IsaakFiscalBot · /start para empezar',
    href: TELEGRAM_URL,
    external: true,
  },
];

export default function IsaakOmniChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Esconder dentro del workspace logueado.
  const hidden =
    !pathname || WORKSPACE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));

  // Cerrar al click fuera del panel.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Cerrar con Escape.
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  if (hidden) return null;

  return (
    <>
      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Hablar con Isaak"
          className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-[360px] origin-bottom-right animate-in fade-in zoom-in-95 slide-in-from-bottom-4 rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)]"
          style={{ animationDuration: '180ms' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 rounded-t-2xl bg-gradient-to-br from-[#2361d8] to-[#011c67] px-5 py-4 text-white">
            <div>
              <h3 className="text-base font-semibold">Habla con Isaak</h3>
              <p className="mt-0.5 text-[12px] text-white/85">
                Tu asistente fiscal. Elige cómo prefieres.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Channel options */}
          <div className="p-3">
            <ul className="space-y-1.5">
              {CHANNELS.map((c) => {
                const Icon = c.icon;
                const inner = (
                  <>
                    <span
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm ${c.iconBg}`}
                    >
                      <Icon className={`h-5 w-5 ${c.iconColor}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#011c67]">{c.title}</span>
                        {c.badge && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                            {c.badge}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                        {c.subtitle}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                  </>
                );

                const className =
                  'group flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 transition hover:border-slate-200 hover:bg-slate-50';

                return (
                  <li key={c.id}>
                    {c.external ? (
                      <a
                        href={c.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={className}
                        onClick={() => setOpen(false)}
                      >
                        {inner}
                      </a>
                    ) : (
                      <Link href={c.href} className={className} onClick={() => setOpen(false)}>
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Footer */}
          <div className="rounded-b-2xl border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 text-center">
            <p className="text-[11px] text-slate-500">
              Es gratis · Sin tarjeta · IA incluida
            </p>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar' : 'Habla con Isaak'}
        aria-expanded={open}
        className={`fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 ${
          open
            ? 'rotate-90 bg-slate-800 shadow-md'
            : 'bg-[#2361d8] shadow-[0_4px_24px_rgba(35,97,216,0.45)] hover:scale-105 hover:bg-[#1d55c2] hover:shadow-[0_6px_30px_rgba(35,97,216,0.55)] active:scale-95'
        }`}
      >
        {open ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6 text-white" />
            {/* Indicador "estamos online" */}
            <span className="absolute right-1 top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
            </span>
          </>
        )}
      </button>
    </>
  );
}
