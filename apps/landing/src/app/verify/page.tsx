"use client";
import { useState } from "react";

export default function VerifyPage() {
  const [hash, setHash] = useState("");
  const [result, setResult] = useState<null | { valid: boolean; message: string }>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const ok = hash.trim().length > 10;
      setResult({ valid: ok, message: ok ? "Factura válida (demo)" : "Hash no válido (demo)" });
      setLoading(false);
    }, 600);
  }

  return (
    <section className="container py-16">
      <h1 className="text-2xl font-semibold">Verificador público de facturas</h1>
      <p className="mt-2 text-[var(--muted)] text-sm">
        Introduce el hash de la factura para comprobar su validez e integridad.
      </p>
      <form onSubmit={onSubmit} className="mt-6 flex gap-2">
        <input
          className="flex-1 border border-[var(--line)] rounded-xl px-3 py-2"
          placeholder="sha256:xxxxxxxx..."
          value={hash}
          onChange={(e)=>setHash(e.target.value)}
        />
        <button className="btn btn-primary" disabled={loading}>
          {loading ? "Verificando..." : "Verificar"}
        </button>
      </form>
      {result && (
        <div className="mt-6 card">
          <p className={result.valid ? "text-green-600" : "text-red-600"}>
            {result.message}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">* Demo local. Conexión real en pasos siguientes.</p>
        </div>
      )}
    </section>
  );
}
