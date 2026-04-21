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
    { role: 'user', content: 'Que facturas deberia revisar hoy?' },
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
                  <td className="px-2.5 py-1.5">Muebles Duran S.L.</td>
                  <td className="px-2.5 py-1.5 font-semibold">3.480 EUR</td>
                  <td className="px-2.5 py-1.5 text-red-600">31 dias</td>
                </tr>
                <tr>
                  <td className="px-2.5 py-1.5">Acme Consulting</td>
                  <td className="px-2.5 py-1.5 font-semibold">1.210 EUR</td>
                  <td className="px-2.5 py-1.5 text-amber-600">14 dias</td>
                </tr>
                <tr>
                  <td className="px-2.5 py-1.5">Lopez y Asociados</td>
                  <td className="px-2.5 py-1.5 font-semibold">870 EUR</td>
                  <td className="px-2.5 py-1.5 text-amber-600">7 dias</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-500">
            Empezaria por <span className="font-medium text-slate-700">Muebles Duran</span> por
            importe y retraso acumulado.
          </p>
        </div>
      ),
    },
  ],
  [
    { role: 'user', content: 'Cuanto IVA tengo pendiente este trimestre?' },
    {
      role: 'assistant',
      content: (
        <div className="space-y-2 text-xs">
          <p className="text-slate-700">
            Resumen de IVA <span className="font-semibold text-slate-900">T2</span>:
          </p>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="flex justify-between px-3 py-1.5 text-slate-700">
              <span>IVA repercutido</span>
              <span className="font-semibold">4.823 EUR</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 px-3 py-1.5 text-slate-700">
              <span>IVA soportado</span>
              <span className="font-semibold text-green-700">- 1.247 EUR</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 bg-slate-50 px-3 py-2 font-semibold text-slate-900">
              <span>Cuota neta</span>
              <span>3.576 EUR</span>
            </div>
          </div>
          <p className="text-slate-500">
            Si quieres, te lo desgloso por ventas, gastos y cuentas implicadas.
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
          <p className="text-slate-700">He preparado el borrador. Revisa antes de confirmar:</p>
          <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex justify-between text-slate-600">
              <span className="text-slate-500">Cliente</span>
              <span className="font-medium text-slate-800">Acme Consulting S.L.</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="text-slate-500">Concepto</span>
              <span className="font-medium text-slate-800">Servicios abril</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="text-slate-500">Base imponible</span>
              <span className="font-medium text-slate-800">1.000 EUR</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="text-slate-500">IVA (21%)</span>
              <span className="font-medium text-slate-800">210 EUR</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
              <span>Total</span>
              <span>1.210 EUR</span>
            </div>
          </div>
          <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-700">
            Solo se guardara cuando confirmes. Todavia no se ha enviado nada.
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
  const [conversationIndex, setConversationIndex] = useState(0);
  const [phase, setPhase] = useState<'user' | 'typing' | 'assistant'>('user');

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (phase === 'user') {
      timeoutId = setTimeout(() => setPhase('typing'), 1200);
    } else if (phase === 'typing') {
      timeoutId = setTimeout(() => setPhase('assistant'), TYPING_DELAY);
    } else {
      timeoutId = setTimeout(() => {
        setPhase('user');
        setConversationIndex((index) => (index + 1) % conversations.length);
      }, READ_DELAY);
    }

    return () => clearTimeout(timeoutId);
  }, [phase, conversationIndex]);

  const conversation = conversations[conversationIndex];

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_28px_80px_-40px_rgba(255,84,96,0.35)] sm:p-5">
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

      <div className="rounded-2xl border border-slate-100 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {['Facturas', 'Contabilidad', 'CRM', 'Proyectos'].map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600"
            >
              {badge}
            </span>
          ))}
        </div>

        <div className="min-h-[270px] space-y-3 rounded-2xl bg-[#f8fafc] p-4 sm:min-h-[290px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={`conversation-${conversationIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: FADE_DURATION }}
              className="space-y-3"
            >
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[#ff5460] px-3.5 py-2 text-xs font-medium text-white shadow-sm">
                  {conversation[0].content as string}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {phase === 'typing' ? (
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
                      {[0, 1, 2].map((index) => (
                        <motion.span
                          key={index}
                          className="h-1.5 w-1.5 rounded-full bg-slate-400"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, delay: index * 0.2, repeat: Infinity }}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : null}

                {phase === 'assistant' ? (
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
                      {conversation[1].content}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-1.5">
        {conversations.map((_, index) => (
          <span
            key={index}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === conversationIndex ? 'w-4 bg-[#ff5460]' : 'w-1.5 bg-slate-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
