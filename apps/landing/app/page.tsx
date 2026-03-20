'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Briefcase, Building2, Check, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import Header from './components/Header';
import Faq from './components/Faq';
import PricingCalculatorInline from './components/PricingCalculatorInline';
import PricingCalculatorInlineModal from './components/PricingCalculatorInlineModal';
import { getAppUrl } from './lib/urls';
import { EXCESS_TEXT_LINES, EXCESS_TEXT_TITLE, PLAN_LIST } from './lib/plans';

import {
  ComplianceBadge,
  Container,
  DashboardMock,
  HeroTripleMock,
  FeaturesSection,
  Footer,
  PideseloAIsaakSection,
  ResourceCard,
  StickyCtaBar,
  ThreeSteps,
  TrustBadge,
} from './lib/home/ui';

export default function Page() {
  const navLinks = [
    { label: 'Inicio', href: '/' },
    { label: 'Qué es Isaak', href: '/que-es-isaak' },
    { label: 'Precios', href: '/precios' },
    { label: 'Contacto', href: '/recursos/contacto' },
  ];

  const [showStickyCta, setShowStickyCta] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const appUrl = getAppUrl();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 320);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      {/* HERO */}
      <section id="hero" className="relative">
        <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[#2361d8]/5" />
        <Container className="pt-14 pb-10">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
              }
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                <ShieldCheck className="h-4 w-4 text-[#2361d8]" />
                Cumplimiento VeriFactu con Isaak
              </div>
              <Link
                href="/verifactu/estado"
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-3 py-1 text-[11px] font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/15 hover:text-[#2361d8]"
              >
                <span className="h-2 w-2 rounded-full bg-[#2361d8]" aria-hidden="true" />
                Estado del servicio: operativo
              </Link>

              <h1 className="mt-5 text-[2.75rem] font-bold leading-[1.1] tracking-tight text-[#011c67] sm:text-6xl">
                Cumple VeriFactu y controla tus ventas - gastos = beneficio.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-lightbg-600 sm:text-lg">
                Verifactu.business es tu capa empresarial: ventas, gastos, cobros y beneficio con
                Isaak. Si conectas tu programa de contabilidad vía API, sincronizamos sin fricción.
              </p>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                Verifactu e Isaak no sustituyen a tu gestor habitual. Te dan visibilidad diaria de
                ventas, gastos y beneficio, con impuesto estimado, para decidir en tiempo real y
                comparar o compartir resultados con tu asesoría.
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                Fuente oficial:{' '}
                <a
                  href="https://www.agenciatributaria.es/AEAT.internet/Inicio/La_Agencia_Tributaria/Tramites_y_servicios/VeriFactu.shtml"
                  className="font-semibold text-[#2361d8] hover:text-[#2361d8]"
                  target="_blank"
                  rel="noreferrer"
                >
                  Agencia Tributaria (AEAT)
                </a>{' '}
                - Te obliga a emitir y registrar facturas con trazabilidad e integridad.
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={appUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
                >
                  Empezar prueba de 30 días
                </Link>
                <Link
                  href="/#planes"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#2361d8] bg-white px-6 py-3 font-semibold text-[#2361d8] shadow-sm transition hover:bg-[#2361d8]/10"
                >
                  Calcular precio
                </Link>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                30 días para crear y registrar. Después, acceso en modo lectura y exportación AEAT
                (Excel).
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                <TrustBadge
                  icon={<Sparkles className="h-4 w-4 text-[#2361d8]" />}
                  text="Isaak incluido"
                />
                <TrustBadge
                  icon={<ShieldCheck className="h-4 w-4 text-[#2361d8]" />}
                  text="Cumplimiento"
                />
                <TrustBadge
                  icon={<Check className="h-4 w-4 text-emerald-600" />}
                  text="Datos bajo control"
                />
              </div>
            </motion.div>

            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.08 }
              }
            >
              <HeroTripleMock />
            </motion.div>
          </div>
        </Container>
      </section>

      <section id="para-quien" className="py-16 bg-white">
        <Container>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2361d8] shadow-sm ring-1 ring-[#2361d8]/20">
              Para quién es Verifactu + Isaak
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              Para quién quiere control diario, sin volverse contable
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-lightbg-600 sm:text-lg">
              Verifactu te ayuda a cumplir con VeriFactu. Isaak te ayuda a entender tu negocio.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div
                className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-sky-100/70 blur-2xl"
                aria-hidden="true"
              />
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-[#2361d8]">
                  <UserRound className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-semibold text-[#011c67]">Autónomos y microempresas</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                ERP sencillo para emitir y registrar. Visibilidad diaria de ventas, gastos y
                beneficio sin fricción.
              </p>
            </div>
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div
                className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#2361d8]/10/70 blur-2xl"
                aria-hidden="true"
              />
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2361d8]/10 text-[#2361d8]">
                  <Building2 className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-semibold text-[#011c67]">PYMES que necesitan visibilidad real</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Control diario, sin volverse contable. Detecta desvíos antes del cierre de mes.
              </p>
            </div>
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div
                className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-indigo-100/70 blur-2xl"
                aria-hidden="true"
              />
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-[#3B4B96]">
                  <Briefcase className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-semibold text-[#011c67]">
                  Empresas con asesoría que quieren ir un paso por delante
                </h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Contrasta y comparte con asesoría usando libros e informes en Excel con trazabilidad.
              </p>
            </div>
          </div>

          <div className="mt-12 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
              <div className="text-sm font-semibold text-[#2361d8]">Lo que cambia cuando lo usas</div>
            <ul className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                Visibilidad diaria de ventas, gastos y beneficio estimado.
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                Impuesto orientativo (IVA/IRPF/IS según configuración) para decidir con tiempo.
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                Documentos ordenados y listos para compartir con tu asesoría.
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                Menos fricción: Isaak guía, revisa y propone próximos pasos.
              </li>
            </ul>
            <p className="mt-5 text-xs text-slate-500">
              Aviso: Verifactu e Isaak no sustituyen a tu gestor o asesor fiscal. Te aportan
              visibilidad y organización para que puedas decidir antes y colaborar mejor con tu
              asesoría. Las cifras e impuestos mostrados son orientativos y dependen de la
              información disponible.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={appUrl}
                className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
              >
                Empezar prueba de 30 días
              </Link>
              <Link
                href="/recursos/contacto"
                className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Solicitar información
              </Link>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <div className="text-sm font-semibold text-[#2361d8]">
              Deja de esperar al cierre de mes
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Con Isaak tienes ventas, gastos y beneficio estimado hoy. VeriFactu, al día.
            </p>
          </div>
        </Container>
      </section>

      {/* Dashboard preview */}
      <section
        id="dashboard"
        className="py-16 bg-[#2361d8]/5"
      >
        <Container>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-4 py-1.5 text-sm font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/15">
              <Sparkles className="h-4 w-4" />
              Dashboard
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              Ventas - Gastos = Beneficio
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-lightbg-600 sm:text-lg">
              Beneficio actualizado sin esperar al asesor. Verifactu opera el día a día y se conecta
              con tu programa contable vía API cuando activas integración.
            </p>
          </div>

          <div className="mt-12">
            <DashboardMock />
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container>
          <div className="grid items-center gap-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_52%,#ffffff_100%)] p-6 shadow-sm lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#2361d8] ring-1 ring-[#2361d8]/15">
                Isaak en Verifactu
              </div>
              <h2 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
                El contable nativo que traduce Holded y tu operativa en decisiones claras.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Isaak vive dentro de verifactu.business para ayudarte a entender ventas, gastos,
                cobros, balances y tareas fiscales sin navegar menús contables complejos. Si
                conectas Holded u otra API de gestión, Isaak trabaja sobre esos datos dentro de tu
                propio dashboard.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                  <div className="text-sm font-semibold text-[#011c67]">Explica lo importante</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Resume números, detecta desvíos y te explica qué pasa en lenguaje de negocio.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                  <div className="text-sm font-semibold text-[#011c67]">Actúa contigo</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Prepara borradores, revisa datos y te guía paso a paso antes de confirmar.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/que-es-isaak"
                  className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
                >
                  Ver qué es Isaak
                </Link>
                <Link
                  href={appUrl}
                  className="inline-flex items-center justify-center rounded-full border border-[#2361d8] bg-white px-6 py-3 text-sm font-semibold text-[#2361d8] transition hover:bg-[#2361d8]/10"
                >
                  Probar Isaak en el dashboard
                </Link>
              </div>
            </div>

            <div className="relative">
              <div
                className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-[#2361d8]/15 blur-3xl"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-sky-200/40 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white p-3 shadow-[0_25px_80px_-30px_rgba(35,97,216,0.45)]">
                <Image
                  src="/Isaak/Isaak_principal.png"
                  alt="Vista principal de Isaak en Verifactu"
                  width={1400}
                  height={1200}
                  className="h-auto w-full rounded-[1.1rem] object-cover"
                  priority={false}
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Planes */}
      <section id="planes" className="py-16">
        <Container>
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              Planes claros para cumplir y tener control
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-lightbg-600 sm:text-lg">
              Todos incluyen VeriFactu + gastos + exportación de libros oficiales Excel compatibles
              AEAT. En Empresa y Pro puedes activar integración con tu programa de contabilidad vía API.
            </p>

            <div className="mt-10 grid gap-4 text-left lg:grid-cols-4">
              {PLAN_LIST.map((plan) => (
                <article
                  key={plan.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {plan.name}
                  </div>
                  <div className="mt-3 text-3xl font-bold text-[#011c67]">{plan.priceEur} EUR</div>
                  <div className="text-sm text-slate-500">/mes</div>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    <li>Hasta {plan.includedInvoices} facturas/mes</li>
                    {plan.includes.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                    <li>
                      {plan.hasAccountingIntegration
                        ? "Integración con tu programa de contabilidad vía API"
                        : "Integración API opcional (disponible en Empresa/PRO)"}
                    </li>
                  </ul>
                </article>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/#planes"
                className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Calcular precio
              </Link>
              <Link
                href={appUrl}
                className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
              >
                Empezar prueba de 30 días
              </Link>
            </div>

            <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm">
              <h3 className="text-xl font-semibold text-[#011c67]">{EXCESS_TEXT_TITLE}</h3>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                {EXCESS_TEXT_LINES.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <PricingCalculatorInline />
            </div>
          </div>
        </Container>
      </section>

      <section id="features">
        <FeaturesSection />
      </section>
      <ThreeSteps />
      <div id="que-es-isaak">
        <PideseloAIsaakSection />
      </div>

      {/* Cumplimiento */}
      <section className="py-12">
        <Container>
          <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-[#011c67] sm:text-3xl">
                Cumple con calma.
              </h2>
              <p className="mt-3 text-sm leading-6 text-lightbg-600 sm:text-base">
                VeriFactu no deberia darte miedo. Isaak y la plataforma trabajan como apoyo: te
                permiten ver resultados contables al momento y contrastarlos con tu gestor cuando
                cierre periodos mensuales, trimestrales o anuales.
              </p>
            </div>
            <ComplianceBadge />
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 bg-[#2361d8]/5">
        <Container>
          <div className="text-center mb-12">
            <h3 className="text-2xl font-semibold tracking-tight text-[#011c67] sm:text-3xl">
              Preguntas frecuentes
            </h3>
            <p className="mt-3 text-sm leading-6 text-lightbg-600 sm:text-base">
              Respuestas rapidas sobre planes, seguridad y funcionalidades.
            </p>
          </div>
          <Faq onOpenCalculator={() => setShowCalculatorModal(true)} />
        </Container>
      </section>

      {/* Resources */}
      <section className="py-14 bg-[#2361d8]/5">
        <Container>
          <h3 className="text-center text-2xl font-semibold tracking-tight text-[#011c67] sm:text-3xl">
            Recursos para dominar VeriFactu e Isaak.
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-lightbg-600 sm:text-base">
            Guias, onboarding y checklist para aplicar mejores practicas y aprovechar todo el
            potencial de la plataforma.
          </p>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <ResourceCard
              tag="Guia"
              title="Manual VeriFactu actualizado"
              desc="Requisitos y checklist práctico para operar con confianza este año."
              cta="Descargar guía"
              href="/recursos/guias-y-webinars"
            />
            <ResourceCard
              tag="Primeros pasos"
              title="Primeros pasos con Isaak"
              desc="Aprende a emitir, registrar gastos y entender tus metricas."
              cta="Reservar plaza"
              href="/que-es-isaak"
            />
            <ResourceCard
              tag="Checklist"
              title="Auditoria express"
              desc="Evalua el estado de tu facturacion y detecta riesgos."
              cta="Solicitar checklist"
              href="/recursos/checklist"
            />
          </div>
        </Container>
      </section>

      <Footer />
      <StickyCtaBar show={showStickyCta} />
      <PricingCalculatorInlineModal
        isOpen={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
      />
    </div>
  );
}




