import QuoteRequestForm from "../components/QuoteRequestForm";

export default function PresupuestoPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-primary">Solicitar presupuesto</h1>
      <p className="mt-4 text-sm text-lightbg-600">
        Si superas 1.000 facturas/mes o 2.000 movimientos/mes, preparamos un plan a medida.
      </p>
      <div className="mt-8">
        <QuoteRequestForm />
      </div>
    </main>
  );
}
