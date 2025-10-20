'use client';
import { useState, useEffect } from 'react';

export default function VerifactuPage() {
  const [out, setOut] = useState<string>('Pulsa un botón para probar…');
  const [apiBase, setApiBase] = useState('');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    fetch('/config.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((config) => {
        setApiBase(config.API_BASE || '');
        setStatus('loaded');
      })
      .catch((error) => {
        console.error('Error fetching config:', error);
        setStatus('error');
      });
  }, []);

  async function doFetch(path: string) {
    const url = apiBase.replace(/\/+$/, '') + path;
    setOut(`Solicitando: ${url}`);
    try {
      const resp = await fetch(url, { method: 'GET' });
      const text = await resp.text();
      try {
        setOut(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setOut(text);
      }
    } catch (e: any) {
      setOut(`Error: ${e?.message || String(e)}`);
    }
  }

  return (
    <main
      style={{
        fontFamily: 'system-ui, Segoe UI, Arial, sans-serif',
        maxWidth: 780,
        margin: '40px auto',
        padding: '0 16px',
      }}
    >
      <h1>VERIFACTU · PRE (Next.js)</h1>
      <div
        style={{
          border: '1px solid #eee',
          borderRadius: 12,
          padding: 16,
          margin: '12px 0',
        }}
      >
        <div>
          <small>API_BASE:</small> <code>{status === 'loading' ? '(cargando...)' : status === 'error' ? '(error)' : apiBase}</code>
        </div>
      </div>
      <div
        style={{
          border: '1px solid #eee',
          borderRadius: 12,
          padding: 16,
          margin: '12px 0',
        }}
      >
        <h2>Pruebas rápidas</h2>
        <p>
          <button
            onClick={() => doFetch('/api/healthz')}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #ddd',
              marginRight: 8,
            }}
          >
            Ping /api/healthz
          </button>
          <button
            onClick={() => doFetch('/api/verifactu/ops')}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #ddd',
            }}
          >
            Listar /ops
          </button>
        </p>
        <pre
          style={{
            background: '#fafafa',
            border: '1px solid #eee',
            padding: 12,
            borderRadius: 8,
            overflow: 'auto',
          }}
        >
          {out}
        </pre>
      </div>
    </main>
  );
}