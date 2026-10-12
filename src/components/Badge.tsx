"use client";

import React from "react";

export type BadgeVariant =
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "neutral"
  | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
}: BadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]";
      case "info":
        return "bg-[#E5EDFA] text-[#2457A7] border-[#BFD4F7]";
      case "warning":
        return "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]";
      case "danger":
        return "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]";
      case "purple":
        return "bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF]";
      case "neutral":
      default:
        return "bg-[#F1F3F6] text-[#475569] border-[#DDE2E9]";
    }
  };

  const getDotStyles = () => {
    switch (variant) {
      case "success":
        return "bg-[#15803D]";
      case "info":
        return "bg-[#2457A7]";
      case "warning":
        return "bg-[#B45309]";
      case "danger":
        return "bg-[#B91C1C]";
      case "purple":
        return "bg-[#7E22CE]";
      case "neutral":
      default:
        return "bg-[#64748B]";
    }
  };

  const getSizeStyles = () => {
    return size === "sm" ? "px-1.5 py-0.2 text-[10px]" : "px-2 py-0.5 text-[11px]";
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded whitespace-nowrap ${getVariantStyles()} ${getSizeStyles()} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getDotStyles()}`} />}
      {children}
    </span>
  );
}
