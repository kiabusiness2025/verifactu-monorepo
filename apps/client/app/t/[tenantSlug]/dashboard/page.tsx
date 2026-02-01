import {
  ActionCard,
  MetricCard,
  NoticeCard,
  SectionTitle,
  ToastCard,
} from "@verifactu/ui";
import { Button, Card, CardContent } from "@verifactu/ui";
import { Banknote, FileText, Inbox, LineChart, Mail, Plus } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Buenas tardes, Usuario</div>
            <div className="text-xs text-muted-foreground mt-1">ESTAS EN: RESUMEN GENERAL</div>
            <div className="text-sm text-muted-foreground mt-3">
              Tu beneficio se actualiza solo: ventas menos gastos, sin hojas cruzadas.
            </div>
          </div>
          <Button className="rounded-full">Ver resumen</Button>
        </CardContent>
      </Card>

      <SectionTitle
        title="Acciones"
        right={
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva accion
          </Button>
        }
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ActionCard
          title="Emitir factura"
          subtitle="Crear y enviar en segundos."
          tag="Facturacion"
          href="#"
          icon={<FileText className="h-4 w-4" />}
        />
        <ActionCard
          title="Conciliar banco"
          subtitle="Detecta movimientos pendientes."
          tag="Banca"
          href="#"
          icon={<Banknote className="h-4 w-4" />}
        />
        <ActionCard
          title="Resumen del mes"
          subtitle="Ventas, gastos y margen."
          tag="Analitica"
          href="#"
          icon={<LineChart className="h-4 w-4" />}
        />
        <ActionCard
          title="Buzon de correos"
          subtitle="Seguimiento de envios."
          tag="Email"
          href="#"
          icon={<Mail className="h-4 w-4" />}
        />
        <ActionCard
          title="Documentos"
          subtitle="Revisa evidencias clave."
          tag="Documentos"
          href="#"
          icon={<Inbox className="h-4 w-4" />}
        />
      </div>

      <SectionTitle title="Metricas" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Ventas mes"
          value="12.450 EUR"
          hint="+8% vs mes anterior"
          badge={{ label: "Sube", tone: "ok" }}
        />
        <MetricCard
          title="Gastos mes"
          value="4.980 EUR"
          hint="Deducibles revisados"
          badge={{ label: "OK", tone: "info" }}
        />
        <MetricCard
          title="Beneficio"
          value="7.470 EUR"
          hint="Margen neto estimado"
        />
        <MetricCard
          title="Facturas pendientes"
          value="6"
          hint="Clientes sin cobrar"
          badge={{ label: "Atencion", tone: "warn" }}
        />
      </div>

      <SectionTitle title="Avisos" />
      <div className="grid gap-3 md:grid-cols-2">
        <NoticeCard
          label="VeriFactu"
          text="Tienes 2 facturas listas para comunicar. Isaak puede enviarlas por ti."
        />
        <NoticeCard
          label="Banca"
          text="5 movimientos requieren categoria. Pulsa para conciliarlos."
        />
      </div>

      <div className="flex justify-end">
        <ToastCard
          title="Prueba activa"
          text="30 dias para probar Verifactu con tus datos."
          tone="info"
        />
      </div>
    </div>
  );
}
