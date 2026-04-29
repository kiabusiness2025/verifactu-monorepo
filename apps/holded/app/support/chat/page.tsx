import { ArrowLeft, MessageSquareText, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import SupportAssistantClient from '../../components/SupportAssistantClient';

export const metadata: Metadata = {
  title: 'Chat de soporte | Holded',
  description: 'Ventana independiente de soporte tecnico para el conector Holded.',
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const DEFAULT_SUPPORT_PROMPT =
  'Necesito soporte tecnico con el conector de Holded. Ayudame a diagnosticar el problema paso a paso.';

function readValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function HoldedSupportChatPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const source = readValue(resolved.source) || 'holded_support_chat';
  const digest = readValue(resolved.digest);
  const prompt = readValue(resolved.prompt) || DEFAULT_SUPPORT_PROMPT;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_52%,#fff7f7_100%)] text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Link
            href="/support"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Soporte
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Ventana independiente
          </div>
        </div>

        <div className="mb-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
            <MessageSquareText className="h-4 w-4" />
            Isaak soporte tecnico
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Chat de soporte Holded
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Isaak puede ayudarte con acceso, verificacion, API key, conexion de Holded y errores del
            conector.
          </p>
        </div>

        <SupportAssistantClient
          source={source}
          digest={digest || undefined}
          title="Soy Isaak, soporte tecnico de Verifactu Business para Holded."
          description="He iniciado el caso con el contexto de soporte. Puedes anadir detalles del error, el paso donde ocurre o un codigo de referencia."
          endpoint="/api/isaak/support"
          page="generic"
          initialPrompt={prompt}
          autoSendInitialPrompt
          className="flex-1"
        />
      </section>
    </main>
  );
}
