export default function AdminDashboardPage() {
  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Panel admin</h1>
        <p className="text-sm text-gray-600">
          Acceso restringido. Gestiona usuarios, empresas y facturacion.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Usuarios</div>
          <div className="mt-2 text-base font-semibold text-gray-900">
            Gestionar altas y permisos
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Empresas</div>
          <div className="mt-2 text-base font-semibold text-gray-900">
            Tenants y vinculaciones
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Billing</div>
          <div className="mt-2 text-base font-semibold text-gray-900">
            Suscripciones y pagos
          </div>
        </div>
      </div>
    </main>
  );
}
