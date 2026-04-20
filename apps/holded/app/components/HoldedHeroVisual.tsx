'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: React.ReactNode;
};

const conversations: Message[][] = [
  [
    { role: 'user', content: '¿Qué facturas debería revisar hoy?' },
    {
      role: 'assistant',
      content: (
        <div className="space-y-2 text-xs">
          <p className="text-slate-700">
            Tienes <span className="font-semibold text-slate-900">3 facturas vencidas</span> con
            riesgo de impago:
          </p>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-500">
                  <th className="px-2.5 py-1.5 font-medium">Cliente</th>
                  <th className="px-2.5 py-1.5 font-medium">Importe</th>
                  <th className="px-2.5 py-1.5 font-medium">Vencida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="px-2.5 py-1.5">Muebles Durán S.L.</td>
                  <td className="px-2.5 py-1.5 font-semibold">3.480 €</td>
                  <td className="px-2.5 py-1.5 text-red-600">31 días</td>
                </tr>
                <tr>
                  <td className="px-2.5 py-1.5">Acme Consulting</td>
                  <td className="px-2.5 py-1.5 font-semibold">1.210 €</td>
                  <td className="px-2.5 py-1.5 text-amber-600">14 días</td>
                </tr>
                <tr>
                  <td className="px-2.5 py-1.5">López &amp; Asociados</td>
                  <td className="px-2.5 py-1.5 font-semibold">870 €</td>
                  <td className="px-2.5 py-1.5 text-amber-600">7 días</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-500">
            Recomiendo empezar por <span className="font-medium text-slate-700">Muebles Durán</span>{' '}
            — mayor importe y más días de retraso.
          </p>
        </div>
      ),
    },
  ],
  [
    { role: 'user', content: '¿Cuánto IVA tengo pendiente este trimestre?' },
    {
      role: 'assistant',
      content: (
        <div className="space-y-2 text-xs">
          <p className="text-slate-700">
            Resumen de IVA{' '}
            <span className="font-semibold text-slate-900">T2 — abril a junio 2025</span>:
          </p>
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            <div className="flex justify-between px-3 py-1.5 text-slate-700">
              <span>IVA repercutido (ventas)</span>
              <span className="font-semibold">4.823 €</span>
            </div>
            <div className="flex justify-between px-3 py-1.5 text-slate-700">
              <span>IVA soportado (gastos)</span>
              <span className="font-semibold text-green-700">− 1.247 €</span>
            </div>
            <div className="flex justify-between px-3 py-2 bg-slate-50 font-semibold text-slate-900">
              <span>Cuota neta a ingresar</span>
              <span>3.576 €</span>
            </div>
          </div>
          <p className="text-slate-500">
            Fecha límite para el modelo 303:{' '}
            <span className="font-medium text-slate-700">20 de julio</span>.
          </p>
        </div>
      ),
    },
  ],
  [
    { role: 'user', content: 'Prepara un borrador de factura para Acme Consulting' },
    {
      role: 'assistant',
      content: (
        <div className="space-y-2 text-xs">
          <p className="text-slate-700">He preparado el borrador. Revísalo antes de confirmar:</p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span className="text-slate-500">Cliente</span>
              <span className="font-medium text-slate-800">Acme Consulting S.L.</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="text-slate-500">Concepto</span>
              <span className="font-medium text-slate-800">Servicios abril 2025</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="text-slate-500">Base imponible</span>
              <span className="font-medium text-slate-800">1.000 €</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="text-slate-500">IVA (21%)</span>
              <span className="font-medium text-slate-800">210 €</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
              <span>Total</span>
              <span>1.210 €</span>
            </div>
          </div>
          <p className="rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-amber-700">
            ⚠ Solo se guardará cuando confirmes. Aún no se ha enviado nada.
          </p>
        </div>
      ),
    },
  ],
];

const TYPING_DELAY = 900;
const READ_DELAY = 3800;
const FADE_DURATION = 0.35;

export default function HoldedHeroVisual() {
  const [convIndex, setConvIndex] = useState(0);
  const [phase, setPhase] = useState<'user' | 'typing' | 'assistant'>('user');

  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;

    if (phase === 'user') {
      id = setTimeout(() => setPhase('typing'), 1200);
    } else if (phase === 'typing') {
      id = setTimeout(() => setPhase('assistant'), TYPING_DELAY);
    } else {
      id = setTimeout(() => {
        setPhase('user');
        setConvIndex((i) => (i + 1) % conversations.length);
      }, READ_DELAY);
    }

    return () => clearTimeout(id);
  }, [phase, convIndex]);

  const conv = conversations[convIndex];

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_28px_80px_-40px_rgba(255,84,96,0.35)] sm:p-5">
      {/* Window chrome */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
          </div>
          <span className="ml-1 text-[11px] font-semibold text-slate-400">ChatGPT</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
          <Image
            src="/brand/holded/holded-diamond-logo.png"
            alt="Holded"
            width={10}
            height={10}
            className="h-2.5 w-2.5"
          />
          Conector Holded activo
        </div>
      </div>

      {/* Chat area */}
      <div className="min-h-[270px] space-y-3 rounded-2xl bg-[#f8fafc] p-4 sm:min-h-[290px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`conv-${convIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_DURATION }}
            className="space-y-3"
          >
            {/* User bubble */}
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[#ff5460] px-3.5 py-2 text-xs font-medium text-white shadow-sm">
                {conv[0].content as string}
              </div>
            </div>

            {/* Typing or assistant response */}
            <AnimatePresence mode="wait">
              {phase === 'typing' && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-2.5"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ff5460]/10">
                    <Image
                      src="/brand/holded/holded-diamond-logo.png"
                      alt=""
                      width={12}
                      height={12}
                      className="h-3 w-3"
                    />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 shadow-sm">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-slate-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {phase === 'assistant' && (
                <motion.div
                  key="assistant"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-2.5"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ff5460]/10">
                    <Image
                      src="/brand/holded/holded-diamond-logo.png"
                      alt=""
                      width={12}
                      height={12}
                      className="h-3 w-3"
                    />
                  </div>
                  <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-3 shadow-sm">
                    {conv[1].content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Conversation dots */}
      <div className="mt-3 flex justify-center gap-1.5">
        {conversations.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === convIndex ? 'w-4 bg-[#ff5460]' : 'w-1.5 bg-slate-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
