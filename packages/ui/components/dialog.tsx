// Basic Dialog component for shadcn/ui compatibility
import React from 'react';

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange?.(false)} />
      <div className="relative bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 z-50">
        {children}
      </div>
    </div>
  );
};

export const DialogTrigger: React.FC<{ asChild?: boolean; children: React.ReactNode }> = ({
  children,
}) => <>{children}</>;

export const DialogContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-6 ${className}`}>{children}</div>;

export const DialogHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`mb-4 ${className}`}>{children}</div>;

export const DialogTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <h2 className={`text-xl font-semibold ${className}`}>{children}</h2>;

export const DialogDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <p className={`text-sm text-gray-600 ${className}`}>{children}</p>;

export const DialogFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`mt-6 flex justify-end gap-2 ${className}`}>{children}</div>;
