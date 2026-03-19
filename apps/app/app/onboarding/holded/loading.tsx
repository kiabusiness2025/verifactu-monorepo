import Image from 'next/image';

const loadingSteps = [
  'Preparando tu espacio de Isaak',
  'Comprobando el canal seguro con Holded',
  'Cargando el flujo de conexion en ChatGPT',
];

export default function HoldedOnboardingLoading() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-black">
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12 sm:px-10 lg:px-12">
        <div className="absolute left-[-8rem] top-[-6rem] h-64 w-64 rounded-full bg-[#ff5460]/10 blur-3xl" />
        <div className="absolute right-[-6rem] bottom-[-4rem] h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section>
            <div className="inline-flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-sm">
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Holded"
                width={24}
                height={24}
                className="h-6 w-6 rounded-md"
              />
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Isaak for Holded</span>
              <span className="h-1 w-1 rounded-full bg-neutral-300" />
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">ChatGPT</span>
            </div>

            <h1 className="mt-8 max-w-3xl text-4xl font-semibold tracking-tight text-black sm:text-5xl lg:text-6xl">
              Estamos preparando una conexion limpia, segura y mucho mas simple.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-neutral-600 sm:text-lg">
              Isaak está levantando tu flujo de conexión con Holded para que entres en ChatGPT con tus datos reales y sin pasar por una configuración compleja.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <div className="h-2 w-24 overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full w-1/2 animate-[pulse_1.6s_ease-in-out_infinite] rounded-full bg-[#ff5460]" />
              </div>
              <span className="text-sm font-medium text-neutral-500">Cargando experiencia Holded-first</span>
            </div>
          </section>

          <aside className="rounded-[28px] border border-neutral-200 bg-white/95 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)] sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-black">Estado del flujo</div>
                <div className="mt-1 text-sm text-neutral-500">Onboarding publico de Isaak for Holded</div>
              </div>
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Holded"
                width={40}
                height={40}
                className="h-10 w-10"
              />
            </div>

            <div className="mt-8 space-y-4">
              {loadingSteps.map((step, index) => (
                <div key={step} className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <div
                      className="h-3 w-3 rounded-full bg-[#ff5460]"
                      style={{ animation: `pulse 1.4s ease-in-out ${index * 0.18}s infinite` }}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-black">{step}</div>
                    <div className="mt-1 text-sm text-neutral-500">
                      {index === 0
                        ? 'Creando el contexto de Isaak para tu cuenta.'
                        : index === 1
                          ? 'Validando el flujo seguro antes de pedir tu API key.'
                          : 'Abriendo la experiencia final dentro de ChatGPT.'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl bg-[linear-gradient(135deg,#111111_0%,#1f2937_100%)] p-5 text-white">
              <div className="text-sm font-semibold">Mientras esperas</div>
              <div className="mt-2 text-sm leading-7 text-white/75">
                Isaak simplifica facturas, contactos y cuentas contables para que no tengas que navegar la complejidad de Holded sin ayuda.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
