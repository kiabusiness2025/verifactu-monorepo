'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, MessageCircle, UserRoundCog } from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

type IsaakTone = 'friendly' | 'professional' | 'minimal';

const TONE_KEY = 'vf_isaak_personality_v1';
const TONE_SEEN_KEY = 'vf_isaak_personality_seen_v1';

const toneLabels: Record<IsaakTone, { label: string; promptStyle: string }> = {
  friendly: {
    label: 'Amigable',
    promptStyle: 'Tono cercano, didáctico y motivador.',
  },
  professional: {
    label: 'Profesional',
    promptStyle: 'Tono formal y claro, orientado a negocio.',
  },
  minimal: {
    label: 'Directo',
    promptStyle: 'Tono breve y directo, sin relleno.',
  },
};

const sectionSuggestions: Record<string, string[]> = {
  home: ['¿Cuál plan me conviene según mi volumen?', '¿Qué necesito para empezar hoy?', 'Explícame Verifactu en simple'],
  verifactu: ['¿Cómo me ayudas con VeriFactu?', 'Checklist mínimo para cumplir', 'Riesgos comunes al implantar'],
  producto: ['¿Qué automatiza realmente?', '¿Qué integración activar primero?', '¿Cómo reducir errores de facturación?'],
  recursos: ['Dame una guía para arrancar', 'Resumen de buenas prácticas', 'Qué revisar cada semana'],
  precios: ['Compárame planes en 1 minuto', 'Cuándo subir de plan', 'Cómo estimar coste mensual'],
};

function getLandingSection(pathname: string) {
  if (pathname.includes('/verifactu')) return 'verifactu';
  if (pathname.includes('/producto')) return 'producto';
  if (pathname.includes('/recursos')) return 'recursos';
  if (pathname.includes('/politica-de-precios') || pathname.includes('/planes')) return 'precios';
  return 'home';
}

export default function IsaakChat() {
  const pathname = usePathname() ?? '/';
  const section = getLandingSection(pathname);
  const proactiveSuggestions = sectionSuggestions[section] ?? sectionSuggestions.home;
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [tone, setTone] = useState<IsaakTone>('friendly');
  const [showTonePicker, setShowTonePicker] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Antes de empezar: quiero que sepas algo importante.\nTu contabilidad es siempre tuya.\nAunque cambies de plan, nunca perderás acceso a tus datos.\nYo me encargo de cuidarlos.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const storedTone = localStorage.getItem(TONE_KEY) as IsaakTone | null;
    if (storedTone === 'friendly' || storedTone === 'professional' || storedTone === 'minimal') {
      setTone(storedTone);
    }
    const hasSeenPicker = localStorage.getItem(TONE_SEEN_KEY) === '1';
    if (!hasSeenPicker) {
      setShowTonePicker(true);
      setIsOpen(true);
    }
  }, [mounted]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!mounted) {
    return null;
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call the chat API
      const response = await fetch('/api/vertex-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${input}\n\n[Contexto: sección=${section}; personalidad=${toneLabels[tone].label}. ${toneLabels[tone].promptStyle}]`,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Lo siento, no pude procesar tu pregunta. Intenta de nuevo.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Disculpa, tengo un problema temporal. Intenta de nuevo en unos segundos.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-24 right-6 z-20 hidden max-w-[280px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:block">
          <div className="text-xs font-semibold text-[#2361d8]">Sugerencia de Isaak</div>
          <p className="mt-1 text-xs text-slate-600">{proactiveSuggestions[0]}</p>
        </div>
      )}

      {/* Chat Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#2361d8] text-white shadow-lg transition hover:shadow-xl"
        aria-label="Abrir chat con Isaak"
      >
        <MessageCircle className="h-6 w-6" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-40 flex h-96 w-80 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-96"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#2361d8] px-4 py-3 text-white">
              <div>
                <div className="font-semibold">Isaak</div>
                <div className="text-xs opacity-90">Aquí para ayudarte · {toneLabels[tone].label}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowTonePicker((prev) => !prev)}
                  className="rounded-lg p-1 transition hover:bg-white/20"
                  aria-label="Cambiar personalidad"
                  title="Cambiar personalidad"
                >
                  <UserRoundCog className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 transition hover:bg-white/20"
                  aria-label="Cerrar chat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {showTonePicker && (
              <div className="border-b border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 text-xs font-semibold text-slate-700">Elige la personalidad de Isaak</div>
                <div className="grid grid-cols-1 gap-2">
                  {(['friendly', 'professional', 'minimal'] as IsaakTone[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setTone(option);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem(TONE_KEY, option);
                          localStorage.setItem(TONE_SEEN_KEY, '1');
                        }
                        setShowTonePicker(false);
                      }}
                      className={[
                        'rounded-lg border px-3 py-2 text-left text-xs transition',
                        tone === option
                          ? 'border-[#2361d8] bg-blue-50 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <div className="font-medium text-slate-900">{toneLabels[option].label}</div>
                      <div>{toneLabels[option].promptStyle}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-b border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-xs font-semibold text-slate-700">Preguntas recomendadas</div>
              <div className="flex flex-wrap gap-2">
                {proactiveSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={[
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'max-w-xs rounded-lg px-4 py-2 text-sm',
                      message.role === 'user'
                        ? 'bg-[#2361d8] text-white'
                        : 'bg-slate-100 text-slate-900',
                    ].join(' ')}
                  >
                    {message.content}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-1 rounded-lg bg-slate-100 px-4 py-2">
                    <div className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
                    <div
                      className="h-2 w-2 rounded-full bg-slate-400 animate-pulse"
                      style={{ animationDelay: '0.2s' }}
                    />
                    <div
                      className="h-2 w-2 rounded-full bg-slate-400 animate-pulse"
                      style={{ animationDelay: '0.4s' }}
                    />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSendMessage}
              className="border-t border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  placeholder="Pregunta algo..."
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2361d8] text-white transition hover:bg-[#1f55c0] disabled:bg-slate-300"
                  aria-label="Enviar mensaje"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
