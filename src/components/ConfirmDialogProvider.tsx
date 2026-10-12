"use client";

import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import { AppDialog } from "./AppDialog";
import { AlertTriangle, AlertCircle, CheckCircle2, HelpCircle, Loader2 } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "primary" | "success";

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  subtitle?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: React.ReactNode;
  maxWidth?: string;
  onConfirm?: () => Promise<void> | void;
}

export interface AlertOptions {
  title: string;
  message: React.ReactNode;
  buttonText?: string;
  variant?: "info" | "warning" | "danger" | "success";
  icon?: React.ReactNode;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);

  // Alert Dialog State
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertOptions, setAlertOptions] = useState<AlertOptions | null>(null);
  const alertResolveRef = useRef<(() => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmOptions(options);
      setConfirmError(null);
      setConfirmLoading(false);
      setConfirmOpen(true);
    });
  }, []);

  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      alertResolveRef.current = resolve;
      setAlertOptions(options);
      setAlertOpen(true);
    });
  }, []);

  const handleCancel = useCallback(() => {
    if (confirmLoading) return; // Prevent closing while processing request
    setConfirmOpen(false);
    if (confirmResolveRef.current) {
      confirmResolveRef.current(false);
      confirmResolveRef.current = null;
    }
  }, [confirmLoading]);

  const handleConfirm = useCallback(async () => {
    if (confirmLoading) return;

    if (confirmOptions?.onConfirm) {
      setConfirmLoading(true);
      setConfirmError(null);
      try {
        await confirmOptions.onConfirm();
        setConfirmOpen(false);
        if (confirmResolveRef.current) {
          confirmResolveRef.current(true);
          confirmResolveRef.current = null;
        }
      } catch (err: any) {
        console.error("Confirm action error:", err);
        setConfirmError(err?.message || "Đã xảy ra lỗi khi thực hiện thao tác. Vui lòng thử lại.");
        // Keep dialog open on error as required by BR/UX guidelines
      } finally {
        setConfirmLoading(false);
      }
    } else {
      setConfirmOpen(false);
      if (confirmResolveRef.current) {
        confirmResolveRef.current(true);
        confirmResolveRef.current = null;
      }
    }
  }, [confirmLoading, confirmOptions]);

  const handleAlertClose = useCallback(() => {
    setAlertOpen(false);
    if (alertResolveRef.current) {
      alertResolveRef.current();
      alertResolveRef.current = null;
    }
  }, []);

  // Icon & color styling according to variant
  const getConfirmStyle = (variant: ConfirmVariant = "danger") => {
    switch (variant) {
      case "danger":
        return {
          icon: (
            <div className="w-8 h-8 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#B91C1C] shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          ),
          btnClass:
            "bg-[#B91C1C] hover:bg-[#991B1B] text-white shadow-xs focus:ring-2 focus:ring-[#B91C1C]/20",
        };
      case "warning":
        return {
          icon: (
            <div className="w-8 h-8 rounded-full bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#B45309] shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          ),
          btnClass:
            "bg-[#D97706] hover:bg-[#B45309] text-white shadow-xs focus:ring-2 focus:ring-[#D97706]/20",
        };
      case "success":
        return {
          icon: (
            <div className="w-8 h-8 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#15803D] shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ),
          btnClass:
            "bg-[#15803D] hover:bg-[#166534] text-white shadow-xs focus:ring-2 focus:ring-[#15803D]/20",
        };
      case "primary":
      default:
        return {
          icon: (
            <div className="w-8 h-8 rounded-full bg-[#E5EDFA] border border-[#BFD4F7] flex items-center justify-center text-[#2457A7] shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
          ),
          btnClass:
            "bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs focus:ring-2 focus:ring-[#2457A7]/20",
        };
    }
  };

  const currentStyle = getConfirmStyle(confirmOptions?.variant);

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}

      {/* Reusable Confirm Dialog */}
      <AppDialog
        isOpen={confirmOpen}
        onClose={handleCancel}
        title={confirmOptions?.title || "Xác nhận thao tác"}
        subtitle={confirmOptions?.subtitle}
        icon={confirmOptions?.icon || currentStyle.icon}
        maxWidth={confirmOptions?.maxWidth || "max-w-md"}
        closeOnEscape={!confirmLoading}
        closeOnBackdropClick={!confirmLoading}
        showCloseButton={!confirmLoading}
        footer={
          <>
            <button
              type="button"
              onClick={handleCancel}
              disabled={confirmLoading}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:text-[#172033] hover:bg-[#F1F3F6] border border-[#DDE2E9] bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {confirmOptions?.cancelText || "Hủy"}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirmLoading}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${currentStyle.btnClass}`}
            >
              {confirmLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{confirmOptions?.confirmText || "Xác nhận"}</span>
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="text-xs text-[#334155] leading-relaxed">
            {confirmOptions?.message}
          </div>

          {/* Error Banner inside dialog when action fails */}
          {confirmError && (
            <div className="p-2.5 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{confirmError}</span>
            </div>
          )}
        </div>
      </AppDialog>

      {/* Reusable Alert Dialog */}
      <AppDialog
        isOpen={alertOpen}
        onClose={handleAlertClose}
        title={alertOptions?.title || "Thông báo"}
        maxWidth="max-w-sm"
        icon={
          alertOptions?.icon || (
            <div className="w-8 h-8 rounded-full bg-[#E5EDFA] border border-[#BFD4F7] flex items-center justify-center text-[#2457A7] shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
          )
        }
        footer={
          <button
            type="button"
            onClick={handleAlertClose}
            className="px-4 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {alertOptions?.buttonText || "Đã hiểu"}
          </button>
        }
      >
        <div className="text-xs text-[#334155] leading-relaxed">
          {alertOptions?.message}
        </div>
      </AppDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  }
  return context;
}
