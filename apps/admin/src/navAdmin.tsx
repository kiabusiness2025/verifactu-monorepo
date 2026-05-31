import {
  Bot,
  Building2,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Plug,
  Users,
} from 'lucide-react';

// V2.A — Panel admin reorientado a: gestión de usuarios, empresas con
// Holded conectada, conversaciones/memoria de Isaak, suscripciones y
// marketing. Resto de secciones (catálogo, pedidos, fulfillment,
// tickets, support-sessions) eliminadas en V2.A.1.
export const navAdmin = [
  { label: 'Panel', href: '/panel', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Usuarios', href: '/users', icon: <Users className="h-4 w-4" /> },
  { label: 'Empresas', href: '/tenants', icon: <Building2 className="h-4 w-4" /> },
  {
    label: 'Conexiones MCP',
    href: '/connectors',
    icon: <Plug className="h-4 w-4" />,
    match: (p: string) => p.startsWith('/connectors'),
  },
  {
    label: 'Isaak',
    href: '/isaak',
    icon: <Bot className="h-4 w-4" />,
    match: (p: string) => p.startsWith('/isaak'),
  },
  {
    label: 'Suscripciones',
    href: '/subscriptions',
    icon: <CreditCard className="h-4 w-4" />,
    match: (p: string) => p.startsWith('/subscriptions'),
  },
  {
    label: 'Marketing',
    href: '/marketing',
    icon: <Megaphone className="h-4 w-4" />,
    match: (p: string) =>
      p.startsWith('/marketing') ||
      p.startsWith('/admin-marketing') ||
      p.startsWith('/demo-requests') ||
      p.startsWith('/whatsapp'),
  },
];
