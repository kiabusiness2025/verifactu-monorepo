export type NavItem = {
  label: string;
  href: string;
  icon?: string;
  roles?: string[]; // reservado para RBAC futuro
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/app/(admin)", icon: "🏠" },
  { label: "Facturas", href: "/app/(admin)/invoices", icon: "📄" },
  { label: "Clientes", href: "/app/(admin)/clients", icon: "👥" },
  { label: "Bancos", href: "/app/(admin)/banks", icon: "🏦" },
  { label: "Documentos", href: "/app/(admin)/documents", icon: "🗂️" },
  { label: "Calendario", href: "/app/(admin)/calendar", icon: "📆" },
  { label: "Configuración", href: "/app/(admin)/settings", icon: "⚙️" },
];
