// UI Components Package

export { AccessibleButton } from './components/AccessibleButton';
export { AccessibleInput } from './components/AccessibleInput';
export { Badge } from './components/Badge';
export { Card, CardContent, CardHeader, CardTitle } from './components/Card';
export { Dropdown, DropdownItem } from './components/Dropdown';
export { EjemploFormatoES } from './components/EjemploFormatoES';
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/Table';
export { Modal } from './src/modal';
export { AppShell } from './src/app-shell/AppShell';
export { PageHeader } from './src/header/PageHeader';
export { StatusBadge } from './src/badges/StatusBadge';
export { ThemeProvider } from './src/theme/ThemeProvider';
export { ModeToggle } from './src/theme/ModeToggle';
export { IsaakDock } from './src/isaak/IsaakDock';
export { IsaakProvider, useIsaakContext } from './src/isaak/useIsaakContext';
export { cn } from './src/utils/cn';

// Compatibility exports (alias and additional components)
export { Button } from './components/button';
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './components/dialog';
export { Input } from './components/input';
export { Label } from './components/label';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/select';
export { Textarea } from './components/textarea';

// Table subcomponents (inline to avoid case-sensitivity issues)

// Types
export type { BadgeVariant, CardProps, ModalProps, TableColumn } from './types';
export type { NavItem } from './src/app-shell/AppShell';
export type { StatusVariant } from './src/badges/StatusBadge';
export type { IsaakTone } from './src/isaak/useIsaakContext';
