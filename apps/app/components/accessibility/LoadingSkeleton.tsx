/**
 * Loading Skeleton Components
 * Provides accessible loading states with proper ARIA attributes
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-slate-200';

  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]',
    none: '',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      role="status"
      aria-label="Loading..."
    >
      <span className="sr-only">Cargando...</span>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="space-y-3" role="status" aria-label="Loading table">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-6 flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC<{ showImage?: boolean }> = ({ showImage = true }) => {
  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-6 space-y-4"
      role="status"
      aria-label="Loading card"
    >
      {showImage && <Skeleton variant="rectangular" height={200} />}
      <Skeleton width="60%" />
      <Skeleton width="100%" />
      <Skeleton width="80%" />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width={80} height={32} />
        <Skeleton variant="rectangular" width={80} height={32} />
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton width="40%" height={32} />
        <Skeleton width="60%" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`stat-${i}`} className="rounded-lg border border-slate-200 bg-white p-6">
            <Skeleton width="50%" className="mb-3" />
            <Skeleton width="30%" height={36} />
          </div>
        ))}
      </div>

      {/* Chart Placeholder */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <Skeleton width="30%" className="mb-4" />
        <Skeleton variant="rectangular" height={300} />
      </div>
    </div>
  );
};

export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => {
  return (
    <div className="space-y-3" role="status" aria-label="Loading list">
      {Array.from({ length: items }).map((_, i) => (
        <div key={`item-${i}`} className="flex items-center gap-4">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" />
            <Skeleton width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
};
