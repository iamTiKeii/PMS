"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "success" | "warning";
}

export function ActionButton({
  children,
  isLoading = false,
  loadingText = "Đang xử lý...",
  icon,
  variant = "primary",
  disabled,
  className = "",
  ...props
}: ActionButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return "bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-sm";
      case "danger":
        return "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25";
      case "success":
        return "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25";
      case "warning":
        return "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/25";
      case "primary":
      default:
        return "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/25";
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed select-none ${getVariantStyles()} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
