import { notFound } from 'next/navigation';
import { prisma } from '@/app/lib/prisma';
import { ISAAK_PUBLIC_URL } from '@/app/lib/isaak-navigation';
import IsaakPublicChat from './IsaakPublicChat';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findFirst({
    where: { isaakPublicSlug: slug, isaakPublicEnabled: true },
    select: { name: true, profile: { select: { tradeName: true } } },
  });

  if (!tenant) return { title: 'Chat no disponible' };

  const name = tenant.profile?.tradeName || tenant.name;
  return {
    title: `${name} — Asistente IA`,
    description: `Chat con el asistente de ${name}, impulsado por Isaak.`,
  };
}

export default async function IsaakPublicPage({ params }: Props) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findFirst({
    where: { isaakPublicSlug: slug, isaakPublicEnabled: true },
    select: {
      name: true,
      profile: {
        select: {
          tradeName: true,
          cnae: true,
          city: true,
          website: true,
        },
      },
    },
  });

  if (!tenant) notFound();

  const companyName = tenant.profile?.tradeName || tenant.name;

  return (
    <div className="flex min-h-screen flex-col bg-[#fafbff]">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white px-5 py-4 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold text-[#011c67]">{companyName}</h1>
            {tenant.profile?.city && (
              <p className="text-[11px] text-slate-500">{tenant.profile.city}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-medium text-slate-500">Powered by Isaak</span>
          </div>
        </div>
      </header>

      {/* Chat */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <IsaakPublicChat slug={slug} companyName={companyName} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-4 text-center">
        <p className="text-[11px] text-slate-400">
          Asistente IA impulsado por{' '}
          <a
            href={ISAAK_PUBLIC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2361d8] hover:underline"
          >
            Isaak
          </a>
          . Tus mensajes pueden ser procesados por IA.
        </p>
      </footer>
    </div>
  );
}
