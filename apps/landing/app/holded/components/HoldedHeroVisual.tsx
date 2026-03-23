'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

const featureBadges = [
  {
    label: 'Revision fiscal continua',
    className: 'left-0 top-10 sm:-left-6',
  },
  {
    label: 'Riesgos detectados a tiempo',
    className: 'right-0 top-24 sm:-right-8',
  },
  {
    label: 'Indicadores en tiempo real',
    className: 'left-4 bottom-24 sm:-left-4',
  },
  {
    label: 'Prioridades accionables',
    className: 'right-2 bottom-10 sm:-right-6',
  },
  {
    label: 'Contexto listo para decidir',
    className: 'left-1/2 top-0 -translate-x-1/2',
  },
];

export default function HoldedHeroVisual() {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_28px_80px_-40px_rgba(255,84,96,0.35)] sm:p-6">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(145deg,#fff7f7_0%,#f8fbff_100%)] px-4 pb-2 pt-10 sm:px-6">
        <div className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
          <Image
            src="/brand/holded/holded-diamond-logo.png"
            alt="Holded"
            width={10}
            height={10}
            className="h-2.5 w-2.5"
          />
          Holded compatible
        </div>

        <div className="relative mx-auto max-w-[20rem] pt-3 sm:max-w-[22rem]">
          <Image
            src="/Isaak/isaak-medio-cuerpo.png"
            alt="Isaak guiando la integracion con Holded"
            width={620}
            height={740}
            className="h-auto w-full"
            priority
          />

          {featureBadges.map((badge, index) => (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.2 + index * 0.22 }}
              className={`absolute ${badge.className}`}
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3.2, delay: 0.4 + index * 0.18, repeat: Infinity }}
                className="rounded-full border border-slate-300 bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm"
              >
                {badge.label}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
