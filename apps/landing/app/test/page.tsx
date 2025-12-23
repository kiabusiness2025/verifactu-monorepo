"use client";

const checks = [
  {
    title: "Carga inicial",
    description: "Verifica que la página renderiza sin errores y con estilos aplicados.",
  },
  {
    title: "Navegación",
    description: "Comprueba que los enlaces principales responden y no hay saltos extraños.",
  },
  {
    title: "CTA y formularios",
    description: "Asegúrate de que los botones y formularios muestran el estado esperado.",
  },
  {
    title: "Responsive",
    description: "Revisa el comportamiento en móvil y tablet antes de validar.",
  },
];

export default function TestPage() {
  return (
    <div className="page">
      <header className="header">
        <div className="container header__inner">
          <a href="/" className="brand" aria-label="Volver al inicio">
            <img
              src="/assets/verifactu-business-logo.svg"
              alt="VeriFactu Business"
              className="brand__image"
            />
          </a>
          <nav className="nav">
            <a href="/">Landing</a>
            <a href="/#contact">Contacto</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="section">
          <div className="container">
            <div className="section__header">
              <h2>Checklist de pruebas</h2>
              <p>
                Página preparada para QA. Usa esta guía para validar el flujo antes de publicar.
              </p>
            </div>
            <div className="feature-grid">
              {checks.map((check) => (
                <article key={check.title} className="feature-card">
                  <h3>{check.title}</h3>
                  <p>{check.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
