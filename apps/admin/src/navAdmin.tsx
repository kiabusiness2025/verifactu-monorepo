import { Building2, LayoutDashboard, Users } from 'lucide-react';

export const navAdmin = [
  { label: 'Panel', href: '/panel', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Usuarios', href: '/users', icon: <Users className="h-4 w-4" /> },
  { label: 'Tenants', href: '/tenants', icon: <Building2 className="h-4 w-4" /> },
];
