export default function DocsPage() {
  return (
    <section className="container py-16 prose prose-neutral max-w-3xl">
      <h1>Documentación técnica (vista previa)</h1>
      <p>
        Expert App · Verifactu: endpoints y formatos de integración. Esta
        sección se conectará a tu repositorio o base de conocimiento.
      </p>
      <h2>Endpoints previstos</h2>
      <ul>
        <li><code>POST /api/verifactu/seal</code> — sellado (hash + QR)</li>
        <li><code>POST /api/verifactu/verify</code> — verificación de integridad</li>
        <li><code>POST /api/verifactu/rectify</code> — emisión rectificativa</li>
      </ul>
      <p className="text-sm text-neutral-500">
        * Esta página es estática. En pasos posteriores conectaremos ejemplos en vivo.
      </p>
    </section>
  );
}
