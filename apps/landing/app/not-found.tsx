export default function NotFound() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "var(--color-slate-100, #f1f5f9)", textAlign: "center", padding: "20px" }}>
      <div>
        <h1 style={{ fontSize: "48px", fontWeight: 600, marginBottom: "16px" }}>404</h1>
        <p style={{ fontSize: "18px", color: "var(--color-slate-600, #64748b)", marginBottom: "24px" }}>
          Página no encontrada
        </p>
        <a href="/" style={{ color: "var(--color-primary-600, #2563eb)", textDecoration: "underline" }}>
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
