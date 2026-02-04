import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  CreditCard,
  Mail,
  Settings,
  ClipboardList,
  Plug,
  AlertTriangle,
} from "lucide-react";

export const navAdmin = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Tenants", href: "/tenants", icon: <Building2 className="h-4 w-4" /> },
  { label: "Usuarios", href: "/users", icon: <Users className="h-4 w-4" /> },
  { label: "Soporte", href: "/support-sessions", icon: <Shield className="h-4 w-4" /> },
  { label: "Facturación", href: "/integrations/stripe", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Emails", href: "/integrations/resend", icon: <Mail className="h-4 w-4" /> },
  { label: "Integraciones", href: "/integrations", icon: <Plug className="h-4 w-4" /> },
  { label: "Operaciones", href: "/operations", icon: <AlertTriangle className="h-4 w-4" /> },
  { label: "Auditoría", href: "/audit-log", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
];
