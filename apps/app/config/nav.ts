import {
  Home,
  FileText,
  Users,
  Landmark,
  FolderOpen,
  CalendarDays,
  Settings,
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
  { label: 'Calendario', href: '/dashboard/calendar', icon: CalendarDays },
  { label: 'Configuración', href: '/dashboard/settings', icon: Settings },
];
