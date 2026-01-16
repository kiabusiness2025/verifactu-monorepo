import {
  LayoutGrid,
  FileText,
  Users,
  Landmark,
  FolderOpen,
  Sparkles,
  CalendarDays,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  roles?: string[]; // reservado para RBAC futuro
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Facturas", href: "/dashboard/invoices", icon: FileText },
  { label: "Clientes", href: "/dashboard/clients", icon: Users },
  { label: "Bancos", href: "/dashboard/banks", icon: Landmark },
  { label: "Documentos", href: "/dashboard/documents", icon: FolderOpen },
  { label: "Isaak AI", href: "/dashboard/isaak", icon: Sparkles },
  { label: "Calendario", href: "/dashboard/calendar", icon: CalendarDays },
  { label: "Configuracion", href: "/dashboard/settings", icon: Settings },
];
