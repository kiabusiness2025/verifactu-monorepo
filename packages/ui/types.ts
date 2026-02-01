import { ReactNode } from 'react';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'light'
  | 'solid';

export interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isFullscreen?: boolean;
  showCloseButton?: boolean;
}

export interface TableColumn<T> {
  header: string;
  accessor: (item: T) => ReactNode;
  render?: (item: T) => ReactNode;
}
