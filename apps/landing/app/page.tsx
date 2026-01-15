"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import Header from "./components/Header";
import Faq from "./components/Faq";
import PricingCalculatorInline from "./components/PricingCalculatorInline";

import { ISAAK_MESSAGES } from "./lib/home/data";
import {
  ComplianceBadge,
  Container,
  DashboardMock,
  FeaturesSection,
  Footer,
  HeroMockup,
  PideseloAIsaakSection,
  PrimaryButton,
  ResourceCard,
  SecondaryButton,
  StickyCtaBar,
  ThreeSteps,
  TrustBadge,
} from "./lib/home/ui";

export default function Page() {
  const isaakMessages = ISAAK_MESSAGES;
  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Precios", href: "#precios" },
    { label: "FAQ", href: "#faq" },
  ];

  const [msgIndex, setMsgIndex] = useState(0);
  const [benefitTarget, setBenefitTarget] = useState(0);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % isaakMessages.length), 5200);
    return () => clearInterval(id);
  }, [isaakMessages.length, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setBenefitTarget(12450);
      return;
    }
    let frame = 0;
    const target = 12450;
    const duration = 1200;
    const increment = target / (duration / 16);
    const animate = () => {
      frame++;
      setBenefitTarget((prev) => {
        const next = prev + increment;
        return next >= target ? target : next;
      });
      if (frame * 16 < duration) requestAnimationFrame(animate);
    };
    animate();
  }, [prefersReducedMotion]);

  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const visibleMsgs = useMemo(() => {
    const a = (msgIndex + isaakMessages.length) % isaakMessages.length;
    const b = (msgIndex - 1 + isaakMessages.length) % isaakMessages.length;
    const c = (msgIndex - 2 + isaakMessages.length) % isaakMessages.length;
    return [isaakMessages[a], isaakMessages[b], isaakMessages[c]];
  }, [isaakMessages, msgIndex]);

  const benefitValue = Math.round(benefitTarget);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      {/* HERO */}
      <section id="hero" className="relative">
        <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-sky-50/70 via-blue-50/40 to-white" />
        <Container className="pt-14 pb-10">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                <ShieldCheck className="h-4 w-4 text-[#0080F0]" />
                Cumplimiento VeriFactu con Isaak
              </div>
              <Link
                href="/verifactu/estado"
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-sky-50/70 px-3 py-1 text-[11px] font-semibold text-[#0080F0] ring-1 ring-[#0080F0]/15 hover:text-[#0060F0]"
              >
                <span className="h-2 w-2 rounded-full bg-[#0080F0]" aria-hidden="true" />
                Estado: Operativo · Última sincronización VeriFactu hace 3 min
              </Link>

              <h1 className="mt-5 text-[2.75rem] font-bold leading-[1.1] tracking-tight text-[#002060] sm:text-6xl">
                Emite facturas VeriFactu sin errores
                <br />
                <span className="bg-gradient-to-r from-[#0060F0] to-[#20B0F0] bg-clip-text text-transparent">
                  y entiende tu negocio en un panel.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-lightbg-600 sm:text-lg">
  Isaak detecta tu idioma, te acompaña en un tono cercano y te ayuda a entender
  documentos, plazos y notificaciones. Resume ventas, gastos y beneficio en tiempo real
  para que tomes decisiones con calma.
</p>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                Fuente oficial:{" "}
                <a
                  href="https://www.agenciatributaria.es/AEAT.internet/Inicio/_Segmentos_/Empresas_y_profesionales/Empresas/Impuesto_sobre_Sociedades/VeriFactu.shtml"
                  className="font-semibold text-[#0060F0] hover:text-[#0080F0]"
                  target="_blank"
                  rel="noreferrer"
                >
                  Agencia Tributaria (AEAT)
                </a>{" "}
                Â· Te obliga a emitir y registrar facturas con trazabilidad e integridad.
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-6 py-3 font-semibold text-white shadow-lg transition hover:from-[#0056D6] hover:to-[#1AA3DB]"
                >
                  Empezar 1 mes gratis
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0060F0] bg-white px-6 py-3 font-semibold text-[#0060F0] shadow-sm transition hover:bg-[#0060F0]/10"
                >
                  Ver demo (2 min)
                </Link>
              </div>
              <div className="mt-3 text-sm text-slate-600">
                <button
                  onClick={() => {
                    const el = document.getElementById("precios");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="font-semibold text-[#0060F0] hover:text-[#0080F0]"
                  type="button"
                >
                  Calcula tu precio
                </button>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                <TrustBadge icon={<Sparkles className="h-4 w-4 text-[#0080F0]" />} text="Isaak incluido" />
                <TrustBadge icon={<ShieldCheck className="h-4 w-4 text-[#0080F0]" />} text="Cumplimiento" />
                <TrustBadge icon={<Check className="h-4 w-4 text-emerald-600" />} text="Datos bajo control" />
              </div>
            </motion.div>

            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            >
              <HeroMockup visibleMsgs={visibleMsgs} benefitValue={benefitValue} />
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Cumplimiento */}
      <section className="py-12">
        <Container>
          <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
            <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#002060] sm:text-3xl">
              Cumple con calma.
            </h2>
            <p className="mt-3 text-sm leading-6 text-lightbg-600 sm:text-base">
  VeriFactu no debería darte miedo. Isaak te guía, valida y te avisa cuando algo necesita revisión.
</p>
            </div>
            <ComplianceBadge />
          </div>
        </Container>
      </section>

      <ThreeSteps />
      <section id="features">
        <FeaturesSection />
      </section>
      <PideseloAIsaakSection />

      {/* Dashboard preview */}
      <section id="faq" className="py-16 bg-gradient-to-b from-sky-50/70 via-blue-50/40 to-white">
        <Container>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50/70 px-4 py-1.5 text-sm font-semibold text-[#0080F0] ring-1 ring-[#0080F0]/15">
              <Sparkles className="h-4 w-4" />
              Dashboard
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-[#002060] sm:text-4xl">
              Ventas - Gastos = Beneficio
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-lightbg-600 sm:text-lg">
              Lo esencial, siempre visible. El detalle aparece solo cuando lo pides.
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
            <h2 className="text-3xl font-bold tracking-tight text-[#002060] sm:text-4xl">
              Precio que se ajusta a tu uso real
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-lightbg-600 sm:text-lg">
              Solo mensual Â· 1 mes gratis Â· aviso antes de renovar.
            </p>

            <div className="mt-8 flex justify-center">
              <PricingCalculatorInline />
            </div>

            <p className="mx-auto mt-6 max-w-2xl text-xs text-slate-500">
              Precio orientativo. La cuota final se basa en facturas emitidas y movimientos procesados (si activas
              conciliaciÃ³n bancaria). Hasta 1.000 facturas y 2.000 movimientos; si superas estos lÃ­mites ofrecemos
              presupuesto. IVA no incluido.
            </p>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section id="dashboard" className="py-16 bg-gradient-to-b from-sky-50/70 via-blue-50/40 to-white">
        <Container>
          <div className="text-center mb-12">
            <h3 className="text-2xl font-semibold tracking-tight text-[#002060] sm:text-3xl">
              Preguntas frecuentes
            </h3>
            <p className="mt-3 text-sm leading-6 text-lightbg-600 sm:text-base">
  VeriFactu no debería darte miedo. Isaak te guía, valida y te avisa cuando algo necesita revisión.
</p>
          </div>
          <Faq />
        </Container>
      </section>

      {/* Resources */}
      <section className="py-14 bg-gradient-to-b from-sky-50/70 via-blue-50/40 to-white">
        <Container>
          <h3 className="text-center text-2xl font-semibold tracking-tight text-[#002060] sm:text-3xl">
            Recursos para dominar VeriFactu e Isaak.
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-lightbg-600 sm:text-base">
            GuÃ­as, onboarding y checklist para aplicar mejores prÃ¡cticas y aprovechar todo el potencial de la plataforma.
          </p>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <ResourceCard
              tag="GuÃ­a"
              title="Manual VeriFactu 2025"
              desc="Requisitos y checklist prÃ¡ctico para operar con confianza."
              cta="Descargar guÃ­a"
            />
            <ResourceCard
              tag="Primeros pasos"
              title="Primeros pasos con Isaak"
              desc="Aprende a emitir, registrar gastos y entender tus mÃ©tricas."
              cta="Reservar plaza"
            />
            <ResourceCard
              tag="Checklist"
              title="AuditorÃ­a express"
              desc="EvalÃºa el estado de tu facturaciÃ³n y detecta riesgos."
              cta="Solicitar checklist"
            />
          </div>
        </Container>
      </section>

      <Footer />
      <StickyCtaBar show={showStickyCta} />
    </div>
  );
}







