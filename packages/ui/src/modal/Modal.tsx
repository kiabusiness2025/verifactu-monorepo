"use client";
import * as React from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  isFullscreen?: boolean;
  showCloseButton?: boolean;
}

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ isOpen, onClose, className = "", children, isFullscreen = false, showCloseButton = false }, ref) => {
    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? 'w-full h-screen' : ''}`}
        onClick={!isFullscreen ? onClose : undefined}
      >
        {!isFullscreen && (
          <div
            className="fixed inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
        <div
          className={`relative bg-white rounded-lg shadow-lg ${isFullscreen ? 'w-full h-screen rounded-none' : ''} ${className}`}
          onClick={!isFullscreen ? (e) => e.stopPropagation() : undefined}
        >
          {showCloseButton && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              aria-label="Close modal"
            >
              ✕
            </button>
          )}
          {children}
        </div>
      </div>
    );
  }
);

Modal.displayName = "Modal";
