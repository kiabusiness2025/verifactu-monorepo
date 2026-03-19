import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, FileText, Scale, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | Isaak for Holded',
  description:
    'Terms of service for Isaak for Holded, the public ChatGPT app operated by Verifactu.',
};

export default function HoldedTermsPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_45%,#ffffff_100%)] text-slate-900">
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link href="/holded" className="text-sm font-semibold text-[#ff5460] hover:text-[#ef4654]">
            Volver a Isaak for Holded
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
              <FileText className="h-4 w-4" />
              Terms of service
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">Terms of Service for Isaak for Holded</h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              These terms govern access to and use of Isaak for Holded as a public app experience operated by Verifactu.
            </p>
            <p className="text-sm text-slate-500">Last updated: March 19, 2026.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:w-[24rem]">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              Important notice
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Isaak provides guidance and operational assistance. It does not replace a licensed accountant, tax advisor,
              or legal professional.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="h-4 w-4 text-[#ff5460]" />
              Service scope
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Isaak for Holded allows eligible users to connect Holded server-side and interact with selected data and tools
              from ChatGPT and Verifactu-managed experiences.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Scale className="h-4 w-4 text-[#ff5460]" />
              User responsibility
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Users are responsible for the accuracy of the Holded account they connect, the API key they provide, and the
              review of any sensitive actions before confirmation.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Scale className="h-4 w-4 text-[#ff5460]" />
              Availability and changes
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              The app is provided as an evolving service. Features, limits and supported tools may change as the product
              matures and as OpenAI or Holded platform requirements evolve.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Mail className="h-4 w-4 text-[#ff5460]" />
              Contact
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              For legal or service questions, contact{' '}
              <a href="mailto:info@verifactu.business" className="font-semibold text-[#ff5460] underline underline-offset-4">
                info@verifactu.business
              </a>
              .
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
