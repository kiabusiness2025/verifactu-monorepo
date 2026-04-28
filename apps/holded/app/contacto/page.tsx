import { LifeBuoy, Mail, MessageCircleMore, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import ContactForm from '../components/ContactForm';

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'soporte@verifactu.business';

export const metadata: Metadata = {
  title: 'Contacto y soporte | Verifactu Business',
  description:
    'Formulario de contacto y soporte para resolver dudas sobre los conectores Claude y ChatGPT, servicios de migración y formación en Holded.',
  alternates: { canonical: '/contacto' },
};

const supportCards = [
  {
    title: 'Duda comercial',
    body: 'Si quieres entender encaje, alcance o siguiente paso, usa este formulario corto.',
    icon: MessageCircleMore,
  },
  {
    title: 'Bloqueo en onboarding',
    body: 'Si el problema es de acceso, verificacion o conexion, cuentanoslo sin llenar campos innecesarios.',
    icon: LifeBuoy,
  },
  {
    title: 'Respuesta por email',
    body: 'Te responderemos por email con el siguiente paso recomendado y, si hace falta, soporte directo.',
    icon: Mail,
  },
];

export default function HoldedContactPage() {
  return (
    <main className="page-enter min-h-screen py-12 text-slate-900 sm:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_100%)] p-8 shadow-[0_32px_80px_-58px_rgba(15,23,42,0.55)] sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
              <MessageCircleMore className="h-3.5 w-3.5" />
              Contacto y soporte
            </div>

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-[3rem] sm:leading-[1.02]">
              Formulario corto para hablar con nosotros.
            </h1>

            <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
              Aqui no tiene sentido pedir todos los datos de empresa. Si necesitas ayuda o quieres
              resolver una duda, bastan nombre, email y mensaje.
            </p>

            <div className="mt-8 space-y-4">
              {supportCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article
                    key={card.title}
                    className="rounded-[1.5rem] border border-slate-200 bg-white p-5"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Icon className="h-4 w-4 text-[#ff5460]" />
                      {card.title}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{card.body}</p>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-[#ff5460]" />
                Contacto directo
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Si prefieres escribir directamente:{' '}
                <span className="font-semibold">{supportEmail}</span>
              </p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_32px_80px_-58px_rgba(15,23,42,0.55)] sm:p-10">
            <div className="mb-6">
              <div className="text-sm font-semibold text-slate-900">Formulario de contacto</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Solo lo necesario para entender tu caso y responder bien.
              </p>
            </div>
            <ContactForm />
          </section>
        </div>
      </div>
    </main>
  );
}
