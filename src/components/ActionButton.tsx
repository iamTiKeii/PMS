"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "success" | "warning";
  size?: "sm" | "md" | "lg";
}

export function ActionButton({
  children,
  isLoading = false,
  loadingText = "Đang xử lý...",
  icon,
  variant = "primary",
  size = "md",
  disabled,
  className = "",
  ...props
}: ActionButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs active:bg-slate-100";
      case "danger":
        return "bg-rose-600 hover:bg-rose-700 text-white shadow-xs active:bg-rose-800";
      case "success":
        return "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:bg-emerald-800";
      case "warning":
        return "bg-amber-600 hover:bg-amber-700 text-white shadow-xs active:bg-amber-800";
      case "primary":
      default:
        return "bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:bg-blue-800";
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return "px-2.5 py-1 text-[11px] h-7 gap-1";
      case "lg":
        return "px-4 py-2 text-sm h-10 gap-2";
      case "md":
      default:
        return "px-3 py-1.5 text-xs h-8.5 gap-1.5";
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      className={`rounded-md font-semibold transition-colors flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed select-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-1 ${getVariantStyles()} ${getSizeStyles()} ${className}`}
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
