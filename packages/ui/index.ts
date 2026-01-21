// UI Components Package
import React from 'react';

export { AccessibleButton } from './components/AccessibleButton';
export { AccessibleInput } from './components/AccessibleInput';
export { Badge } from './components/Badge';
export { Card } from './components/Card';
export { Modal } from './components/Modal';
export { Table } from './components/Table';

// Compatibility exports (alias and additional components)
export { Button } from './components/button';
export { Input } from './components/input';
export { Label } from './components/label';
export { Textarea } from './components/textarea';
export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './components/select';
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './components/dialog';

// Card subcomponents (inline to avoid case-sensitivity issues)
export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b ${className}`}>{children}</div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>{children}</div>
);

// Table subcomponents (inline to avoid case-sensitivity issues)
export const TableHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <thead className={className}>{children}</thead>
);

export const TableBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <tbody className={className}>{children}</tbody>
);

export const TableHead: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <th className={`px-4 py-2 text-left font-medium ${className}`}>{children}</th>
);

export const TableRow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <tr className={className}>{children}</tr>
);

export const TableCell: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-4 py-2 ${className}`}>{children}</td>
);

// Types
export type { BadgeVariant, CardProps, ModalProps, TableColumn } from './types';
