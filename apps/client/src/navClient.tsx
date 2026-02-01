import { LayoutDashboard, FileText, Building2, CreditCard, Settings, Bot } from "lucide-react";
import type { NavItem } from "@verifactu/ui";

type NavTemplate = Omit<NavItem, "href"> & { href: string };

export const navClient: NavTemplate[] = [
  { label: "Dashboard", href: "/t/:tenantSlug/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Facturas", href: "/t/:tenantSlug/erp/invoices", icon: <FileText className="h-4 w-4" /> },
  { label: "Clientes", href: "/t/:tenantSlug/erp/customers", icon: <Building2 className="h-4 w-4" /> },
  { label: "Bancos", href: "/t/:tenantSlug/banking", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Isaak", href: "/t/:tenantSlug/assistant/isaak", icon: <Bot className="h-4 w-4" /> },
  { label: "Configuracion", href: "/t/:tenantSlug/settings", icon: <Settings className="h-4 w-4" /> },
];
