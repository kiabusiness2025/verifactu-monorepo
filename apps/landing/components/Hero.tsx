import Link from "next/link";
import { SITE } from "@/lib/site";

function Badge() {
  return (
    <div className="inline-flex items-center gap-2 border border-[var(--line)] rounded-full px-3 py-1 text-xs">
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-black" />
      Homologación VERIFACTU · AEAT
    </div>
  );
}

export default function Hero() {
  return (
    <section className="container py-16 sm:py-24">
      <div className="max-w-3xl">
        <Badge />
        <h1 className="mt-6 text-4xl sm:text-5xl font-semibold leading-tight tracking-tight">
          Facturación homologada por AEAT, <br/>con inteligencia <span className="underline underline-offset-4">Isaak</span>.
        </h1>
        <p className="mt-4 text-[var(--muted)]">
          Emite facturas con QR y hash encadenado, registra gastos y garantiza
          la integridad y trazabilidad exigidas por VERIFACTU.
        </p>
        <div className="mt-8 flex gap-3">
          <a href={process.env.NEXT_PUBLIC_APP_URL || "https://robotcontable.com"} className="btn btn-primary">{SITE.cta.primary}</a>
          <a href="/docs" className="btn">{SITE.cta.secondary}</a>
        </div>
      </div>
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ["QR + Hash", "Cadena inmutable por serie y registro WORM."],
          ["Integración AEAT", "Formato oficial y trazabilidad de eventos."],
          ["Infra Cloud", "Google Cloud Run + Supabase + Resend + Stripe."]
        ].map(([title, desc]) => (
          <div key={title} className="card">
            <h3 className="font-medium">{title}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
