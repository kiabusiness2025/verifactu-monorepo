import {
  Bot,
  Building2,
  FileText,
  HeadphonesIcon,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  Plug,
  ShoppingCart,
  Users,
  Zap,
} from 'lucide-react';

// Secciones pendientes (placeholder aún): Métricas, Reuniones, Inversores, Documentación.
export const navAdmin = [
  { label: 'Panel', href: '/panel', icon: <LayoutDashboard className="h-4 w-4" /> },
  {
    label: 'Conectores',
    href: '/connectors',
    icon: <Plug className="h-4 w-4" />,
    match: (p: string) => p.startsWith('/connectors'),
  },
  { label: 'Usuarios', href: '/users', icon: <Users className="h-4 w-4" /> },
  { label: 'Tenants', href: '/tenants', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Marketing', href: '/admin-marketing', icon: <Megaphone className="h-4 w-4" /> },
  { label: 'Demos', href: '/demo-requests', icon: <FileText className="h-4 w-4" /> },
  {
    label: 'WhatsApp',
    href: '/whatsapp',
    icon: <MessageSquare className="h-4 w-4" />,
    match: (p: string) => p.startsWith('/whatsapp'),
  },
  { label: 'Catálogo', href: '/catalog', icon: <Package className="h-4 w-4" /> },
  {
    label: 'Pedidos',
    href: '/orders',
    icon: <ShoppingCart className="h-4 w-4" />,
    match: (p: string) => p.startsWith('/orders'),
  },
  {
    label: 'Fulfillment',
    href: '/fulfillment',
    icon: <Zap className="h-4 w-4" />,
    match: (p: string) => p.startsWith('/fulfillment'),
  },
  {
    label: 'Soporte',
    href: '/tickets',
    icon: <HeadphonesIcon className="h-4 w-4" />,
    match: (p: string) => p.startsWith('/tickets') || p.startsWith('/support-sessions'),
  },
  {
    label: 'Isaak',
    href: '/isaak',
    icon: <Bot className="h-4 w-4" />,
    match: (p: string) => p.startsWith('/isaak'),
  },
];
