export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white text-slate-900 dark:bg-gray-900">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-xl font-semibold">Verifactu App</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Bienvenido. Usa el menú para navegar o ve a autenticación.</p>
        <div className="mt-4">
          <a href="/(full-width-pages)/(auth)/signin" className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Iniciar sesión</a>
        </div>
      </div>
    </main>
  );
}
