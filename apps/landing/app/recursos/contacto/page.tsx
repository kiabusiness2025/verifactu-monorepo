import { ArrowRight, LifeBuoy, Mail, MessageCircle, Receipt, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/Header';
import { Footer } from '../../lib/home/ui';
import ContactForms from './ContactForms';

export const metadata: Metadata = {
  title: 'Contacto | Verifactu Business',
  description: 'Contacta con nuestro equipo para soporte, ventas o consultas.',
};

export default function ContactoPage() {
  const navLinks = [
    { label: 'Inicio', href: '/' },
    { label: 'Qué es Isaak', href: '/que-es-isaak' },
    { label: 'Compatibilidad', href: '/holded' },
    { label: 'Planes', href: '/planes' },
    { label: 'Integraciones', href: '/producto/integraciones' },
    { label: 'Precios', href: '/precios' },
    { label: 'Contacto', href: '/recursos/contacto' },
  ];

  return (
    <div className="min-h-screen bg-[#f7fbff]">
      <Header navLinks={navLinks} />

      <main className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_40px_120px_-70px_rgba(15,23,42,0.45)] sm:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                  <MessageCircle className="h-4 w-4" />
                  Contacto guiado
                </div>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
                  Elige la forma mas directa de avanzar
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  Si quieres hablar con el equipo, pedir una prueba de Holded o abrir soporte, aqui
                  tienes el mismo punto de entrada claro que ya usamos en la home.
                </p>
                <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    Recogemos solo los datos necesarios para darte un siguiente paso claro.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    Soporte ordenado cuando ya tienes cuenta y seguimiento continuo del caso.
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-[1.5rem] border border-slate-200 bg-[#fbfdff] p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
                    <Mail className="h-4 w-4" />
                    Email directo
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Escríbenos a{' '}
                    <a
                      href="mailto:info@verifactu.business"
                      className="font-semibold text-[#2361d8] underline underline-offset-4"
                    >
                      info@verifactu.business
                    </a>
                    .
                  </p>
                </article>
                <article className="rounded-[1.5rem] border border-slate-200 bg-[#fffaf4] p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                    <Receipt className="h-4 w-4" />
                    Presupuesto
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Si necesitas una propuesta a medida, puedes ir a{' '}
                    <Link
                      href="/presupuesto"
                      className="font-semibold text-amber-700 underline underline-offset-4"
                    >
                      solicitar presupuesto
                    </Link>
                    .
                  </p>
                </article>
                <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
                    <Sparkles className="h-4 w-4" />
                    Isaak en minutos
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Si prefieres empezar por tu cuenta, Isaak te guia desde el primer minuto.
                  </p>
                </article>
                <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
                    <LifeBuoy className="h-4 w-4" />
                    Respuesta humana
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Respondemos en 24 a 48 horas laborables con el siguiente paso mas util.
                  </p>
                </article>
              </div>
            </div>
          </section>

          <div className="mt-8">
            <ContactForms />
          </div>

          <section className="mt-8 rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#fff9f4_100%)] p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                  Siguiente paso
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-[#011c67]">
                  Si todavia estas comparando opciones, podemos ayudarte a decidir sin ruido
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Puedes revisar precios, pedir presupuesto o empezar con Isaak y volver aqui si
                  necesitas acompanamiento.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/precios"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1f55c0]"
                >
                  Ver precios
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] transition hover:bg-[#2361d8]/10"
                >
                  Probar con Isaak
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
