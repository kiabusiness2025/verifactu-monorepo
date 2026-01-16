export type NavItem = {
  label: string;
  href: string;
  icon?: string;
  roles?: string[]; // reservado para RBAC futuro
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "DB" },
  { label: "Facturas", href: "/dashboard/invoices", icon: "FV" },
  { label: "Clientes", href: "/dashboard/clients", icon: "CL" },
  { label: "Bancos", href: "/dashboard/banks", icon: "BK" },
  { label: "Documentos", href: "/dashboard/documents", icon: "DC" },
  { label: "Isaak AI", href: "/dashboard/isaak", icon: "AI" },
  { label: "Calendario", href: "/dashboard/calendar", icon: "CA" },
  { label: "Configuracion", href: "/dashboard/settings", icon: "ST" },
];
