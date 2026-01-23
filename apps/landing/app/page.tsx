'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Briefcase, Building2, Check, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import Header from './components/Header';
import Faq from './components/Faq';
import PricingCalculatorInline from './components/PricingCalculatorInline';
import { getAppUrl } from './lib/urls';

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
    { label: 'Inicio', href: '#hero' },
    { label: 'Para quien', href: '#para-quien' },
    { label: 'Features', href: '#features' },
    { label: 'Precios', href: '#precios' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contacto', href: '/recursos/contacto' },
  ];

  const [showStickyCta, setShowStickyCta] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const appDemoUrl = `${getAppUrl()}/demo`;

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
                Estado: Operativo - Cierre 2025 en marcha, T1 2026 abierto
              </Link>

              <h1 className="mt-5 text-[2.75rem] font-bold leading-[1.1] tracking-tight text-[#2361d8] sm:text-6xl">
                Emite facturas VeriFactu sin errores
                <br />
                <span className="bg-[#2361d8] bg-clip-text text-transparent">
                  y entiende tu negocio en un panel.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-lightbg-600 sm:text-lg">
                Isaak detecta tu idioma, te acompana con soporte amable y te ayuda a interpretar
                documentos, plazos y notificaciones. Te guia para subir escrituras, CIF,
                  declaraciones y arrancar 2026 con datos reales de gastos y ventas.
                </p>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                Verifactu e Isaak no sustituyen a tu gestor habitual. Te dan visibilidad diaria de
                ventas, gastos y beneficio, con impuesto estimado, para decidir en tiempo real y
                comparar o compartir resultados con tu asesoria.
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
                <button
                  onClick={() => setShowPricingModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
                  type="button"
                >
                  Calcular precio
                </button>
                <Link
                  href={appDemoUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#2361d8] bg-white px-6 py-3 font-semibold text-[#2361d8] shadow-sm transition hover:bg-[#2361d8]/10"
                >
                  Ver demo
                </Link>
              </div>
              <div className="mt-3 text-sm text-slate-600">
                <Link
                  href="/auth/signup"
                  className="font-semibold text-[#2361d8] hover:text-[#2361d8]"
                >
                  Empezar 1 mes gratis
                </Link>
              </div>

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
              Para quien es Verifactu + Isaak
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#2361d8] sm:text-4xl">
              Para quien quiere control diario, sin volverse contable
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
                <h3 className="text-sm font-semibold text-[#2361d8]">Autonomos y microempresas</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Emite facturas VeriFactu sin dudas y ve cada dia cuanto estas vendiendo y cuanto te
                queda.
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
                <h3 className="text-sm font-semibold text-[#2361d8]">
                  PYMEs que necesitan visibilidad real
                </h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Controla ventas, gastos y beneficio estimado con un panel simple, y detecta
                problemas antes de fin de mes.
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
                <h3 className="text-sm font-semibold text-[#2361d8]">
                  Empresas con asesoria que quieren ir un paso por delante
                </h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Comparte tus cifras y documentos con tu gestoria para trabajar con datos
                actualizados, no con sorpresas.
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
                Impuesto orientativo (IVA/IRPF/IS segun configuracion) para decidir con tiempo.
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                Documentos ordenados y listos para compartir con tu asesoria.
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                Menos friccion: Isaak guia, revisa y propone proximos pasos.
              </li>
            </ul>
            <p className="mt-5 text-xs text-slate-500">
              Aviso: Verifactu e Isaak no sustituyen a tu gestor o asesor fiscal. Te aportan
              visibilidad y organizacion para que puedas decidir antes y colaborar mejor con tu
              asesoria. Las cifras e impuestos mostrados son orientativos y dependen de la
              informacion disponible.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1f55c0]"
              >
                Empezar 1 mes gratis
              </Link>
              <Link
                href="/recursos/contacto"
                className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Solicitar informacion
              </Link>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <div className="text-sm font-semibold text-[#2361d8]">
              Deja de esperar al cierre de mes
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Con Isaak tienes ventas, gastos y beneficio estimado hoy. VeriFactu, al dia.
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
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-[#2361d8] sm:text-4xl">
              Ventas - Gastos = Beneficio
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-lightbg-600 sm:text-lg">
              Beneficio actualizado sin esperar al asesor. Compara con tu contabilidad real cuando
              quieras y comparte resultados con tu gestoria en un clic.
            </p>
          </div>

          <div className="mt-12">
            <DashboardMock />
          </div>
        </Container>
      </section>

      {/* Pricing */}
      <section id="precios" className="py-16">
        <Container>
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#2361d8] sm:text-4xl">
              Precio que se ajusta a tu uso real
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-lightbg-600 sm:text-lg">
              Solo mensual - 1 mes gratis - aviso antes de renovar.
            </p>

            <div className="mt-8 flex justify-center">
              <PricingCalculatorInline />
            </div>

            <p className="mx-auto mt-6 max-w-2xl text-xs text-slate-500">
              Precio orientativo. La cuota final se basa en facturas emitidas y movimientos
              procesados (si activas conciliacion bancaria). Hasta 1.000 facturas y 2.000
              movimientos; si superas estos limites ofrecemos presupuesto. IVA no incluido.
            </p>
          </div>
        </Container>
      </section>

      <section id="features">
        <FeaturesSection />
      </section>
      <ThreeSteps />
      <PideseloAIsaakSection />

      {/* Cumplimiento */}
      <section className="py-12">
        <Container>
          <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-[#2361d8] sm:text-3xl">
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
            <h3 className="text-2xl font-semibold tracking-tight text-[#2361d8] sm:text-3xl">
              Preguntas frecuentes
            </h3>
            <p className="mt-3 text-sm leading-6 text-lightbg-600 sm:text-base">
              Respuestas rapidas sobre planes, seguridad y funcionalidades.
            </p>
          </div>
          <Faq />
        </Container>
      </section>

      {/* Resources */}
      <section className="py-14 bg-[#2361d8]/5">
        <Container>
          <h3 className="text-center text-2xl font-semibold tracking-tight text-[#2361d8] sm:text-3xl">
            Recursos para dominar VeriFactu e Isaak.
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-lightbg-600 sm:text-base">
            Guias, onboarding y checklist para aplicar mejores practicas y aprovechar todo el
            potencial de la plataforma.
          </p>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <ResourceCard
              tag="Guia"
              title="Manual VeriFactu 2026"
              desc="Requisitos y checklist practico para operar con confianza este ano."
              cta="Descargar guia"
            />
            <ResourceCard
              tag="Primeros pasos"
              title="Primeros pasos con Isaak"
              desc="Aprende a emitir, registrar gastos y entender tus metricas."
              cta="Reservar plaza"
            />
            <ResourceCard
              tag="Checklist"
              title="Auditoria express"
              desc="Evalua el estado de tu facturacion y detecta riesgos."
              cta="Solicitar checklist"
            />
          </div>
        </Container>
      </section>

      <Footer />
      <StickyCtaBar show={showStickyCta} />

      {showPricingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="relative w-full max-w-4xl rounded-3xl bg-white p-4 shadow-2xl">
            <button
              onClick={() => setShowPricingModal(false)}
              className="absolute right-4 top-4 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              type="button"
            >
              Cerrar
            </button>
            <div className="mt-6">
              <PricingCalculatorInline />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




