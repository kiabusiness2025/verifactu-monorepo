import Image from 'next/image';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { buildIsaakAuthUrl, ISAAK_PUBLIC_URL } from '@/app/lib/isaak-navigation';

export const metadata = {
  title: 'Acceder — Isaak',
  description: 'Inicia sesión en Isaak, tu copiloto fiscal inteligente.',
};

export default function AuthPage() {
  const loginUrl = buildIsaakAuthUrl('isaak_auth_page', `${ISAAK_PUBLIC_URL}/chat`);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0b1a40] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl shadow-lg">
            <Image
              src="/Personalidad/isaak-avatar-2.png"
              alt="Isaak"
              fill
              sizes="64px"
              className="object-cover"
              priority
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">Isaak</h1>
            <p className="mt-1 text-sm text-slate-400">Tu copiloto fiscal inteligente</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-base font-semibold text-white">Inicia sesión</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Accede para usar tu copiloto fiscal. Si es tu primera vez, crearemos la cuenta
            automáticamente.
          </p>

          <Link
            href={loginUrl}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2361d8] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1d55c2]"
          >
            <Sparkles className="h-4 w-4" />
            Entrar a Isaak
          </Link>

          <p className="mt-4 text-center text-xs text-slate-600">
            ¿Primera vez?{' '}
            <Link
              href={loginUrl + '&signup=1'}
              className="text-slate-400 hover:text-white underline"
            >
              Crear cuenta
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-700">
          Powered by{' '}
          <a
            href="https://verifactu.business"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-500"
          >
            verifactu.business
          </a>
        </p>
      </div>
    </main>
  );
}
