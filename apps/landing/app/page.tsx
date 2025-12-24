"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Lock,
  Percent,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Wallet,
} from "lucide-react";
import PricingCalculator from "./components/PricingCalculator";
import Faq from "./components/Faq";

type IsaakMsg = {
  type: "ok" | "info" | "warn";
  title: string;
  body: string;
};

export default function Page() {
  const isaakMessages: IsaakMsg[] = useMemo(
    () => [
      {
        type: "ok",
        title: "Estado del negocio",
        body: "Esta semana tu beneficio va +8%. ¿Quieres ver qué clientes lo están impulsando?",
      },
      {
        type: "ok",
        title: "Gasto deducible",
        body: "He detectado un gasto de combustible. Para tu actividad, es deducible. Ya está registrado.",
      },
      {
        type: "warn",
        title: "Gasto a revisar",
        body: "Este ticket parece 'comida'. Para tu actividad puede requerir justificación. ¿Lo marcamos como 'a revisar'?",
      },
      {
        type: "ok",
        title: "Factura emitida",
        body: "Factura VF-2031 creada y validada. ¿La envío al cliente o la programo para mañana?",
      },
      {
        type: "ok",
        title: "Informe a un clic",
        body: "¿Te preparo un resumen mensual con ventas, gastos y beneficio en PDF o Excel?",
      },
    ],
    []
  );

  const [msgIndex, setMsgIndex] = useState(0);
  const [pricingModel, setPricingModel] = useState<"fija" | "porcentaje" | "hibrido">("fija");
  const [benefitTarget, setBenefitTarget] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % isaakMessages.length), 5200);
    return () => clearInterval(id);
  }, [isaakMessages.length]);

  useEffect(() => {
    // Contador animado para beneficio estimado en mockup
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
  }, []);

  const visibleMsgs = useMemo(() => {
    // Muestra 3 mensajes: el actual + 2 anteriores
    const a = (msgIndex + isaakMessages.length) % isaakMessages.length;
    const b = (msgIndex - 1 + isaakMessages.length) % isaakMessages.length;
    const c = (msgIndex - 2 + isaakMessages.length) % isaakMessages.length;
    return [isaakMessages[a], isaakMessages[b], isaakMessages[c]];
  }, [isaakMessages, msgIndex]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <TopNav />

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-slate-50 to-white" />
        <Container className="pt-14 pb-10">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Cumplimiento VeriFactu + IA para tu negocio
              </div>

              <h1 className="mt-5 text-[2.75rem] font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
                Automatiza tu facturación y
                <br />
                <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  entiende tu contabilidad en un solo panel.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                Isaak registra tus facturas y gastos por ti. Solo haz una foto o sube el documento y te explica el impacto en tu negocio:
                <strong className="font-semibold text-slate-900"> ventas, gastos y beneficio</strong>, siempre claros y al día.
              </p>

              <p className="mt-2 max-w-xl text-sm text-slate-500">
                No necesitas saber contabilidad. Isaak te guía y registra todo por ti.
              </p>

              <div className="mt-5 max-w-xl space-y-1.5 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>Facturas verificadas y controladas, sin complicaciones.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>Gastos clasificados y deducibles según tu actividad, con el apunte hecho.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>Informes y listados disponibles cuando los necesites: pídelo a Isaak.</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <PrimaryButton className="group">
                  Empezar gratis <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </PrimaryButton>
                <SecondaryButton>Solicitar demo</SecondaryButton>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <TrustBadge icon={<BadgeCheck className="h-4 w-4 text-blue-600" />} text="Cumplimiento VeriFactu" />
                <TrustBadge icon={<CheckCircle2 className="h-4 w-4 text-blue-600" />} text="Gastos deducibles guiados" />
                <TrustBadge icon={<Sparkles className="h-4 w-4 text-blue-600" />} text="Informes bajo demanda con Isaak" />
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Sin tarjeta · 30 días gratis en planes de pago · Puedes cancelar cuando quieras
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <HeroMockup visibleMsgs={visibleMsgs} benefitValue={benefitTarget} />
            </motion.div>
          </div>

          {/* Stats bar */}
          <div className="mt-10 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 sm:p-6">
            <Stat label="+350%" value="Productividad" desc="en equipos fiscales" />
            <Stat label="100%" value="Cumplimiento" desc="Real Decreto 1007/2023" />
            <Stat label="24/7" value="Asistencia" desc="y recomendaciones con Isaak" />
          </div>
        </Container>
      </section>

      {/* FEATURES */}
      <section className="py-16">
        <Container>
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Lo que ves es lo que tienes: Ventas, Gastos, Beneficio.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-7 text-slate-600 sm:text-lg">
            El dashboard muestra solo lo esencial. Informes, listados y análisis profundos están a un comando de distancia con Isaak.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
              title="Emisión sin fricción"
              bullets={["Haz una foto o sube documento", "Isaak clasifica y registra", "Validación automática incluida"]}
            />
            <FeatureCard
              icon={<BadgeCheck className="h-5 w-5 text-blue-600" />}
              title="Gastos guiados"
              bullets={["Foto del ticket → clasificado", "Deducible según tu actividad", "Apunte registrado al instante"]}
            />
            <FeatureCard
              icon={<Sparkles className="h-5 w-5 text-blue-600" />}
              title="Dashboard claro"
              bullets={["Ventas totales", "Gastos totales", "Beneficio real, siempre actualizado"]}
            />
            <FeatureCard
              icon={<Lock className="h-5 w-5 text-blue-600" />}
              title="Bajo demanda con Isaak"
              bullets={["Informes y exportaciones", "Listados por cliente, período", "Análisis profundo cuando lo necesites"]}
            />
          </div>
        </Container>
      </section>

      {/* Pídeselo a Isaak */}
      <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
        <Container>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
              <Sparkles className="h-4 w-4" />
              Pídeselo a Isaak
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              Todo lo que necesites, disponible en un comando.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Informes, listados, exportaciones, importaciones. Tú pides, Isaak hace. Sin limites, sin fricción.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <CommandExample
              command="Subo estos tickets, ¿cuáles son deducibles?"
              response="He revisado los 5 tickets. 4 son deducibles para tu actividad y ya están registrados. 1 requiere justificación adicional. ¿Lo marcamos como 'a revisar'?"
            />
            <CommandExample
              command="Prepárame el listado de gastos del trimestre"
              response="Listo. Gastos T4 2025: 8.200 € en total. He agrupado por categoría (alimentación, transporte, oficina). ¿Lo exporto a Excel o PDF?"
            />
            <CommandExample
              command="Dame el ranking de clientes por facturación"
              response="Top 5 clientes este año: López S.L. (18.500 €), Acme Corp (15.200 €), Tech Solutions (12.100 €). ¿Quieres ver márgenes o proyecciones?"
            />
            <CommandExample
              command="Crea proveedor 'X' con estos datos"
              response="Proveedor 'X' creado con CIF, datos bancarios y condiciones de pago. Ya puedes emitir compras contra él. ¿Quieres crear más?"
            />
            <CommandExample
              command="Exporta todos los productos a Excel"
              response="Archivo generado: 234 productos, con códigos, precios, categorías y stock. Descargable en 2 segundos. ¿Necesitas filtros especiales?"
            />
            <CommandExample
              command="Resumen mensual: ventas, gastos y beneficio"
              response="Diciembre 2025: Ingresos 24.500 € | Gastos 12.100 € | Beneficio estimado 12.400 € (+8% vs mes anterior). ¿Quieres desglose por cliente?"
            />
          </div>
        </Container>
      </section>

      {/* FEATURES OLD POSITION - REMOVED, NOW ABOVE */}
      {/* 3 steps */}
      <section className="py-16 bg-white">
        <Container>
          <h3 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Del envío al cobro en tres pasos.
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-slate-600 sm:text-base">
            Conecta tu flujo de facturación y deja que Isaak automatice validaciones y recordatorios.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <StepCard
              n={1}
              title="Configura Isaak"
              desc="Define tus datos, series y reglas. Conecta Drive y calendario para automatizar el orden."
              icon={<LayoutDashboard className="h-5 w-5 text-blue-600" />}
            />
            <StepCard
              n={2}
              title="Emite y valida"
              desc="Genera la factura y valida automáticamente con VeriFactu antes de enviarla."
              icon={<FileText className="h-5 w-5 text-blue-600" />}
            />
            <StepCard
              n={3}
              title="Cobra y analiza"
              desc="Isaak monitoriza el ciclo, detecta incidencias y te resume impacto en margen."
              icon={<Wallet className="h-5 w-5 text-blue-600" />}
            />
          </div>
        </Container>
      </section>

      {/* Dashboard section */}
      <section className="py-16">
        <Container>
          <h3 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Un dashboard que aprende de tu negocio.
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-slate-600 sm:text-base">
            Isaak compara tu histórico, detecta anomalías y propone acciones. Tú solo ves: ventas, gastos y beneficio.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <DashboardMock />
            <div className="rounded-3xl bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm ring-1 ring-slate-200">
              <h4 className="text-xl font-semibold">Soporte proactivo y gestión total desde cualquier dispositivo.</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Isaak ejecuta órdenes, registra documentos (OCR) y genera informes bajo demanda. Tú controlas el resultado.
              </p>

              <div className="mt-6 space-y-3">
                <InfoPill
                  title="Suscripción flexible"
                  desc="Gratis o 30 días de prueba. Elige cuota fija, % de facturación o híbrido."
                  icon={<Percent className="h-4 w-4 text-blue-600" />}
                />
                <InfoPill
                  title="Drive + Calendar"
                  desc="Importa documentos, clasifica gastos y crea recordatorios de plazos automáticamente."
                  icon={<UploadCloud className="h-4 w-4 text-blue-600" />}
                />
                <InfoPill
                  title="Crecimiento por módulos"
                  desc="Preparado para contabilidad completa y más integraciones en próximas fases."
                  icon={<CalendarClock className="h-4 w-4 text-blue-600" />}
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <PrimaryButton className="w-full sm:w-auto">
                  Probar gratis 30 días <ChevronRight className="h-4 w-4" />
                </PrimaryButton>
                <SecondaryButton className="w-full sm:w-auto">Ver ejemplo</SecondaryButton>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Próximamente: integración bancaria y contabilidad completa (sin promesas absolutas).
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Compliance */}
      <section className="py-14 bg-slate-50/60">
        <Container>
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                100% cumplimiento VeriFactu certificado.
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                Diseñado para operar con prudencia. Validación, trazabilidad y control para que tu facturación sea sólida
                desde el primer día.
              </p>

              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                <Li>Firma digital automática</Li>
                <Li>Validación y control de errores</Li>
                <Li>Registro y trazabilidad de cambios</Li>
                <Li>Copias de seguridad cifradas en la nube</Li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-2xl bg-slate-50">
                <div className="text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                    <BadgeCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-700">VERIFACTU</p>
                  <p className="mt-1 text-[11px] text-slate-500">Cumplimiento verificado</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Pricing */}
      <motion.section
        id="planes"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="bg-slate-50/60"
      >
        <PricingCalculator />
      </motion.section>

      {/* FAQ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="py-16 bg-white"
      >
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center mb-12"
          >
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Preguntas frecuentes
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Respuestas rápidas sobre planes, seguridad y funcionalidades.
            </p>
          </motion.div>
          <Faq />
        </Container>
      </motion.section>

      {/* Resources */}
      <section className="py-14 bg-slate-50/60">
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
              title="Onboarding con Isaak IA"
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

      {/* Trust Anchor Section */}
      <section className="py-12 bg-gradient-to-b from-transparent to-slate-50">
        <Container>
          <div className="text-center">
            <p className="text-sm font-semibold text-emerald-700">La garantía que buscabas</p>
            <h3 className="mt-2 text-3xl font-bold text-slate-900">
              El plan cambia.<br />Tu contabilidad no.
            </h3>
            <p className="mt-4 max-w-2xl mx-auto text-base text-slate-600">
              Todos nuestros usuarios tienen <strong>acceso garantizado a sus datos</strong> de forma permanente.
              Cambiar de plan, cancelar o cambiar de proveedor: tu información siempre es tuya.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Datos nunca se borran</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Sin bloqueos ocultos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Descargas ilimitadas</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Final CTA */}
      <section className="py-12">
        <Container>
          <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row">
            <div>
              <h4 className="text-xl font-semibold">Factura menos. Vive más.</h4>
              <p className="mt-1 text-sm text-slate-600">
                Empieza gratis y deja que Isaak haga el trabajo duro.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <PrimaryButton className="w-full sm:w-auto">Registrarse</PrimaryButton>
              <SecondaryButton className="w-full sm:w-auto">Empezar gratis 30 días</SecondaryButton>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}

/* ----------------------------- UI Blocks ----------------------------- */

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function CommandExample({ command, response }: { command: string; response: string }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white ring-4 ring-slate-100">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-slate-500">Tu comando</div>
          <p className="mt-1.5 text-sm font-medium leading-6 text-slate-900">{command}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-gradient-to-br from-blue-50 to-slate-50 p-4 ring-1 ring-slate-200/50">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600">
            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="text-xs font-semibold text-blue-900">Respuesta de Isaak</div>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-700">{response}</p>
      </div>
    </div>
  );
}

function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
      <Container className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">Verifactu</div>
              <div className="-mt-0.5 text-[11px] text-slate-500">BUSINESS</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a className="hover:text-slate-900" href="#producto">Producto</a>
            <a className="hover:text-slate-900" href="#planes">Planes</a>
            <a className="hover:text-slate-900" href="#recursos">Recursos</a>
          </nav>

          <div className="flex items-center gap-2">
            <a className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:inline-flex" href="#">
              Acceder
            </a>
            <PrimaryButton className="h-9 px-4 text-sm">Solicitar demo</PrimaryButton>
          </div>
        </div>
      </Container>
    </header>
  );
}

function HeroMockup({ visibleMsgs, benefitValue }: { visibleMsgs: IsaakMsg[]; benefitValue: number }) {
  const formattedBenefit = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(benefitValue);

  return (
    <div className="relative">
      <div className="absolute -right-6 top-10 hidden h-40 w-40 rounded-full bg-blue-100 blur-3xl lg:block" />
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* top row */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Isaak IA
          </div>
          <button className="text-xs font-medium text-blue-600 hover:text-blue-700">Conectar</button>
        </div>

        {/* messages */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-xs font-semibold text-slate-700">Estado diario del negocio</div>

          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {visibleMsgs.map((m, idx) => (
                <motion.div
                  key={`${m.title}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="mt-0.5">
                    <MsgDot type={m.type} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800">{m.title}</div>
                    <div className="mt-0.5 text-xs leading-5 text-slate-600">{m.body}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* summary row */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MiniStat
            title="Resumen"
            value={formattedBenefit}
            sub="Beneficio estimado"
            badge="Completo"
          />
          <MiniInvoice />
        </div>
      </div>
    </div>
  );
}

function MsgDot({ type }: { type: IsaakMsg["type"] }) {
  const cls =
    type === "ok"
      ? "bg-emerald-500"
      : type === "warn"
      ? "bg-amber-500"
      : "bg-blue-500";
  return <div className={`h-3.5 w-3.5 rounded-full ${cls}`} />;
}

function MiniStat({ title, value, sub, badge }: { title: string; value: string; sub: string; badge: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-700">{title}</div>
        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
          {badge}
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function MiniInvoice() {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-700">Factura VF-2031</div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
          Pagada
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
          <div className="text-[11px] text-slate-500">Cliente</div>
          <div className="mt-0.5 font-semibold text-slate-800">A. López</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
          <div className="text-[11px] text-slate-500">Importe</div>
          <div className="mt-0.5 font-semibold text-slate-800">1.250,00 €</div>
        </div>
      </div>

      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
        <CheckCircle2 className="h-4 w-4" />
        Validado por Isaak
      </div>
    </div>
  );
}

function Stat({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
      <div>
        <div className="text-lg font-semibold text-blue-700">{label}</div>
        <div className="text-xs font-semibold text-slate-800">{value}</div>
      </div>
      <div className="text-right text-xs text-slate-500">{desc}</div>
    </div>
  );
}

function FeatureCard({ icon, title, bullets }: { icon: React.ReactNode; title: string; bullets: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
          {icon}
        </div>
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <button className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
        Ver más <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function StepCard({ n, title, desc, icon }: { n: number; title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
          {icon}
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
          {n}
        </div>
      </div>
      <div className="mt-4 text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{desc}</div>
    </div>
  );
}

function DashboardMock() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Isaak Control Center</div>
        <span className="rounded-full bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
          Suscripción Business Plus
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Ventas del mes" value="48.230 €" sub="↑ +12%" />
        <KpiCard label="Gastos del mes" value="36.900 €" sub="↑ +7%" />
        <KpiCard label="Beneficio" value="12.410 €" sub="↑ +8%" />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold text-slate-700">Isaak</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            He detectado un aumento de gastos en proveedores. ¿Quieres que identifique los que más afectan al margen?
          </p>

          <div className="mt-3 flex gap-2">
            <button className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
              Analizar ahora
            </button>
            <button className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              Más tarde
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-700">Actividad reciente</div>
          <div className="mt-3 space-y-2">
            <ActivityItem icon={<FileText className="h-4 w-4 text-blue-600" />} text="Factura VF-2031 emitida y validada" />
            <ActivityItem icon={<UploadCloud className="h-4 w-4 text-blue-600" />} text="3 tickets importados desde Drive (OCR)" />
            <ActivityItem icon={<CalendarClock className="h-4 w-4 text-blue-600" />} text="Recordatorio creado: plazo fiscal en 5 días" />
            <ActivityItem icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} text="Checklist VeriFactu: todo en orden" />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function ActivityItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      {icon}
      <span className="text-xs text-slate-700">{text}</span>
    </div>
  );
}

function InfoPill({ title, desc, icon }: { title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-sm leading-6 text-slate-600">{desc}</div>
      </div>
    </div>
  );
}

function PriceCard({
  name,
  price,
  tagline,
  bullets,
  cta,
  accent,
}: {
  name: string;
  price: string;
  tagline: string;
  bullets: string[];
  cta: string;
  accent: "primary" | "muted";
}) {
  const isPrimary = accent === "primary";
  return (
    <div
      className={[
        "rounded-2xl border bg-white p-6 shadow-sm",
        isPrimary ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-200",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{name}</div>
        {isPrimary ? (
          <span className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white">Recomendado</span>
        ) : (
          <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
            Flexible
          </span>
        )}
      </div>

      <div className="mt-4 text-3xl font-semibold">{price}</div>
      <div className="mt-1 text-sm text-slate-600">{tagline}</div>

      <ul className="mt-5 space-y-2 text-sm text-slate-600">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <button
        className={[
          "mt-6 w-full rounded-full px-4 py-2.5 text-sm font-semibold transition",
          isPrimary
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-slate-900 text-white hover:bg-slate-800",
        ].join(" ")}
      >
        {cta}
      </button>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="text-center text-[11px] text-slate-500">
          {isPrimary ? "30 días gratis incluidos" : "Gratis o prueba según plan"}
        </p>
        <p className="mt-1.5 text-center text-[11px] font-medium text-emerald-700">
          ✓ Acceso permanente a tus datos
        </p>
      </div>
    </div>
  );
}

function ResourceCard({ tag, title, desc, cta }: { tag: string; title: string; desc: string; cta: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="inline-flex rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
        {tag}
      </div>
      <div className="mt-4 text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{desc}</div>
      <button className="mt-4 inline-flex items-center gap-1 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
        {cta} <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
      <span>{children}</span>
    </li>
  );
}

function Footer() {
  return (
    <footer className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-slate-100">
      {/* Decorative gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <Container className="py-12 relative z-10">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold">Verifactu</div>
                <div className="text-[11px] text-blue-300">BUSINESS</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Automatiza tu facturación con cumplimiento y control total.
            </p>
            <div className="mt-4 flex gap-3">
              <a href="#" className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 transition">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 7-7 7-7"/></svg>
              </a>
              <a href="#" className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 transition">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </a>
              <a href="#" className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 transition">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            </div>
          </div>

          <FooterCol
            title="Producto"
            links={["Resumen", "Plataforma", "Automatización", "Integración API"]}
          />
          <FooterCol
            title="VeriFactu"
            links={["Qué es", "Planes y precios", "Soporte", "Estado del servicio"]}
          />
          <FooterCol
            title="Recursos"
            links={["Guías y webinars", "Checklist", "Blog", "Contacto"]}
          />
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} Verifactu Business. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-blue-300 transition">Política de privacidad</a>
              <a href="#" className="hover:text-blue-300 transition">Términos de servicio</a>
              <a href="#" className="hover:text-blue-300 transition">Cookies</a>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <div className="text-sm font-semibold text-white">
        {title}
      </div>
      <ul className="mt-3 space-y-2 text-sm text-slate-300">
        {links.map((l) => (
          <li key={l}>
            <a className="hover:text-blue-300 transition" href="#">
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Container({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

function PrimaryButton({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-blue-800 ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 ${className}`}
    >
      {children}
    </button>
  );
}

