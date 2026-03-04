import {
  AlertTriangle,
  Building2,
  ClipboardList,
  CircleDollarSign,
  LayoutDashboard,
  Link2,
  Mail,
  Plug,
  Settings,
  Shield,
  Users,
} from 'lucide-react';

export const navAdmin = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Usuarios', href: '/users', icon: <Users className="h-4 w-4" /> },
  { label: 'Empresas', href: '/tenants', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Suscripciones', href: '/subscriptions', icon: <CircleDollarSign className="h-4 w-4" /> },
  { label: 'Correo', href: '/integrations/resend', icon: <Mail className="h-4 w-4" /> },
  { label: 'Integraciones', href: '/integrations', icon: <Plug className="h-4 w-4" /> },
  { label: 'Usuarios vs Tenants', href: '/operations/integrity', icon: <Link2 className="h-4 w-4" /> },
  { label: 'Soporte', href: '/support-sessions', icon: <Shield className="h-4 w-4" /> },
  { label: 'Operaciones', href: '/operations', icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Auditoría', href: '/audit-log', icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Configuración', href: '/settings', icon: <Settings className="h-4 w-4" /> },
];
