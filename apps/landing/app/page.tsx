"use client";

/**
 * Landing Page - Verifactu.business
 * v1.0.4 - Fixed UTF-8 encoding and verified deployment
 * 
 * Improvements:
 * - Removed technical jargon per Isaak principles
 * - Added accessibility support (prefers-reduced-motion)
 * - Space Grotesk font for branding consistency
 * - All special characters properly encoded: ·, ó, á, é, ú, ñ, €, 📷, 🧠, 📈
 */
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Lock,
  Percent,
  User,
  Building2,
  Briefcase,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Wallet,
} from "lucide-react";
import Header from "./components/Header";
import BrandLogo from "./components/BrandLogo";
import Faq from "./components/Faq";

type IsaakMsg = {
  type: "ok" | "info" | "warn";
  title: string;
  body: string;
};

type Plan = {
  name: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  users: string;
  features: string[];
  highlight?: boolean;
  checkoutMonthly?: string;
  checkoutYearly?: string;
};

const PRICING_PLANS: Plan[] = [
  {
    name: "Gratis",
    priceMonthly: 0,
    priceYearly: 0,
    users: "1 empresa · 1 usuario",
    features: [
      "Facturación b├ísica",
      "Hasta 20 documentos/mes",
      "Chat Isaak limitado",
      "Dashboard esencial",
    ],
    checkoutMonthly: "/api/checkout?plan=free",
    checkoutYearly: "/api/checkout?plan=free",
  },
  {
    name: "Profesional",
    priceMonthly: 29,
    priceYearly: 290,
    users: "1 empresa · usuarios ilimitados",
    features: [
      "Facturación VeriFactu completa",
      "Gastos ilimitados con reconocimiento autom├ítico",
      "Integración bancaria (próximamente)",
      "Calendario fiscal",
      "Chat Isaak completo",
      "Informes bajo demanda",
    ],
    highlight: true,
    checkoutMonthly: "/api/checkout?plan=pro-monthly",
    checkoutYearly: "/api/checkout?plan=pro-yearly",
  },
  {
    name: "Business",
    priceMonthly: 69,
    priceYearly: 690,
    users: "Multiempresa (hasta 3)",
    features: [
      "Todo en Profesional",
      "Varias cuentas bancarias (próximamente)",
      "Conciliación avanzada (próximamente)",
      "Libros contables",
      "Dashboard financiero",
      "Soporte prioritario",
    ],
    checkoutMonthly: "/api/checkout?plan=business-monthly",
    checkoutYearly: "/api/checkout?plan=business-yearly",
  },
  {
    name: "Enterprise",
    priceMonthly: null,
    priceYearly: null,
    users: "Multiempresa ilimitada",
    features: [
      "Configuración personalizada",
      "Integración completa con tu sistema",
      "Firma electrónica",
      "Flujos autom├íticos",
      "SLA garantizado",
      "Equipo dedicado",
    ],
    checkoutMonthly: "/api/checkout?plan=enterprise",
    checkoutYearly: "/api/checkout?plan=enterprise",
  },
];

function PriceDisplay({ price, isYearly }: { price: number | null; isYearly: boolean }) {
  if (price === null) {
    return (
      <div>
        <div className="text-2xl font-bold text-slate-900">Personalizado</div>
        <div className="text-sm text-slate-500">A medida</div>
      </div>
    );
  }
  if (price === 0) {
    return (
      <div>
        <div className="text-4xl font-bold text-slate-900">Gratis</div>
        <div className="text-sm text-slate-500">Siempre</div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-4xl font-bold text-slate-900">€{price}</div>
      <div className="text-sm text-slate-500">{isYearly ? "/año" : "/mes"}</div>
    </div>
  );
}

export default function Page() {
  const isaakMessages: IsaakMsg[] = useMemo(
    () => [
      {
        type: "ok",
        title: "Estado del negocio",
        body: "Esta semana tu beneficio va +8%. ¿Quieres ver qué clientes lo est├ín impulsando?",
      },
      {
        type: "ok",
        title: "Gasto deducible",
        body: "He detectado un gasto de combustible. Para tu actividad, es deducible. Ya est├í registrado.",
      },
      {
        type: "warn",
        title: "Gasto a revisar",
        body: "Este ticket parece 'comida'. Para tu actividad puede requerir justificación. ¿Lo marcamos como 'a revisar'?",
      },
      {
        type: "ok",
        title: "Factura emitida",
        body: "Factura VF-2031 creada y validada. ¿La enváo al cliente o la programo para mañana?",
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
  const [benefitTarget, setBenefitTarget] = useState(0);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [isYearlyBilling, setIsYearlyBilling] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Detectar preferencia de movimiento reducido
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return; // Pausar rotación si el usuario prefiere movimiento reducido
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % isaakMessages.length), 5200);
    return () => clearInterval(id);
  }, [isaakMessages.length, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      // Mostrar valor final inmediatamente
      setBenefitTarget(12450);
      return;
    }
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

  useEffect(() => {
    const onScroll = () => {
      setShowStickyCta(window.scrollY > 320);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
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
                Cumplimiento VeriFactu + IA para tu negocio
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

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                Isaak se encarga de tus facturas, gastos y cumplimiento fiscal para que tú te centres en tu negocio. Solo haz una foto o sube el documento.
              </p>

              <p className="mt-3 max-w-xl text-sm text-slate-500">
                Cumple con Verifactu y normativa fiscal española desde el primer dáa.
              </p>

              <div className="mt-6 max-w-xl space-y-2.5 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <span className="text-xl">📷</span>
                  <span>Haces una foto a una factura o ticket</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">🧠</span>
                  <span>Isaak decide si el gasto es deducible según tu actividad</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">📈</span>
                  <span>Tu beneficio se actualiza autom├íticamente</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">🔔</span>
                  <span>Recibes avisos antes de cualquier plazo importante</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <PrimaryButton className="group">
                  Empezar gratis <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </PrimaryButton>
                <SecondaryButton>Ver cómo funciona</SecondaryButton>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <TrustBadge icon={<BadgeCheck className="h-4 w-4 text-blue-600" />} text="Cumplimiento VeriFactu" />
                <TrustBadge icon={<CheckCircle2 className="h-4 w-4 text-blue-600" />} text="Gastos deducibles guiados" />
                <TrustBadge icon={<Sparkles className="h-4 w-4 text-blue-600" />} text="Informes bajo demanda con Isaak" />
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Sin tarjeta · 30 dáas gratis en planes de pago · Puedes cancelar cuando quieras
              </p>
            </motion.div>

            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
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

      {/* Para quién es */}
      <section className="py-12">
        <Container>
          <div className="text-center">
            <p className="text-sm font-semibold text-blue-700">Para quién es</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Te encaja si eres...</h3>
            <p className="mt-3 max-w-2xl mx-auto text-sm leading-6 text-slate-600 sm:text-base">
              Segmentamos el acompañamiento según tu perfil: foco en simplicidad para autónomos, control para pymes y orden fiscal para gestoráas.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-100"><User className="h-4 w-4" />Autónomos</div>
              <h4 className="mt-3 text-lg font-semibold text-slate-900">Menos papeleo</h4>
              <p className="text-xs font-semibold text-slate-500">Simplifica capturas y presentación</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Haz foto a tickets, Isaak los clasifica y te recuerda plazos. Facturas VeriFactu listas en segundos.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-100"><Building2 className="h-4 w-4" />Pymes</div>
              <h4 className="mt-3 text-lg font-semibold text-slate-900">Visibilidad y control</h4>
              <p className="text-xs font-semibold text-slate-500">Equipo alineado y datos auditables</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Dashboard con ventas, gastos y beneficio real. Roles por equipo y evidencias listas para auditoráa.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-100"><Briefcase className="h-4 w-4" />Gestoráas</div>
              <h4 className="mt-3 text-lg font-semibold text-slate-900">Orden fiscal</h4>
              <p className="text-xs font-semibold text-slate-500">Evidencias listas para clientes</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Importa documentación, conserva todas las pruebas VeriFactu, y genera libros o informes bajo demanda.</p>
            </div>
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
            El dashboard muestra solo lo esencial. Informes, listados y an├ílisis profundos est├ín a un comando de distancia con Isaak.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
              title="Emisión sin fricción"
              bullets={["Haz una foto o sube documento", "Isaak clasifica y registra", "Validación autom├ítica incluida"]}
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
              bullets={["Informes y exportaciones", "Listados por cliente, peráodo", "An├ílisis profundo cuando lo necesites"]}
            />
          </div>
        </Container>
      </section>

      {/* Pádeselo a Isaak */}
      <section className="py-16 bg-gradient-to-b from-blue-50 via-blue-100 to-white">
        <Container>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
              <Sparkles className="h-4 w-4" />
              Pádeselo a Isaak
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
              command="Subo estos tickets, ¿cu├íles son deducibles?"
              response="He revisado los 5 tickets. 4 son deducibles para tu actividad y ya est├ín registrados. 1 requiere justificación adicional. ¿Lo marcamos como 'a revisar'?"
            />
            <CommandExample
              command="Prep├írame el listado de gastos del trimestre"
              response="Listo. Gastos T4 2025: 8.200 € en total. He agrupado por categoráa (alimentación, transporte, oficina). ¿Lo exporto a Excel o PDF?"
            />
            <CommandExample
              command="Dame el ranking de clientes por facturación"
              response="Top 5 clientes este año: López S.L. (18.500 €), Acme Corp (15.200 €), Tech Solutions (12.100 €). ¿Quieres ver m├írgenes o proyecciones?"
            />
            <CommandExample
              command="Crea proveedor 'X' con estos datos"
              response="Proveedor 'X' creado con CIF, datos bancarios y condiciones de pago. Ya puedes emitir compras contra él. ¿Quieres crear m├ís?"
            />
            <CommandExample
              command="Exporta todos los productos a Excel"
              response="Archivo generado: 234 productos, con códigos, precios, categoráas y stock. Descargable en 2 segundos. ¿Necesitas filtros especiales?"
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
      <section className="py-16 bg-gradient-to-b from-blue-50 via-blue-100 to-white">
        <Container>
          <h3 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Del enváo al cobro en tres pasos.
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
              desc="Genera la factura y valida autom├íticamente con VeriFactu antes de enviarla."
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
            Isaak compara tu histórico, detecta anomaláas y propone acciones. Tú solo ves: ventas, gastos y beneficio.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <DashboardMock />
            <div className="rounded-3xl bg-gradient-to-b from-blue-50 via-blue-100 to-white p-6 shadow-sm ring-1 ring-slate-200">
              <h4 className="text-xl font-semibold">Soporte proactivo y gestión total desde cualquier dispositivo.</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Isaak ejecuta órdenes, registra documentos (OCR) y genera informes bajo demanda. Tú controlas el resultado.
              </p>

              <div className="mt-6 space-y-3">
                <InfoPill
                  title="Suscripción clara"
                  desc="Gratis o 30 dáas de prueba. Cuota fija y sin sorpresas ni variables sobre facturación."
                  icon={<Percent className="h-4 w-4 text-blue-600" />}
                />
                <InfoPill
                  title="Drive + Calendar"
                  desc="Importa documentos, clasifica gastos y crea recordatorios de plazos autom├íticamente."
                  icon={<UploadCloud className="h-4 w-4 text-blue-600" />}
                />
                <InfoPill
                  title="Crecimiento por módulos"
                  desc="Preparado para contabilidad completa y m├ís integraciones en próximas fases."
                  icon={<CalendarClock className="h-4 w-4 text-blue-600" />}
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <PrimaryButton className="w-full sm:w-auto">
                  Probar gratis 30 dáas <ChevronRight className="h-4 w-4" />
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
      <section className="py-14 bg-gradient-to-b from-blue-50 via-blue-100 to-white">
        <Container>
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Un panel claro donde siempre sabes cómo est├ís.
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                Tu información no se pierde nunca, aunque cambies de plan. Isaak es tu gestor fiscal digital: revisa facturas, clasifica gastos, te avisa de plazos y te explica tu situación financiera en lenguaje claro.
              </p>

              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                <Li>Siempre acceso a tus datos</Li>
                <Li>Exportable cuando quieras</Li>
                <Li>Sin bloqueos ni letra pequeña</Li>
                <Li>Respaldos autom├íticos y cifrados en la nube</Li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mx-auto flex flex-col items-center justify-center">
                <div className="relative w-full max-w-[280px]">
                  <Image
                    src="/brand/logo-aeat-verifactu.jpg"
                    alt="VeriFactu - Agencia Tributaria"
                    width={280}
                    height={100}
                    className="w-full h-auto"
                    priority
                  />
                </div>
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 ring-1 ring-green-200">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                      <BadgeCheck className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-green-700">Cumplimiento Certificado</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Sistema homologado según normativa de la Agencia Tributaria
                  </p>
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
        className="bg-gradient-to-b from-blue-50 via-blue-100 to-white"
      >
        <Container className="py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Empieza gratis. Planes claros para crecer.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              <strong>Todos los planes incluyen:</strong> Acceso permanente a tus datos · Prueba gratuita de 30 dáas · Posibilidad de cambiar o pausar sin perder información
            </p>
          </div>

          {/* Toggle Mensual / Anual */}
          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center rounded-full bg-slate-100 p-1 shadow-sm">
              <button
                onClick={() => setIsYearlyBilling(false)}
                className={[
                  "rounded-full px-5 py-2 text-sm font-semibold transition",
                  !isYearlyBilling
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-600 hover:text-slate-900",
                ].join(" ")}
              >
                Mensual
              </button>
              <button
                onClick={() => setIsYearlyBilling(true)}
                className={[
                  "rounded-full px-5 py-2 text-sm font-semibold transition",
                  isYearlyBilling
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-600 hover:text-slate-900",
                ].join(" ")}
              >
                Anual
                <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  -16%
                </span>
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PRICING_PLANS.map((plan, idx) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className={[
                  "relative flex flex-col rounded-2xl border p-6 shadow-sm transition",
                  plan.highlight
                    ? "border-blue-200 bg-white ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:shadow-md",
                ].join(" ")}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                      M├ís popular
                    </span>
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
                  <PriceDisplay price={isYearlyBilling ? plan.priceYearly : plan.priceMonthly} isYearly={isYearlyBilling} />
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
                    "mt-6 w-full rounded-full px-4 py-2.5 text-sm font-semibold text-center transition",
                    plan.highlight
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-slate-100 text-slate-900 hover:bg-slate-200",
                  ].join(" ")}
                >
                  {plan.priceMonthly === null ? "Contactar" : "Ir al checkout"}
                </a>
                
                <div className="mt-3 text-center text-xs text-slate-500">
                  ✓ Acceso permanente a tus datos
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center text-sm text-slate-500">
            Todos los planes incluyen activación VeriFactu y soporte de onboarding.
          </div>
        </Container>
      </motion.section>

      {/* FAQ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="py-16 bg-gradient-to-b from-blue-50 via-blue-100 to-white"
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
              Respuestas r├ípidas sobre planes, seguridad y funcionalidades.
            </p>
          </motion.div>
          <Faq />
        </Container>
      </motion.section>

      {/* Resources */}
      <section className="py-14 bg-gradient-to-b from-blue-50 via-blue-100 to-white">
        <Container>
          <h3 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Recursos para dominar VeriFactu e Isaak.
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-slate-600 sm:text-base">
            Guáas, onboarding y checklist para aplicar mejores pr├ícticas y aprovechar todo el potencial de la plataforma.
          </p>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <ResourceCard
              tag="Guáa"
              title="Manual VeriFactu 2025"
              desc="Requisitos y checklist pr├íctico para operar con confianza."
              cta="Descargar guáa"
            />
            <ResourceCard
              tag="Primeros pasos"
              title="Onboarding con Isaak IA"
              desc="Aprende a emitir, registrar gastos y entender tus métricas."
              cta="Reservar plaza"
            />
            <ResourceCard
              tag="Checklist"
              title="Auditoráa express"
              desc="Evalúa el estado de tu facturación y detecta riesgos."
              cta="Solicitar checklist"
            />
          </div>
        </Container>
      </section>

      {/* Trust Anchor Section */}
      <section className="py-12 bg-gradient-to-b from-blue-50 via-blue-100 to-white">
        <Container>
          <div className="text-center">
            <p className="text-sm font-semibold text-emerald-700">La garantáa que buscabas</p>
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
          <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 via-blue-100 to-white p-6 shadow-sm sm:flex-row">
            <div>
              <h4 className="text-xl font-semibold">Factura menos. Vive m├ís.</h4>
              <p className="mt-1 text-sm text-slate-600">
                Empieza gratis y deja que Isaak haga el trabajo duro.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <PrimaryButton className="w-full sm:w-auto">Registrarse</PrimaryButton>
              <SecondaryButton className="w-full sm:w-auto">Empezar gratis 30 dáas</SecondaryButton>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
      <StickyCtaBar show={showStickyCta} />
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

function HeroMockup({ visibleMsgs, benefitValue }: { visibleMsgs: IsaakMsg[]; benefitValue: number }) {
  const formattedBenefit = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(benefitValue);

  const heroLog = [
    { title: "Factura VF-2031", desc: "Validada y enviada al cliente" },
    { title: "Ticket combustible", desc: "Marcado deducible y registrado" },
    { title: "Sync VeriFactu", desc: "Última validación hace 3 min" },
  ];

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

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-xs font-semibold text-slate-700">Registro reciente</div>
          <div className="space-y-2">
            {heroLog.map((item) => (
              <div key={item.title} className="flex justify-between rounded-xl bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
                <span className="font-semibold text-slate-800">{item.title}</span>
                <span className="text-slate-500">{item.desc}</span>
              </div>
            ))}
          </div>
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
        Ver m├ís <ChevronRight className="h-4 w-4" />
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
            He detectado un aumento de gastos en proveedores. ¿Quieres que identifique los que m├ís afectan al margen?
          </p>

          <div className="mt-3 flex gap-2">
            <button className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
              Analizar ahora
            </button>
            <button className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              M├ís tarde
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-700">Actividad reciente</div>
          <div className="mt-3 space-y-2">
            <ActivityItem icon={<FileText className="h-4 w-4 text-blue-600" />} text="Factura VF-2031 emitida y validada" />
            <ActivityItem icon={<UploadCloud className="h-4 w-4 text-blue-600" />} text="3 tickets reconocidos desde Drive" />
            <ActivityItem icon={<CalendarClock className="h-4 w-4 text-blue-600" />} text="Recordatorio creado: plazo fiscal en 5 dáas" />
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
          {isPrimary ? "30 dáas gratis incluidos" : "Gratis o prueba según plan"}
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
            <BrandLogo variant="footer" />
            <p className="mt-3 text-sm text-slate-300">
              Automatiza tu facturación con cumplimiento y control total.
            </p>
            <div className="mt-4 flex gap-3">
              <a href="/proximamente" className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 transition">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 7-7 7-7"/></svg>
              </a>
              <a href="/proximamente" className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 transition">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </a>
              <a href="/proximamente" className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 transition">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            </div>
          </div>

          <FooterCol
            title="Producto"
            links={["Resumen", "Plataforma", "Automatización", "Integraciones"]}
          />
          <FooterCol
            title="VeriFactu"
            links={["Qué es", "Planes y precios", "Soporte", "Estado del servicio"]}
          />
          <FooterCol
            title="Recursos"
            links={["Guáas y webinars", "Checklist", "Blog", "Contacto"]}
          />
          <FooterCol
            title="Legal"
            links={["VeriFactu", "Polática de privacidad", "Términos de servicio", "Cookies"]}
          />
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <p>┬® {new Date().getFullYear()} Verifactu Business. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <a href="/verifactu" className="hover:text-blue-300 transition">VeriFactu</a>
              <a href="/legal/privacidad" className="hover:text-blue-300 transition">Polática de privacidad</a>
              <a href="/legal/terminos" className="hover:text-blue-300 transition">Términos de servicio</a>
              <a href="/legal/cookies" className="hover:text-blue-300 transition">Cookies</a>
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
            <a className="hover:text-blue-300 transition" href="/proximamente">
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
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-200 ${className}`}
    >
      {children}
    </button>
  );
}

function StickyCtaBar({ show }: { show: boolean }) {
  return (
    <div
      className={`fixed inset-x-0 bottom-4 z-30 px-4 transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      aria-hidden={!show}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="text-sm font-semibold text-slate-800">Prueba gratis y ve Isaak en acción</div>
        <div className="flex gap-2">
          <PrimaryButton className="px-4 py-2">Probar gratis</PrimaryButton>
          <SecondaryButton className="px-4 py-2">Ver demo</SecondaryButton>
        </div>
      </div>
    </div>
  );
}


