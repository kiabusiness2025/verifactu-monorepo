import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BadgeCheck,
  ExternalLink,
  FileText,
  Lock,
  Mail,
  Scale,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Términos y condiciones | Isaak',
  description: 'Condiciones de uso de Isaak como producto público de verifactu.business.',
};

export default function IsaakTermsPage() {
  return (
    <main className="min-h-screen bg-[#2361d8]/5">
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/20">
              <FileText className="h-4 w-4" />
              Condiciones de servicio
            </div>
            <h1 className="text-4xl font-bold text-[#011c67]">Términos y condiciones</h1>
            <p className="text-lg text-slate-600">
              Estas condiciones regulan el acceso y uso de Isaak. Al utilizar el producto o su chat
              público aceptas este marco de funcionamiento.
            </p>
            <p className="text-sm text-slate-500">Última actualización: 19 de mayo de 2026.</p>
          </div>
          <div className="rounded-2xl border border-[#2361d8]/15 bg-white p-5 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <BadgeCheck className="h-4 w-4" />
              Aviso importante
            </div>
            <p className="mt-2">
              Isaak es un asistente de apoyo fiscal y operativo. No sustituye a tu gestor, asesor o
              profesional acreditado cuando ese criterio sea necesario.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <ShieldCheck className="h-4 w-4" />
              Servicio
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Isaak ofrece asistencia, explicación, priorización y apoyo a la toma de decisiones con
              contexto autorizado. El producto evoluciona de forma continua.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <UserCheck className="h-4 w-4" />
              Cuenta y acceso
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Eres responsable de custodiar tus credenciales, revisar lo que conectas y confirmar
              cualquier acción sensible antes de ejecutarla.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Scale className="h-4 w-4" />
              Responsabilidad
            </div>
            <p className="mt-2 text-sm text-slate-600">
              El servicio se presta tal cual, con esfuerzo razonable por mantener disponibilidad,
              seguridad y actualidad, pero sin garantía absoluta de ausencia total de incidencias.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <BadgeCheck className="h-4 w-4" />
              Precios y activación
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Los planes, periodos de prueba y condiciones comerciales vigentes son los publicados
              por verifactu.business en cada momento. Si necesitas una activación guiada, puedes
              pasar por soporte o por el chat abierto antes de contratar.
            </p>
          </div>
        </div>

        {/* ── Condiciones de integraciones específicas ── */}
        <div className="mt-10 space-y-4">
          <h2 className="text-xl font-bold text-[#011c67]">Condiciones por integración</h2>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="font-semibold text-slate-800">WhatsApp / Meta</div>
            <p className="mt-2 text-sm text-slate-600">
              El canal de WhatsApp está disponible como add-on. Al activarlo aceptas los{' '}
              <a
                href="https://www.whatsapp.com/legal/business-terms/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#2361d8] underline underline-offset-4"
              >
                Términos de WhatsApp Business
              </a>{' '}
              y las políticas de Meta for Developers. El uso de plantillas de mensajes (HSM) y
              formularios interactivos (WhatsApp Flows) está sujeto a aprobación previa por Meta.
              Isaak no garantiza tiempos de aprobación ni disponibilidad de plantillas específicas,
              ya que dependen de Meta. El número de WhatsApp asociado se gestiona a través de Meta
              Business Manager y es responsabilidad del titular de la cuenta.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="font-semibold text-slate-800">Open Banking — Salt Edge</div>
            <p className="mt-2 text-sm text-slate-600">
              La integración bancaria se realiza a través de Salt Edge, proveedor regulado PSD2. Al
              conectar una cuenta bancaria otorgas consentimiento explícito mediante un flujo OAuth
              regulado. Isaak usa los movimientos bancarios exclusivamente para la conciliación con
              facturas en Holded. No almacenamos credenciales bancarias. Puedes revocar el
              consentimiento en cualquier momento desde Ajustes → Open Banking, lo que desconecta el
              acceso a los datos bancarios. Salt Edge opera bajo su propio marco regulatorio como
              proveedor de servicios de información de cuentas (AISP).
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="font-semibold text-slate-800">Certificado digital AEAT (P12/PFX)</div>
            <p className="mt-2 text-sm text-slate-600">
              Al subir tu certificado digital para la comunicación con la Sede Electrónica de la
              AEAT, autorizas a Isaak a usar ese certificado exclusivamente para consultas y
              operaciones que tú inicies: buzón de notificaciones, datos censales y registro
              VeriFactu. El certificado se almacena cifrado (AES-256-GCM) y no se comparte con
              terceros. Eres responsable de mantener la validez del certificado y de revocarlo en la
              FNMT si sospechas un uso indebido. Puedes eliminarlo en cualquier momento desde
              Ajustes → Certificado.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="font-semibold text-slate-800">
              Modo Asesoría (gestión multi-cliente)
            </div>
            <p className="mt-2 text-sm text-slate-600">
              El Modo Asesoría permite a gestorías y asesores operar Isaak con las credenciales de
              Holded de sus clientes. Al usar esta funcionalidad, el asesor declara tener
              autorización expresa de sus clientes para gestionar sus datos en su nombre. Isaak
              actúa como encargado del tratamiento en este flujo y no verifica la existencia de
              dicho mandato: la responsabilidad recae en el asesor. Las API Keys de los clientes se
              almacenan cifradas y se usan únicamente para las operaciones ejecutadas desde el panel
              del asesor.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="font-semibold text-slate-800">VeriFactu — Emisión de facturas</div>
            <p className="mt-2 text-sm text-slate-600">
              La emisión de facturas a través de Isaak genera registros en el sistema VeriFactu de
              la AEAT conforme al Real Decreto 1007/2023. Una vez remitido un registro a la AEAT no
              puede modificarse; solo puede anularse mediante un registro de anulación. Eres
              responsable de revisar los datos de cada factura antes de confirmar su emisión. Isaak
              no se hace responsable de errores derivados de datos incorrectos proporcionados al
              sistema.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-[#2361d8]/15 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
            <Lock className="h-4 w-4" />
            Uso aceptable
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Isaak está diseñado para uso profesional legítimo. Queda prohibido el uso para
            actividades ilícitas, la extracción masiva de datos, la ingeniería inversa del sistema o
            cualquier uso que vulnere derechos de terceros o la normativa aplicable. Nos reservamos
            el derecho de suspender cuentas que incumplan estas condiciones.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-[#2361d8]/15 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
            <ExternalLink className="h-4 w-4" />
            Referencias externas y normativa
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Cuando sea relevante, Isaak puede orientarte hacia la normativa pública o a los canales
            oficiales, pero la responsabilidad final sobre decisiones fiscales sigue siendo tuya.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <a
              href="https://www.agenciatributaria.es/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/20 bg-[#2361d8]/5 px-4 py-2 font-semibold text-[#2361d8]"
            >
              Agencia Tributaria
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href="https://sede.agenciatributaria.gob.es/Sede/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/20 bg-[#2361d8]/5 px-4 py-2 font-semibold text-[#2361d8]"
            >
              Sede electrónica
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href="https://www.whatsapp.com/legal/business-terms/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/20 bg-[#2361d8]/5 px-4 py-2 font-semibold text-[#2361d8]"
            >
              WhatsApp Business Terms
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Scale className="h-4 w-4" />
              Cancelación
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Puedes cancelar o revisar tu activación según las condiciones de tu plan. Para casos
              especiales, el canal correcto es soporte.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Mail className="h-4 w-4" />
              Contacto
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Si tienes dudas legales o de servicio, escríbenos o entra en{' '}
              <Link
                href="/support"
                className="font-semibold text-[#2361d8] underline underline-offset-4"
              >
                soporte de Isaak
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#011c67]">Siguiente paso útil</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Si antes de activar quieres validar cómo responde Isaak, abre el chat o habla con el
            equipo para revisar tu caso.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
            >
              Hablar con Isaak
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Contactar soporte
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
