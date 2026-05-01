import {
  CalendarDays,
  FileText,
  FolderOpen,
  Home,
  Landmark,
  LifeBuoy,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  roles?: string[]; // reservado para RBAC futuro
};

export const navItems: NavItem[] = [
  { label: 'Inicio', href: '/dashboard', icon: Home },
  { label: 'Facturas', href: '/dashboard/invoices', icon: FileText },
  { label: 'Clientes', href: '/dashboard/clients', icon: Users },
  { label: 'Bancos', href: '/dashboard/banks', icon: Landmark },
  { label: 'Documentos', href: '/dashboard/documents', icon: FolderOpen },
  { label: 'Isaak AI', href: '/dashboard/isaak', icon: Sparkles },
  { label: 'Calendario', href: '/dashboard/calendar', icon: CalendarDays },
  { label: 'Mis pedidos', href: '/dashboard/orders', icon: ShoppingBag },
  { label: 'Soporte', href: '/dashboard/support', icon: LifeBuoy },
  { label: 'Configuración', href: '/dashboard/settings', icon: Settings },
  { label: 'Admin', href: '/dashboard/admin-dashboard', icon: Settings, roles: ['admin', 'owner'] },
  {
    label: 'Conector Holded',
    href: '/dashboard/integrations/holded',
    icon: Sparkles,
    roles: ['admin', 'owner'],
  },
];
