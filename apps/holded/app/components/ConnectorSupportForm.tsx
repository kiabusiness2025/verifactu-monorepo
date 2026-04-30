'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';

type ConnectorId = 'chatgpt' | 'claude';
type Status = 'idle' | 'sending' | 'sent' | 'error';

const SUPPORT_URL = '/api/support/tickets';

const CONNECTOR_THEME: Record<
  ConnectorId,
  { focusBorder: string; focusRing: string; btn: string; btnHover: string }
> = {
  chatgpt: {
    focusBorder: 'focus:border-emerald-400',
    focusRing: 'focus:ring-emerald-100',
    btn: 'bg-[#10a37f]',
    btnHover: 'hover:bg-[#0d8f6f]',
  },
  claude: {
    focusBorder: 'focus:border-amber-400',
    focusRing: 'focus:ring-amber-100',
    btn: 'bg-amber-600',
    btnHover: 'hover:bg-amber-700',
  },
};

function connectorLabel(connector: ConnectorId) {
  return connector === 'claude' ? 'Claude' : 'ChatGPT';
}

export function ConnectorSupportForm({
  connector,
  isRegistered,
}: {
  connector: ConnectorId;
  isRegistered: boolean;
}) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const t = CONNECTOR_THEME[connector];

  const handleSubmit = useCallback(async () => {
    if (!isRegistered || !message.trim()) return;

    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch(SUPPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connector,
          subject: subject.trim() || `Soporte conector Holded para ${connectorLabel(connector)}`,
          message: message.trim(),
          source: `${connector}_connector_support_form`,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || `Error ${res.status}`);
      }

      setTicketId(typeof payload?.ticketId === 'string' ? payload.ticketId : null);
      setSubject('');
      setMessage('');
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'No hemos podido enviar la consulta.');
    }
  }, [connector, isRegistered, message, subject]);

  if (!isRegistered) {
    const next = `/conectores/${connector}/soporte`;
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-semibold text-slate-900">
          Formulario para usuarios autenticados
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Inicia sesion para abrir un ticket vinculado a tu usuario y tenant de Holded. Si necesitas
          enviar capturas o PDFs antes de iniciar sesion, usa el email directo.
        </p>
        <Link
          href={`/auth/holded?source=${connector}_support_form&next=${encodeURIComponent(next)}`}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Iniciar sesion
        </Link>
      </div>
    );
  }

  if (status === 'sent') {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
        <p className="text-sm font-semibold text-emerald-900">Ticket creado</p>
        <p className="mt-2 text-sm leading-6 text-emerald-800">
          Hemos registrado tu consulta y avisado al equipo de soporte.
          {ticketId ? ` Referencia: ${ticketId.slice(-8)}.` : ''}
        </p>
        <button
          type="button"
          onClick={() => {
            setTicketId(null);
            setStatus('idle');
          }}
          className="mt-4 text-sm font-semibold text-emerald-800 underline underline-offset-4 hover:no-underline"
        >
          Enviar otra consulta
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        maxLength={140}
        placeholder={`Asunto - Conector Holded para ${connectorLabel(connector)}`}
        className={`w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 ${t.focusBorder} focus:outline-none focus:ring-2 ${t.focusRing}`}
      />
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        maxLength={4000}
        placeholder="Describe la consulta, error o paso donde necesitas ayuda..."
        rows={6}
        className={`w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 ${t.focusBorder} focus:outline-none focus:ring-2 ${t.focusRing}`}
      />

      <p className="text-xs leading-5 text-slate-500">
        Este formulario crea un ticket asociado a tu sesion. Para adjuntar archivos, usa el email
        directo y menciona la referencia del ticket si ya existe.
      </p>

      {status === 'error' && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errorMsg}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!message.trim() || status === 'sending'}
        className={`inline-flex items-center gap-2 rounded-full ${t.btn} px-6 py-2.5 text-sm font-semibold text-white transition ${t.btnHover} disabled:opacity-40`}
      >
        {status === 'sending' ? 'Enviando...' : 'Crear ticket'}
      </button>
    </div>
  );
}
