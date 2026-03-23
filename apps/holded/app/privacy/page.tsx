import { Database, Lock, Mail, ServerCog, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Isaak with Holded compatibility',
  description: 'Privacy policy for Isaak when Holded is connected as a compatible source.',
};

export default function HoldedPrivacyPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_45%,#ffffff_100%)] text-slate-900">
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
              <ShieldCheck className="h-4 w-4" />
              Privacy policy
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Privacy Policy for Isaak with Holded compatibility
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              This page explains what data we process, how Holded credentials are handled, and what
              rights users have when connecting Holded as a compatible source in Isaak.
            </p>
            <p className="text-sm text-slate-500">Last updated: March 19, 2026.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:w-[24rem]">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Lock className="h-4 w-4 text-emerald-600" />
              Key principle
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Holded API keys are processed server-side and are not exposed to the client interface
              presented to the user.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Database className="h-4 w-4 text-[#ff5460]" />
              Data we process
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>- Account data needed to identify the user inside Isaak.</li>
              <li>- Holded connection data provided by the user, including the API key.</li>
              <li>
                - Business data requested through the app, such as invoices, contacts, accounts, CRM
                items and projects.
              </li>
              <li>- Operational logs required for security, support and troubleshooting.</li>
            </ul>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ServerCog className="h-4 w-4 text-[#ff5460]" />
              Why we process it
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>- To connect the user account with Holded.</li>
              <li>
                - To let Isaak retrieve and explain business information requested by the user.
              </li>
              <li>- To improve reliability, traceability and support for the service.</li>
              <li>- To comply with legal and security obligations applicable to the service.</li>
            </ul>
          </article>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Lock className="h-4 w-4 text-[#ff5460]" />
            Holded credentials
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            The user chooses which Holded account to connect by providing an API key. That key is
            encrypted and stored in backend infrastructure controlled by Isaak. It is not intended
            to be displayed back to the user after submission.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Mail className="h-4 w-4 text-[#ff5460]" />
            Contact and rights
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            For privacy requests, support or deletion requests, contact us through{' '}
            <Link
              href="/support"
              className="font-semibold text-[#ff5460] underline underline-offset-4"
            >
              Holded support
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
