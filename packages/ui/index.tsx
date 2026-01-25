// UI Components Package
import React from 'react';

export { AccessibleButton } from './components/AccessibleButton';
export { AccessibleInput } from './components/AccessibleInput';
export { Badge } from './components/Badge';
export { Card, CardContent, CardHeader, CardTitle } from './components/Card';
export { Dropdown, DropdownItem } from './components/Dropdown';
export { Modal } from './components/Modal';

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
export const TableHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <thead className={className}>{children}</thead>;

export const TableBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <tbody className={className}>{children}</tbody>;

export const TableHead: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <th className={`px-4 py-2 text-left font-medium ${className}`}>{children}</th>;

export const TableRow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <tr className={className}>{children}</tr>;

export const TableCell: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <td className={`px-4 py-2 ${className}`}>{children}</td>;

// Types
export type { BadgeVariant, CardProps, ModalProps, TableColumn } from './types';
