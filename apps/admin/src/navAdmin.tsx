import { Building2, FileText, LayoutDashboard, Megaphone, Plug, Users } from 'lucide-react';

// Secciones activas — orientadas a gestión de conectores (plan S0)
// Secciones ocultas (pendientes de implementar): Pedidos, Fulfillment, Soporte,
// Isaak, Catálogo, Métricas, Reuniones, Inversores, Documentación.
// Marketing se reactiva en Sprint S5.
export const navAdmin = [
  { label: 'Panel', href: '/panel', icon: <LayoutDashboard className="h-4 w-4" /> },
  {
    label: 'Conectores',
    href: '/connectors/overview',
    icon: <Plug className="h-4 w-4" />,
    match: (p: string) => p.startsWith('/connectors'),
  },
  { label: 'Usuarios', href: '/users', icon: <Users className="h-4 w-4" /> },
  { label: 'Tenants', href: '/tenants', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Marketing', href: '/admin-marketing', icon: <Megaphone className="h-4 w-4" /> },
  { label: 'Demos', href: '/demo-requests', icon: <FileText className="h-4 w-4" /> },
];
