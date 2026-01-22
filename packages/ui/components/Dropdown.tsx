import React from 'react';

export interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({ isOpen, onClose, children, className = '' }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full z-50 mt-2">
      <div
        className={`rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900 ${className}`}
        role="menu"
        onMouseLeave={onClose}
      >
        {children}
      </div>
    </div>
  );
};

export interface DropdownItemProps {
  children: React.ReactNode;
  onItemClick?: () => void;
  className?: string;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({ children, onItemClick, className = '' }) => {
  return (
    <button
      type="button"
      onClick={onItemClick}
      className={`px-3 py-2 text-sm ${className}`}
      role="menuitem"
    >
      {children}
    </button>
  );
};
