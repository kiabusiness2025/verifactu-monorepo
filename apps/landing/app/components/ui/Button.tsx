import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

// Base styles for all buttons
const baseStyles = [
  'inline-flex items-center justify-center gap-2',
  'rounded-lg font-medium transition-all duration-200',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'focus:outline-none focus:ring-2 focus:ring-offset-2',
  'active:scale-95',
].join(' ');

// Variant styles
const variants: Record<ButtonVariant, string> = {
  primary: [
    'bg-indigo-600 text-white',
    'hover:bg-indigo-700 active:bg-indigo-800',
    'focus:ring-indigo-500',
    'shadow-sm hover:shadow-md',
  ].join(' '),
  secondary: [
    'bg-gray-200 text-gray-900',
    'hover:bg-gray-300 active:bg-gray-400',
    'focus:ring-gray-500',
  ].join(' '),
  ghost: [
    'bg-transparent text-gray-600',
    'hover:bg-gray-100 hover:text-gray-900',
    'active:bg-gray-200',
    'focus:ring-gray-500',
  ].join(' '),
  danger: [
    'bg-red-600 text-white',
    'hover:bg-red-700 active:bg-red-800',
    'focus:ring-red-500',
    'shadow-sm hover:shadow-md',
  ].join(' '),
  success: [
    'bg-green-600 text-white',
    'hover:bg-green-700 active:bg-green-800',
    'focus:ring-green-500',
    'shadow-sm hover:shadow-md',
  ].join(' '),
};

// Size styles
const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
  xl: 'px-8 py-4 text-lg',
};

/**
 * Button Component
 * 
 * Standardized, accessible button component for Verifactu.business landing page.
 * 
 * @example
 * <Button variant="primary" size="lg">
 *   Empezar gratis
 * </Button>
 * 
 * @example
 * <Button variant="ghost" isLoading>
 *   Procesando...
 * </Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      icon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const variantStyles = variants[variant];
    const sizeStyles = sizes[size];
    const fullWidthStyles = fullWidth ? 'w-full' : 'w-auto';
    
    const classNames = [
      baseStyles,
      variantStyles,
      sizeStyles,
      fullWidthStyles,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={classNames}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && icon && icon}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, type ButtonProps };
