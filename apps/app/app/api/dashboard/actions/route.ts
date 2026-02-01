import { NextResponse } from 'next/server';

const actionsByTenant: Record<
  string,
  { id: string; title: string; action: string; href: string }[]
> = {
  demo: [
    {
      id: 'invoice',
      title: 'Isaak, emite nueva factura venta',
      action: 'Nueva factura Veri*Factu',
      href: '/dashboard/invoices',
    },
    {
      id: 'expense',
      title: 'Contabiliza esta factura de gasto',
      action: 'Importar archivo',
      href: '/dashboard/documents',
    },
    {
      id: 'hacienda',
      title: 'Interpreta esta notificación de Hacienda',
      action: 'Subir documentos',
      href: '/dashboard/documents',
    },
  ],
  alpina: [
    {
      id: 'banking',
      title: 'Conciliar movimientos bancarios pendientes',
      action: 'Ir a Bancos',
      href: '/dashboard/banking',
    },
    {
      id: 'clients',
      title: 'Revisar clientes con facturas vencidas',
      action: 'Ver clientes',
      href: '/dashboard/customers',
    },
    {
      id: 'verifactu',
      title: 'Enviar facturas del día a Veri*Factu',
      action: 'Abrir facturas',
      href: '/dashboard/invoices',
    },
  ],
  norte: [
    {
      id: 'expense',
      title: 'Registrar gasto con factura escaneada',
      action: 'Subir documentos',
      href: '/dashboard/documents',
    },
    {
      id: 'calendar',
      title: 'Revisar próximos plazos fiscales',
      action: 'Ver calendario',
      href: '/dashboard/calendar',
    },
    {
      id: 'benefit',
      title: 'Actualizar resumen de beneficio mensual',
      action: 'Ver resumen',
      href: '/dashboard',
    },
  ],
  nova: [
    {
      id: 'sales',
      title: 'Emitir factura recurrente a clientes clave',
      action: 'Nueva factura',
      href: '/dashboard/invoices',
    },
    {
      id: 'docs',
      title: 'Guardar contrato mercantil reciente',
      action: 'Subir documento',
      href: '/dashboard/documents',
    },
    {
      id: 'tax',
      title: 'Preparar modelo trimestral con Isaak',
      action: 'Ver ajustes',
      href: '/dashboard/settings',
    },
  ],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') ?? 'demo';
  const actions = actionsByTenant[tenantId] ?? actionsByTenant.demo;

  return NextResponse.json({ ok: true, actions });
}
