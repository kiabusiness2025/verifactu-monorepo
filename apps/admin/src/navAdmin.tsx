import { Building2, ClipboardList, LayoutDashboard, LifeBuoy, Shield, Users } from 'lucide-react';

export const navAdmin = [
  { label: 'Panel', href: '/panel', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Usuarios', href: '/users', icon: <Users className="h-4 w-4" /> },
  { label: 'Tenants', href: '/tenants', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Conversaciones', href: '/conversations', icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Tickets', href: '/tickets', icon: <LifeBuoy className="h-4 w-4" /> },
  { label: 'Sesiones', href: '/sessions', icon: <Shield className="h-4 w-4" /> },
];
