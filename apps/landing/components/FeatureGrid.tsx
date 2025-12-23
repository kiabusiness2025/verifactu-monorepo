export default function FeatureGrid() {
  const items = [
    { t: "Facturación VERIFACTU", d: "Generación de QR y hash encadenado, rectificativas y auditoría." },
    { t: "Gastos y documentos", d: "Carga de documentos y extracción asistida por IA Isaak." },
    { t: "Estados y eventos", d: "DRAFT → SEALED → SENT → ACK/REJ con timeline completo." },
    { t: "Stripe listo", d: "Planes fijos y % sobre facturación; portal de facturación." },
    { t: "Seguridad", d: "RGPD, backups automatizados, control de acceso y RLS." },
    { t: "API pública", d: "Endpoints /seal, /verify, /rectify (opcional) y webhooks." }
  ];
  return (
    <section className="container pb-16 sm:pb-24">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <div key={it.t} className="card">
            <h3 className="font-medium">{it.t}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{it.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
