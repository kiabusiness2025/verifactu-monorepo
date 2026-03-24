import IsaakPublicChat from '../components/IsaakPublicChat';

export default function IsaakChatPage() {
  return (
    <main className="min-h-screen py-14 text-slate-900">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 max-w-3xl">
          <div className="inline-flex items-center rounded-full bg-[#2361d8]/10 px-4 py-1.5 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/15">
            Chat abierto de Isaak
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
            Pregunta ahora y recibe una respuesta clara, sin acceso ni registro previo.
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
            Este espacio sirve para conocer la forma de pensar de Isaak. Si tu caso requiere más
            contexto, memoria o trabajo con datos reales, el siguiente paso será activar tu entorno
            completo con calma.
          </p>
        </div>

        <IsaakPublicChat />
      </div>
    </main>
  );
}
