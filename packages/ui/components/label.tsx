// Basic Label component for shadcn/ui compatibility
import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}

export const Label: React.FC<LabelProps> = ({ children, htmlFor, className = '', ...props }) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
};
