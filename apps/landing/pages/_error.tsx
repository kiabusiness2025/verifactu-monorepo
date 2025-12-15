function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "#f1f5f9", textAlign: "center", padding: "20px" }}>
      <div>
        <h1 style={{ fontSize: "48px", fontWeight: 600, marginBottom: "16px" }}>
          {statusCode ? statusCode : "Error"}
        </h1>
        <p style={{ fontSize: "18px", color: "#64748b", marginBottom: "24px" }}>
          {statusCode === 404
            ? "Página no encontrada"
            : statusCode
            ? `Ocurrió un error ${statusCode}`
            : "Ocurrió un error en el cliente"}
        </p>
        <a href="/" style={{ color: "#2563eb", textDecoration: "underline" }}>
          Volver al inicio
        </a>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
