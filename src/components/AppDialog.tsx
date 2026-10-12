"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

export interface AppDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  showCloseButton?: boolean;
  className?: string;
}

/**
 * Enterprise Native HTML <dialog> component
 * Uses native showModal() to ensure real top-layer rendering above backdrop
 * Handles focus trapping, keyboard Escape, and return focus semantics.
 */
export function AppDialog({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = "max-w-md",
  closeOnBackdropClick = true,
  closeOnEscape = true,
  initialFocusRef,
  ariaLabelledBy = "app-dialog-title",
  ariaDescribedBy = "app-dialog-desc",
  showCloseButton = true,
  className = "",
}: AppDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Sync open/close state with native showModal() / close()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        previousActiveElement.current = document.activeElement as HTMLElement | null;
        try {
          dialog.showModal();
        } catch {
          // Fallback if already open
        }

        // Manage initial focus
        requestAnimationFrame(() => {
          if (initialFocusRef?.current) {
            initialFocusRef.current.focus();
          } else {
            const firstFocusable = dialog.querySelector<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (firstFocusable) {
              firstFocusable.focus();
            }
          }
        });
      }
    } else {
      if (dialog.open) {
        dialog.close();
        if (previousActiveElement.current && typeof previousActiveElement.current.focus === "function") {
          previousActiveElement.current.focus();
        }
      }
    }
  }, [isOpen, initialFocusRef]);

  // Handle native cancel event (Escape key)
  const handleCancel = useCallback(
    (e: React.SyntheticEvent<HTMLDialogElement, Event>) => {
      e.preventDefault();
      if (closeOnEscape) {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (!closeOnBackdropClick) return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;

      if (!isInDialog) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose]
  );

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className="m-auto fixed inset-0 z-50 p-4 sm:p-6 bg-transparent overflow-visible focus:outline-none"
      aria-labelledby={title ? ariaLabelledBy : undefined}
      aria-describedby={subtitle ? ariaDescribedBy : undefined}
    >
      <div
        className={`w-full ${maxWidth} bg-white border border-[#DDE2E9] rounded-lg shadow-xl animate-modal-enter text-[#172033] flex flex-col max-h-[90vh] overflow-hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || icon) && (
          <div className="flex items-start justify-between p-4 sm:p-5 border-b border-[#EDF1F5] shrink-0">
            <div className="flex items-start gap-3 min-w-0 pr-3">
              {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
              <div className="space-y-0.5 min-w-0">
                {title && (
                  <h3
                    id={ariaLabelledBy}
                    className="text-sm sm:text-base font-bold text-[#172033] tracking-tight leading-snug"
                  >
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p id={ariaDescribedBy} className="text-xs text-[#64748B] font-normal leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#172033] hover:bg-[#F1F3F6] transition-colors shrink-0 cursor-pointer"
                title="Đóng (Esc)"
                aria-label="Đóng cửa sổ"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto text-xs text-[#475569] leading-relaxed flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-3.5 sm:p-4 bg-[#F8FAFC] border-t border-[#EDF1F5] flex items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
