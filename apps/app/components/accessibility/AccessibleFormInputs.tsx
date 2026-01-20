/**
 * Accessible Form Input Component
 * Ensures form inputs meet WCAG 2.1 AA standards with proper labels
 */

import React from 'react';

interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Show label visually (default: true) */
  showLabel?: boolean;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const AccessibleInput = React.forwardRef<HTMLInputElement, AccessibleInputProps>(
  (
    {
      label,
      showLabel = true,
      error,
      helperText,
      required = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    // Generate unique ID if not provided
    const inputId = id || `input-${React.useId()}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    const baseInputClasses =
      'w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1';
    const normalClasses =
      'border-slate-200 focus:border-blue-500 focus:ring-blue-500';
    const errorClasses =
      'border-red-300 focus:border-red-500 focus:ring-red-500';

    const inputClasses = `${baseInputClasses} ${
      error ? errorClasses : normalClasses
    } ${className}`;

    return (
      <div className="space-y-1">
        <label
          htmlFor={inputId}
          className={`block text-sm font-medium text-slate-700 ${
            !showLabel ? 'sr-only' : ''
          }`}
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-label="required">
              *
            </span>
          )}
        </label>

        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            [errorId, helperId].filter(Boolean).join(' ') || undefined
          }
          aria-required={required}
          {...props}
        />

        {helperText && !error && (
          <p id={helperId} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}

        {error && (
          <p id={errorId} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';

interface AccessibleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  /** Show label visually (default: true) */
  showLabel?: boolean;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
}

export const AccessibleSelect = React.forwardRef<HTMLSelectElement, AccessibleSelectProps>(
  (
    {
      label,
      showLabel = true,
      error,
      helperText,
      options,
      required = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${React.useId()}`;
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText ? `${selectId}-helper` : undefined;

    const baseSelectClasses =
      'w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1';
    const normalClasses =
      'border-slate-200 focus:border-blue-500 focus:ring-blue-500';
    const errorClasses =
      'border-red-300 focus:border-red-500 focus:ring-red-500';

    const selectClasses = `${baseSelectClasses} ${
      error ? errorClasses : normalClasses
    } ${className}`;

    return (
      <div className="space-y-1">
        <label
          htmlFor={selectId}
          className={`block text-sm font-medium text-slate-700 ${
            !showLabel ? 'sr-only' : ''
          }`}
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-label="required">
              *
            </span>
          )}
        </label>

        <select
          ref={ref}
          id={selectId}
          className={selectClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            [errorId, helperId].filter(Boolean).join(' ') || undefined
          }
          aria-required={required}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {helperText && !error && (
          <p id={helperId} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}

        {error && (
          <p id={errorId} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleSelect.displayName = 'AccessibleSelect';
