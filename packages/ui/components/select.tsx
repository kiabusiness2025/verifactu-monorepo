// Basic Select component for shadcn/ui compatibility
import React from 'react';

export interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  children,
  value,
  onValueChange,
  defaultValue,
  disabled,
}) => {
  return (
    <select
      value={value}
      defaultValue={defaultValue}
      onChange={(e) => onValueChange?.(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {children}
    </select>
  );
};

export const SelectTrigger: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`relative ${className}`}>{children}</div>;

export const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => (
  <span className="text-gray-500">{placeholder}</span>
);

export const SelectContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

export const SelectItem: React.FC<{ value: string; children: React.ReactNode }> = ({
  value,
  children,
}) => <option value={value}>{children}</option>;
