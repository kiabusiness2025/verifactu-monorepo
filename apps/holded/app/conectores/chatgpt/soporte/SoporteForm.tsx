'use client';

import { useCallback, useRef, useState } from 'react';

const SUPPORT_URL = '/api/isaak/support';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function SoporteForm({ isRegistered }: { isRegistered: boolean }) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const removeFile = useCallback((name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }, []);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const next = Array.from(list).slice(0, 3 - files.length);
      setFiles((prev) => [...prev, ...next].slice(0, 3));
    },
    [files.length]
  );

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) return;
    setStatus('sending');
    setErrorMsg('');

    try {
      // Build attachments as base64
      const imageAttachments: { mimeType: string; data: string }[] = [];
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const buf = await file.arrayBuffer();
          const b64 = Buffer.from(buf).toString('base64');
          imageAttachments.push({ mimeType: file.type, data: b64 });
        }
      }

      const body = {
        message: `[Formulario de soporte - Conector ChatGPT]\n\n${message.trim()}`,
        imageAttachments,
        conversationHistory: [],
        source: 'chatgpt_connector_support',
      };

      const res = await fetch(SUPPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      setStatus('sent');
      setMessage('');
      setFiles([]);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error al enviar');
    }
  }, [message, files]);

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="text-2xl">✓</div>
        <p className="mt-2 text-sm font-semibold text-emerald-800">Mensaje recibido</p>
        <p className="mt-1 text-xs text-emerald-700">
          Te responderemos en soporte@verifactu.business en horario laboral.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-4 text-xs font-medium text-emerald-700 underline hover:no-underline"
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Describe tu consulta o problema con el conector ChatGPT + Holded..."
        rows={5}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
      />

      {/* File attachment — only for registered users */}
      {isRegistered ? (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={files.length >= 3}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Adjuntar imagen o PDF {files.length > 0 ? `(${files.length}/3)` : ''}
          </button>
          {files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {files.map((f) => (
                <div
                  key={f.name}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                >
                  <span className="max-w-[120px] truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(f.name)}
                    className="text-slate-400 hover:text-slate-700"
                    aria-label="Eliminar adjunto"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          Para adjuntar capturas e imágenes,{' '}
          <a href="/auth/holded" className="font-medium text-emerald-700 underline">
            regístrate gratis
          </a>
          .
        </p>
      )}

      {status === 'error' && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{errorMsg}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!message.trim() || status === 'sending'}
        className="inline-flex items-center gap-2 rounded-full bg-[#10a37f] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d8f6f] disabled:opacity-40"
      >
        {status === 'sending' ? 'Enviando…' : 'Enviar consulta'}
      </button>
    </div>
  );
}
