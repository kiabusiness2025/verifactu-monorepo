"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "var(--color-slate-100, #f1f5f9)", textAlign: "center", padding: "20px" }}>
      <div>
        <h1 style={{ fontSize: "48px", fontWeight: 600, marginBottom: "16px" }}>Error</h1>
        <p style={{ fontSize: "18px", color: "var(--color-slate-600, #64748b)", marginBottom: "24px" }}>
          Algo salió mal
        </p>
        <button 
          onClick={() => reset()}
          style={{ 
            padding: "12px 24px", 
            background: "var(--color-primary-600, #2563eb)", 
            color: "white", 
            border: "none", 
            borderRadius: "6px", 
            cursor: "pointer",
            marginRight: "12px"
          }}
        >
          Intentar de nuevo
        </button>
        <a 
          href="/" 
          style={{ 
            padding: "12px 24px", 
            color: "var(--color-primary-600, #2563eb)", 
            textDecoration: "underline",
            display: "inline-block"
          }}
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
