
import { Button } from "@verifactu/ui/components/ui/button";
import { Card, CardContent } from "@verifactu/ui/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Buenas noches, Usuario</div>
            <div className="text-xs text-muted-foreground mt-1">ESTÁS EN: RESUMEN GENERAL</div>
            <div className="text-sm text-muted-foreground mt-3">
              Tu beneficio se actualiza solo: ventas - gastos. No tienes que cruzar hojas.
            </div>
          </div>
          <Button className="rounded-full">Ver resumen</Button>
        </CardContent>
      </Card>

      {/* Aquí: acciones + métricas + avisos (lo completamos en siguiente iteración) */}
      <div className="text-sm text-muted-foreground">
        Siguiente: bloque de Acciones + Métricas + Avisos (demo).
      </div>
    </div>
  );
}
