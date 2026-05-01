import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  ShoppingBag,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

export const navAdmin = [
  // ─── Operaciones ───────────────────────────────────────
  { label: 'Panel', href: '/panel', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Usuarios', href: '/users', icon: <Users className="h-4 w-4" /> },
  { label: 'Tenants', href: '/tenants', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Pedidos', href: '/orders', icon: <ShoppingBag className="h-4 w-4" /> },
  { label: 'Fulfillment', href: '/fulfillment', icon: <Zap className="h-4 w-4" /> },
  { label: 'Soporte', href: '/admin-support', icon: <LifeBuoy className="h-4 w-4" /> },
  // ─── Crecimiento ───────────────────────────────────────
  { label: 'Catálogo', href: '/catalog', icon: <ShoppingBag className="h-4 w-4" /> },
  { label: 'Marketing', href: '/admin-marketing', icon: <Megaphone className="h-4 w-4" /> },
  { label: 'Métricas', href: '/admin-metrics', icon: <BarChart3 className="h-4 w-4" /> },
  // ─── Relaciones ────────────────────────────────────────
  { label: 'Reuniones', href: '/admin-meetings', icon: <CalendarCheck className="h-4 w-4" /> },
  { label: 'Inversores', href: '/admin-investors', icon: <TrendingUp className="h-4 w-4" /> },
  // ─── Contenido ─────────────────────────────────────────
  { label: 'Documentación', href: '/admin-docs', icon: <BookOpen className="h-4 w-4" /> },
  { label: 'Demos', href: '/demo-requests', icon: <FileText className="h-4 w-4" /> },
];
