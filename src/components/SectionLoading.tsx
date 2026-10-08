"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface SectionLoadingProps {
  text?: string;
  minHeight?: string;
  className?: string;
  overlay?: boolean; // Nếu true, phủ lên container cha có position: relative
  size?: "sm" | "md" | "lg";
}

export function SectionLoading({
  text = "Đang tải dữ liệu...",
  minHeight = "160px",
  className = "",
  overlay = false,
  size = "md",
}: SectionLoadingProps) {
  const iconSizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-7 h-7" : "w-5 h-5";
  const boxSizeClass = size === "sm" ? "w-8 h-8 rounded-xl" : size === "lg" ? "w-12 h-12 rounded-2xl" : "w-10 h-10 rounded-2xl";
  const textSizeClass = size === "sm" ? "text-[11px]" : size === "lg" ? "text-sm" : "text-xs";

  if (overlay) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm rounded-3xl p-4 transition-all duration-200 pointer-events-auto ${className}`}
      >
        <div className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <Loader2 className={`${iconSizeClass} text-cyan-400 animate-spin`} />
          <span className={`${textSizeClass} font-semibold text-slate-200`}>{text}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ minHeight }}
      className={`flex flex-col items-center justify-center p-6 text-center space-y-2.5 select-none ${className}`}
    >
      <div className={`${boxSizeClass} bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-cyan-400 shadow-sm`}>
        <Loader2 className={`${iconSizeClass} animate-spin`} />
      </div>
      <p className={`${textSizeClass} font-medium text-slate-400`}>{text}</p>
    </div>
  );
}
