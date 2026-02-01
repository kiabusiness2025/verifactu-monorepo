import {
  ActionCard,
  Card,
  CardContent,
  MetricCard,
  NoticeCard,
  SectionTitle,
  ToastCard,
} from "@verifactu/ui";
import { Button } from "@verifactu/ui";
import {
  Building2,
  CalendarDays,
  FileText,
  Folder,
  Users,
  Wallet,
} from "lucide-react";

export default function DashboardPage() {
  const demo = true;

  return (
    <div className="space-y-6">
      <Card className="shadow-soft rounded-2xl">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">Buenas noches, Usuario</div>
              {demo ? (
                <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                  MODO DEMO
                </span>
              ) : null}
            </div>

            <div className="text-xs text-muted-foreground mt-1">ESTAS EN: RESUMEN GENERAL</div>

            <div className="text-sm text-muted-foreground mt-3">
              Tu beneficio se actualiza solo: ventas - gastos. No tienes que cruzar hojas.
            </div>
          </div>

          <Button className="rounded-full">Ver resumen</Button>
        </CardContent>
      </Card>

      <SectionTitle
        title="Acciones"
        right={
          <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
            HOY
          </span>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <ActionCard
          title="Factura"
          subtitle="Crea o revisa cobros"
          tag="Ventas"
          href="/invoices"
          icon={<FileText className="h-4 w-4 text-primary" />}
        />
        <ActionCard
          title="Gasto"
          subtitle="Registra proveedores"
          tag="Pagos"
          href="/expenses"
          icon={<Wallet className="h-4 w-4 text-emerald-500" />}
        />
        <ActionCard
          title="Documento"
          subtitle="Sube y organiza"
          tag="Archivo"
          href="/documents"
          icon={<Folder className="h-4 w-4 text-amber-500" />}
        />
        <ActionCard
          title="Calendario"
          subtitle="Mira plazos"
          tag="Fiscal"
          href="/calendar"
          icon={<CalendarDays className="h-4 w-4 text-orange-500" />}
        />
        <ActionCard
          title="Nueva empresa"
          subtitle="Crear o importar"
          tag="Empresa"
          href="/settings/company"
          icon={<Building2 className="h-4 w-4 text-primary" />}
        />
        <ActionCard
          title="Clientes"
          subtitle="Gestiona contactos"
          tag="Contactos"
          href="/customers"
          icon={<Users className="h-4 w-4 text-indigo-500" />}
        />
      </div>

      <SectionTitle
        title="Estado"
        right={
          <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
            METRICS
          </span>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Ventas mes"
          value="1.995,00 EUR"
          hint="6 facturas emitidas"
          badge={{ label: "Listo", tone: "ok" }}
        />
        <MetricCard
          title="Gastos mes"
          value="638,40 EUR"
          hint="Estimacion por ratio historico"
          badge={{ label: "Info", tone: "info" }}
        />
        <MetricCard
          title="Beneficio"
          value="1.356,60 EUR"
          hint="Actualizado hoy"
          badge={{ label: "Listo", tone: "ok" }}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MetricCard
          title="IVA estimado"
          value="418,95 EUR"
          hint="Segun facturas del periodo"
          badge={{ label: "Info", tone: "info" }}
        />
      </div>

      <SectionTitle
        title="Avisos"
        right={
          <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
            DEMO
          </span>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <NoticeCard
          label="Recordatorio"
          text="Mantener la numeracion ordenada ayuda a cumplir Veri*Factu."
        />
        <NoticeCard
          label="Consejo de Isaak"
          text="Revisa vencimientos cada viernes para evitar cargos de financiacion."
        />
      </div>

      <div className="fixed right-6 bottom-24 z-40 space-y-3 hidden md:block">
        <ToastCard
          title="Tu resumen hoy"
          text="Haz clic para ver tu beneficio del mes y facturas pendientes."
          tone="info"
        />
        <ToastCard
          title="Recordatorio Veri*Factu"
          text="Has subido tus facturas de hoy a la AEAT? Yo te ayudo si tienes dudas."
          tone="warn"
        />
      </div>
    </div>
  );
}
