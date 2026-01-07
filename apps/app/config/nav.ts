export type NavItem = {
  label: string;
  href: string;
  icon?: string;
  roles?: string[]; // reservado para RBAC futuro
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "Facturas", href: "/dashboard/invoices", icon: "📄" },
  { label: "Clientes", href: "/dashboard/clients", icon: "👥" },
  { label: "Bancos", href: "/dashboard/banks", icon: "🏦" },
  { label: "Documentos", href: "/dashboard/documents", icon: "🗂️" },
  { label: "Calendario", href: "/dashboard/calendar", icon: "📆" },
  { label: "Configuración", href: "/dashboard/settings", icon: "⚙️" },
];
