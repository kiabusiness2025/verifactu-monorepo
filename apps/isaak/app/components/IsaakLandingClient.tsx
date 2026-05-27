'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  FileCheck2,
  Mail,
  MessageSquare,
  Radar,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
} from 'lucide-react';
import IsaakPublicChat from './IsaakPublicChat';
import { HOLDed_ONBOARDING_URL } from '../lib/isaak-navigation';

// ── Data ────────────────────────────────────────────────────────────────────

const valueCards = [
  {
    title: 'Entiende lo importante antes',
    body: 'Isaak traduce ventas, gastos, cobros, impuestos y operativa en prioridades claras para hoy.',
    icon: Radar,
  },
  {
    title: 'Trabaja con datos reales',
    body: 'Se apoya en datos de tu negocio, documentos e integraciones para ayudarte de verdad.',
    icon: Workflow,
  },
  {
    title: 'Reduce errores y fricción',
    body: 'Detecta pendientes, revisa borradores, anticipa riesgos y llega con calma a cierres y plazos.',
    icon: FileCheck2,
  },
];

const connectors = [
  {
    id: 'claude',
    name: 'Claude',
    badge: 'MCP · Anthropic',
    description:
      'Conecta tu Holded con Claude.ai y habla con Isaak directamente desde el asistente de Anthropic. Facturas, contactos, proyectos en lenguaje natural.',
    href: 'https://claude.verifactu.business',
    iconBg: 'bg-[#7c3aed]/10',
    iconColor: 'text-[#7c3aed]',
    borderHover: 'hover:border-[#7c3aed]/30',
    icon: Sparkles,
    ctaLabel: 'Conectar Claude',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    badge: 'Plugin · OpenAI',
    description:
      'Usa tus datos de Holded desde ChatGPT. Consulta facturas, contactos, tesorería y proyectos sin salir del chat de OpenAI.',
    href: 'https://holded.verifactu.business',
    iconBg: 'bg-[#16a34a]/10',
    iconColor: 'text-[#16a34a]',
    borderHover: 'hover:border-[#16a34a]/30',
    icon: Bot,
    ctaLabel: 'Conectar ChatGPT',
  },
  {
    id: 'holded',
    name: 'Holded',
    badge: 'Integración nativa',
    description:
      'Conecta tu cuenta de Holded para que Isaak acceda a datos reales y responda con contexto de tu negocio: facturas, cobros, gastos y más.',
    href: HOLDed_ONBOARDING_URL,
    iconBg: 'bg-[#2361d8]/10',
    iconColor: 'text-[#2361d8]',
    borderHover: 'hover:border-[#2361d8]/30',
    icon: Workflow,
    ctaLabel: 'Conectar Holded',
    logo: '/brand/holded/holded-diamond-logo.png',
  },
];

const capabilities = [
  'Explicar con claridad facturas, cobros, gastos y señales de riesgo.',
  'Priorizar qué revisar primero para no perder tiempo en menús y detalles dispersos.',
  'Ayudar a preparar borradores, revisiones y siguientes pasos.',
  'Recordar contexto y conversaciones para responder con continuidad.',
  'Escalar a flujos más profundos cuando necesitas más control.',
];

const mechanics = [
  'Opera con su propia identidad y usa contexto autorizado por usuario y tenant.',
  'Trabaja sobre datos reales del negocio, no solo texto en una ventana de chat.',
  'Puede empezar con ERPs como Holded sin que eso defina toda la marca.',
  'Antes de responder, se apoya en historial, integraciones y señales relevantes.',
  'Cuando una acción cambia datos fuera, pide confirmación explícita.',
];

const signalCards = [
  { label: 'Prioridad operativa', value: 'Cobros, gastos y plazos en un mismo criterio' },
  { label: 'Capa fiscal', value: 'Pensado para Verifactu, trazabilidad y control' },
  { label: 'Compatibilidad', value: 'Holded es una entrada; Isaak mantiene la voz y el criterio' },
];

const faqs = [
  {
    q: '¿Isaak es solo una integración con Holded o un producto completo?',
    a: 'No. Holded puede ser una integración de entrada, pero la propuesta central es Isaak como producto propio con identidad, criterio y experiencia independientes.',
  },
  {
    q: '¿En qué se diferencia Isaak de una IA generalista?',
    a: 'Isaak está pensado para control fiscal, operativa, Verifactu, errores frecuentes y datos reales del negocio. No responde solo por estilo: responde con contexto, prioridad y siguiente paso.',
  },
  {
    q: '¿Puede trabajar con Claude, ChatGPT y otras IAs?',
    a: 'Sí. Isaak expone sus datos a través de conectores MCP para Claude.ai y ChatGPT. También tiene su propio workspace en isaak.app con chat completo.',
  },
  {
    q: '¿Isaak recuerda conversaciones y contexto?',
    a: 'Sí. Isaak mantiene historial de conversaciones por usuario y tenant, con continuidad real entre sesiones.',
  },
];

// ── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  open,
  onClose,
  title,
  wide = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full ${wide ? 'max-w-5xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <span className="text-[15px] font-semibold text-[#011c67]">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Contact modal content ────────────────────────────────────────────────────

function ContactContent() {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-slate-600">
        Puedes contactar con el equipo por email o abrir un ticket de soporte. Respondemos en menos
        de 24 h en días laborables.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href="mailto:soporte@verifactu.business"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-[#2361d8]/40 hover:bg-blue-50 hover:text-[#2361d8]"
        >
          <Mail size={16} className="text-[#2361d8]" />
          soporte@verifactu.business
        </a>
        <Link
          href="/support"
          className="flex items-center gap-3 rounded-xl border border-[#2361d8]/30 bg-[#2361d8]/5 px-4 py-3 text-sm font-semibold text-[#2361d8] transition hover:bg-[#2361d8]/10"
        >
          <MessageSquare size={16} />
          Abrir ticket de soporte
        </Link>
      </div>
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        También puedes encontrarnos en{' '}
        <a
          href="https://verifactu.business"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-2"
        >
          verifactu.business
        </a>
        .
      </div>
    </div>
  );
}

// ── Landing ──────────────────────────────────────────────────────────────────

export default function IsaakLandingClient() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <main className="min-h-screen py-14 text-slate-900">
      {/* Demo modal */}
      <Modal
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        title="Demo de Isaak — acceso abierto"
        wide
      >
        <p className="mb-5 text-sm text-slate-500">
          Habla con Isaak sin registrarte. Aquí verás su tono y criterio. Para datos reales conecta
          tu ERP.
        </p>
        <IsaakPublicChat />
      </Modal>

      {/* Contact modal */}
      <Modal open={contactOpen} onClose={() => setContactOpen(false)} title="Hablar con el equipo">
        <ContactContent />
      </Modal>

      <div className="mx-auto max-w-6xl px-4">
        {/* ── Hero ── */}
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#f8fbff_34%,#ffffff_70%)] shadow-sm">
          <div className="grid gap-8 p-6 lg:grid-cols-[0.92fr_1.08fr] lg:p-10">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center rounded-full bg-[#2361d8]/10 px-4 py-1.5 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/15">
                Isaak
              </div>
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
                Tu asistente fiscal inteligente para trabajar con datos reales.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Isaak no se limita a responder texto. Te ayuda a entender qué pasa en tu negocio, a
                priorizar lo importante y a reducir errores fiscales y operativos usando contexto
                real de tu empresa.
              </p>

              <div className="mt-6 grid gap-3">
                {valueCards.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2361d8]/10 text-[#2361d8]">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#011c67]">{item.title}</div>
                        <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
                >
                  <Sparkles className="h-4 w-4" />
                  Abrir Isaak
                </Link>
                <button
                  type="button"
                  onClick={() => setDemoOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ver demo
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Hablar con el equipo
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-white/70 bg-[linear-gradient(135deg,#081936_0%,#0f2660_45%,#2361d8_100%)] p-6 shadow-[0_35px_90px_-35px_rgba(8,25,54,0.7)]">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/90">
                  <Bot className="h-3.5 w-3.5" />
                  Video de presentación
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Mira cómo habla Isaak de tu negocio desde el primer minuto.
                </h2>
                <div className="mt-5 overflow-hidden rounded-2xl border border-white/15">
                  <video
                    className="h-full w-full"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    controls
                  >
                    <source src="/Personalidad/isaak_banner_hero_v2.mp4" type="video/mp4" />
                    Tu navegador no soporta vídeo HTML5.
                  </video>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#2361d8]">
                    <Bot className="h-3.5 w-3.5" />
                    Cómo trabaja Isaak
                  </div>
                  <div className="mt-4 space-y-3">
                    {signalCards.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {item.label}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.4rem] border border-slate-200 bg-[linear-gradient(160deg,#ffffff_0%,#eef4ff_100%)] p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-[#011c67]">Isaak en acción</div>
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      En vivo
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                        <Image
                          src="/Personalidad/isaak-avatar-verifactu.png"
                          alt="Avatar de Isaak"
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="rounded-2xl bg-[#f5f9ff] px-3 py-2 text-sm text-slate-700">
                          Veo tres prioridades hoy: cobros vencidos, gastos sin clasificar y cierre
                          de impuestos.
                        </div>
                        <div className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
                          ¿Quieres que te deje un plan de acción?
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Asistente activo
                      </span>
                      <BadgeCheck className="h-4 w-4 text-emerald-600" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDemoOpen(true)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2361d8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f55c0]"
                  >
                    Probar ahora
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Connectors ── */}
        <div className="mx-auto mt-12 max-w-5xl">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#011c67] sm:text-3xl">
              Conecta donde ya trabajas
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Isaak está disponible en Claude, ChatGPT y su propio workspace con conectores nativos
              a tu ERP y banca.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {connectors.map((c) => (
              <a
                key={c.id}
                href={c.href}
                target={c.href.startsWith('http') ? '_blank' : undefined}
                rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className={`group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md ${c.borderHover}`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${c.iconBg}`}
                >
                  {c.logo ? (
                    <Image
                      src={c.logo}
                      alt={c.name}
                      width={28}
                      height={28}
                      className="object-contain"
                    />
                  ) : (
                    <c.icon className={`h-5 w-5 ${c.iconColor}`} />
                  )}
                </div>
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-[#011c67]">{c.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.iconBg} ${c.iconColor}`}
                    >
                      {c.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{c.description}</p>
                </div>
                <div
                  className={`mt-4 flex items-center gap-1.5 text-sm font-semibold ${c.iconColor} transition group-hover:gap-2.5`}
                >
                  {c.ctaLabel}
                  <ArrowRight size={14} />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* ── What Isaak does / How it works ── */}
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#011c67]">Qué puede hacer por ti</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              {capabilities.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#011c67]">Cómo funciona</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              {mechanics.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2361d8]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        {/* ── Comparison table ── */}
        <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#011c67]">
            Isaak frente a una IA generalista
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Criterio</th>
                  <th className="py-2 pr-3">Isaak</th>
                  <th className="py-2">IA general</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                <tr>
                  <td className="rounded-l-xl bg-slate-50 px-3 py-2">Contexto de negocio</td>
                  <td className="bg-emerald-50 px-3 py-2">Sí, con tenant, memoria y permisos</td>
                  <td className="rounded-r-xl bg-slate-50 px-3 py-2">No por defecto</td>
                </tr>
                <tr>
                  <td className="rounded-l-xl bg-slate-50 px-3 py-2">Foco fiscal y operativo</td>
                  <td className="bg-emerald-50 px-3 py-2">Especializado</td>
                  <td className="rounded-r-xl bg-slate-50 px-3 py-2">Genérico</td>
                </tr>
                <tr>
                  <td className="rounded-l-xl bg-slate-50 px-3 py-2">Siguiente paso útil</td>
                  <td className="bg-emerald-50 px-3 py-2">Sí, orientado a acción</td>
                  <td className="rounded-r-xl bg-slate-50 px-3 py-2">Depende del prompt</td>
                </tr>
                <tr>
                  <td className="rounded-l-xl bg-slate-50 px-3 py-2">Claude, ChatGPT, propio</td>
                  <td className="bg-emerald-50 px-3 py-2">Sí, disponible en los tres</td>
                  <td className="rounded-r-xl bg-slate-50 px-3 py-2">Solo en su canal</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Privacy note ── */}
        <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#011c67]">Privacidad y control</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Isaak trabaja con controles por usuario y tenant. La memoria, el historial y los
            documentos responden a una idea clara: ayudarte mejor sin perder control ni
            trazabilidad. Para detalles legales completos, revisa la{' '}
            <Link
              href="/privacy"
              className="font-semibold text-[#2361d8] underline underline-offset-2"
            >
              política de privacidad
            </Link>
            .
          </p>
        </div>

        {/* ── ERP capabilities ── */}
        <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-[#2361d8]/20 bg-[#2361d8]/5 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#011c67]">
            Capacidades reales hoy con tu ERP conectado
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Estas son capacidades ya disponibles en producción cuando conectas tu ERP.
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>Lectura de facturas, contactos, cuentas, proyectos y tareas con contexto.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>Priorización operativa en lenguaje claro para decidir qué hacer primero.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>Acciones sensibles solo con confirmación explícita del usuario.</span>
            </li>
          </ul>
          <div className="mt-5">
            <a
              href={HOLDed_ONBOARDING_URL}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f55c0]"
            >
              Conectar Holded desde Isaak
              <ArrowRight size={14} />
            </a>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="mx-auto mt-10 max-w-5xl">
          <h2 className="text-2xl font-semibold tracking-tight text-[#011c67]">
            Preguntas frecuentes
          </h2>
          <div className="mt-5 space-y-3">
            {faqs.map((item) => (
              <article
                key={item.q}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="text-base font-semibold text-slate-800">{item.q}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.a}</p>
              </article>
            ))}
          </div>
        </div>

        {/* ── Final CTA ── */}
        <div className="mx-auto mt-10 flex max-w-4xl flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:flex-row sm:flex-wrap sm:justify-center">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
          >
            <Sparkles className="h-4 w-4" />
            Abrir Isaak
          </Link>
          <button
            type="button"
            onClick={() => setDemoOpen(true)}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ver demo
          </button>
          <a
            href={HOLDed_ONBOARDING_URL}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Conectar Holded
          </a>
          <button
            type="button"
            onClick={() => setContactOpen(true)}
            className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] transition hover:bg-[#2361d8]/10"
          >
            Hablar con el equipo
          </button>
        </div>

        {/* ── Co-authorship ── */}
        <p className="mx-auto mt-8 max-w-5xl text-center text-[11px] text-slate-400">
          Isaak es un producto de{' '}
          <a
            href="https://verifactu.business"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            verifactu.business
          </a>
          . Diseñado y desarrollado con la colaboración de{' '}
          <span className="font-medium">Claude Sonnet 4.6 (Anthropic)</span>.
        </p>
      </div>
    </main>
  );
}
