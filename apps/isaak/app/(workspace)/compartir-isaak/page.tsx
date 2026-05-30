'use client';

// V1.7.1 — Generador de QR + link para compartir Isaak con prospects.
//
// El usuario (típicamente un asesor o un onboarder) genera un URL
// personalizado con su nombre/empresa y un QR descargable que puede
// pegar en WhatsApp, web, tarjetas, etc.
//
// El URL apunta a isaak.chat con un parámetro ?ref=<slug> que la
// landing puede usar para tracking (UsageEvent con event_type
// 'demo_referral_view' — pendiente de V1.7.x).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  Link2,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
  UserCircle2,
} from 'lucide-react';

const ISAAK_PUBLIC = 'https://isaak.chat';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export default function CompartirIsaakPage() {
  const [refName, setRefName] = useState('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const refSlug = useMemo(() => slugify(refName), [refName]);
  const url = refSlug ? `${ISAAK_PUBLIC}?ref=${refSlug}` : ISAAK_PUBLIC;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, url, {
      width: 320,
      margin: 1,
      color: { dark: '#011c67', light: '#ffffff' },
    }).catch(() => {
      /* fail-silent */
    });
  }, [url]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }, [url]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const filename = `isaak-qr${refSlug ? `-${refSlug}` : ''}.png`;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(u);
    });
  }, [refSlug]);

  const handleShareNative = useCallback(async () => {
    if (!navigator.share) {
      void handleCopy();
      return;
    }
    try {
      await navigator.share({
        title: 'Isaak — asistente fiscal con IA',
        text: 'Te recomiendo Isaak para tu gestión fiscal con Holded. Sin licencias IA, en español.',
        url,
      });
    } catch {
      /* user cancelled */
    }
  }, [url, handleCopy]);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2361d8] text-white">
          <Share2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Compartir Isaak</h1>
          <p className="text-sm text-slate-500">
            Personaliza un enlace con tu nombre y obtén un QR descargable para clientes,
            redes o tarjetas.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto]">
        {/* Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-xs font-semibold text-slate-700">
            Tu nombre o el de tu empresa (opcional)
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-[#2361d8]">
            <UserCircle2 className="h-4 w-4 flex-shrink-0 text-slate-400" />
            <input
              value={refName}
              onChange={(e) => setRefName(e.target.value)}
              placeholder="Gestoría Núñez, Maria Pérez, etc."
              maxLength={60}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          {refSlug && (
            <p className="mt-2 text-[11px] text-slate-500">
              Tu referencia será:{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                {refSlug}
              </code>
            </p>
          )}

          <div className="mt-5">
            <span className="text-xs font-semibold text-slate-700">URL para compartir</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Link2 className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700">
                {url}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded-lg bg-[#2361d8] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#1f55c0]"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick-share buttons */}
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Te recomiendo Isaak para tu gestión fiscal con Holded: ${url}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1da851]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent('Te recomiendo Isaak')}&body=${encodeURIComponent(
                `Hola,\n\nTe recomiendo Isaak para tu gestión fiscal con Holded. Es un asistente IA en español, sin licencias extra, que te ayuda con IVA, modelos AEAT y conexión directa a tu Holded.\n\nMira aquí: ${url}\n`,
              )}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <Send className="h-3.5 w-3.5" />
              Email
            </a>
            <button
              type="button"
              onClick={handleShareNative}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Share2 className="h-3.5 w-3.5" />
              Compartir
            </button>
          </div>
        </div>

        {/* QR */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tu QR
          </span>
          <div className="mt-3 flex justify-center">
            <canvas
              ref={canvasRef}
              className="rounded-lg border border-slate-200 bg-white"
              width={320}
              height={320}
            />
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#011c67] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2361d8]"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar PNG
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
          <Sparkles className="h-4 w-4 text-[#2361d8]" />
          ¿Cómo lo uso?
        </h2>
        <ul className="mt-2 space-y-1.5 text-xs leading-6 text-slate-600">
          <li>· Pega el QR en tu firma de email, tarjeta de visita o pie de tu web.</li>
          <li>
            · Envía el link por WhatsApp a clientes que aún no usan Isaak — verán la landing
            con pricing, FAQ y demo.
          </li>
          <li>
            · Si pones tu nombre de empresa, el parámetro <code>?ref=</code> queda en la URL
            para que sepamos quién te envió a Isaak (útil para futuras campañas de partner).
          </li>
          <li>
            · El QR es PNG de 320×320 — escala bien hasta tamaño postal. Para imprenta a A4,
            usa la URL para regenerarlo con resolución mayor en otra herramienta.
          </li>
        </ul>
      </div>
    </div>
  );
}
