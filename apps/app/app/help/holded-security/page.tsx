export default function HoldedSecurityHelpPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_55%,#f8fafc_100%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Seguridad Holded
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          Que hacer si no reconoces un cambio en la conexion
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-700 sm:text-base">
          Si has recibido un aviso de conexion o desconexion de Holded que no reconoces, trata la
          alerta como un posible acceso no autorizado. No compartas la API key y revoca la
          integracion sospechosa desde tu panel de Holded cuanto antes.
        </p>

        <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-amber-950">Pasos recomendados</h2>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-amber-950 sm:text-base">
            <li>1. Entra en Holded con una cuenta administradora.</li>
            <li>
              2. Abre la configuracion de API o integraciones y localiza la clave o app que no
              reconoces.
            </li>
            <li>3. Revoca esa API key o desconecta la integracion sospechosa.</li>
            <li>
              4. Genera una nueva clave solo si necesitas volver a conectar Holded con Verifactu.
            </li>
            <li>
              5. Revisa quien tiene acceso a la empresa y confirma que los correos asociados siguen
              siendo correctos.
            </li>
          </ol>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-semibold text-slate-950">Antes de reconectar</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              Verifica que la empresa correcta sigue activa, que el correo del titular coincide con
              el esperado y que la nueva clave se guarda solo desde una sesion fiable.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-semibold text-slate-950">Si necesitas ayuda</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              Responde al correo de alerta o escribe a support@verifactu.business indicando la
              empresa afectada, el canal usado y la hora aproximada del cambio.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
