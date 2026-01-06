"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import Header from "./components/Header";
import Faq from "./components/Faq";

import { ISAAK_MESSAGES, PRICING_PLANS } from "./lib/home/data";
import {
  ComplianceBadge,
  Container,
  DashboardMock,
  FeaturesSection,
  Footer,
  HeroMockup,
  PideseloAIsaakSection,
  PriceDisplay,
  PrimaryButton,
  ResourceCard,
  SecondaryButton,
  StickyCtaBar,
  ThreeSteps,
  TrustBadge,
} from "./lib/home/ui";

export default function Page() {
  const isaakMessages = ISAAK_MESSAGES;

  const [msgIndex, setMsgIndex] = useState(0);
  const [benefitTarget, setBenefitTarget] = useState(0);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [isYearlyBilling, setIsYearlyBilling] = useState(false);
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
      <Header />

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-blue-100 via-blue-50 to-white" />
        <Container className="pt-14 pb-10">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Cumplimiento VeriFactu con Isaak
              </div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                Estado: Operativo · Última sync VeriFactu hace 3 min
              </div>

              <h1 className="mt-5 text-[2.75rem] font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
                Tu contabilidad, siempre
                <br />
                <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  bajo control. Sin esfuerzo.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-700 sm:text-lg">
                Isaak organiza facturas y gastos, y te muestra lo esencial: ventas, gastos y beneficio. Tú decides el ritmo.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <PrimaryButton>
                  Probar gratis <span aria-hidden>→</span>
                </PrimaryButton>
                <SecondaryButton href="/demo">Ver demo</SecondaryButton>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                <TrustBadge icon={<Sparkles className="h-4 w-4 text-blue-600" />} text="Isaak incluido" />
                <TrustBadge icon={<ShieldCheck className="h-4 w-4 text-blue-600" />} text="Cumplimiento" />
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
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Cumple con calma.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                VeriFactu no debería darte miedo. Isaak te guía, valida y te avisa cuando algo necesita revisión.
              </p>
            </div>
            <ComplianceBadge />
          </div>
        </Container>
      </section>

      <ThreeSteps />
      <FeaturesSection />
      <PideseloAIsaakSection />

      {/* Dashboard preview */}
      <section className="py-16 bg-gradient-to-b from-blue-50 via-blue-100 to-white">
        <Container>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
              <Sparkles className="h-4 w-4" />
              Dashboard
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Ventas – Gastos = Beneficio</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Lo esencial, siempre visible. El detalle aparece solo cuando lo pides.
            </p>
          </div>

          <div className="mt-12">
            <DashboardMock />
          </div>
        </Container>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <Container>
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Planes y precios</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Empieza gratis. Cambia de plan cuando lo necesites.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-50 p-1 ring-1 ring-slate-200">
              <button
                type="button"
                onClick={() => setIsYearlyBilling(false)}
                className={[
                  "rounded-full px-4 py-2 text-xs font-semibold transition",
                  !isYearlyBilling ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900",
                ].join(" ")}
              >
                Mensual
              </button>
              <button
                type="button"
                onClick={() => setIsYearlyBilling(true)}
                className={[
                  "rounded-full px-4 py-2 text-xs font-semibold transition",
                  isYearlyBilling ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900",
                ].join(" ")}
              >
                Anual
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-4">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={[
                  "relative rounded-2xl border bg-white p-6 shadow-sm",
                  plan.highlight ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-200",
                ].join(" ")}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">Más popular</span>
                  </div>
                )}

                <div>
                  <div className="text-lg font-semibold text-slate-900">{plan.name}</div>
                  <div className="mt-1 text-sm text-slate-500">{plan.users}</div>
                  {plan.highlight && (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                      Sin % de facturación
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <PriceDisplay
                    price={isYearlyBilling ? plan.priceYearly : plan.priceMonthly}
                    isYearly={isYearlyBilling}
                  />
                  <div className="mt-2 inline-flex items-center justify-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                    Prueba gratuita 30 días · sin tarjeta · sin compromiso
                  </div>
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={isYearlyBilling ? (plan.checkoutYearly ?? "#") : (plan.checkoutMonthly ?? "#")}
                  className={[
                    "mt-6 block w-full rounded-full px-4 py-2.5 text-sm font-semibold text-center transition",
                    plan.highlight ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-100 text-slate-900 hover:bg-slate-200",
                  ].join(" ")}
                >
                  {plan.priceMonthly === null ? "Contactar" : "Empezar prueba gratuita"}
                </a>

                <div className="mt-3 text-center text-xs text-slate-500">✓ Acceso permanente a tus datos</div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center text-sm text-slate-500">
            Todos los planes incluyen activación VeriFactu y soporte de onboarding.
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gradient-to-b from-blue-50 via-blue-100 to-white">
        <Container>
          <div className="text-center mb-12">
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">Preguntas frecuentes</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Respuestas rápidas sobre planes, seguridad y funcionalidades.
            </p>
          </div>
          <Faq />
        </Container>
      </section>

      {/* Resources */}
      <section className="py-14 bg-gradient-to-b from-blue-50 via-blue-100 to-white">
        <Container>
          <h3 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Recursos para dominar VeriFactu e Isaak.
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-slate-600 sm:text-base">
            Guías, onboarding y checklist para aplicar mejores prácticas y aprovechar todo el potencial de la plataforma.
          </p>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <ResourceCard
              tag="Guía"
              title="Manual VeriFactu 2025"
              desc="Requisitos y checklist práctico para operar con confianza."
              cta="Descargar guía"
            />
            <ResourceCard
              tag="Primeros pasos"
              title="Primeros pasos con Isaak"
              desc="Aprende a emitir, registrar gastos y entender tus métricas."
              cta="Reservar plaza"
            />
            <ResourceCard
              tag="Checklist"
              title="Auditoría express"
              desc="Evalúa el estado de tu facturación y detecta riesgos."
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


