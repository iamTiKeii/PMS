"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface SectionLoadingProps {
  text?: string;
  minHeight?: string;
  className?: string;
  overlay?: boolean;
  size?: "sm" | "md" | "lg";
}

export function SectionLoading({
  text = "Đang tải dữ liệu...",
  minHeight = "160px",
  className = "",
  overlay = false,
  size = "md",
}: SectionLoadingProps) {
  const iconSizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";
  const boxSizeClass = size === "sm" ? "w-7 h-7 rounded" : size === "lg" ? "w-10 h-10 rounded-lg" : "w-8 h-8 rounded-md";
  const textSizeClass = size === "sm" ? "text-[11px]" : size === "lg" ? "text-sm" : "text-xs";

  if (overlay) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/75 backdrop-blur-xs rounded-lg p-4 transition-all duration-200 pointer-events-auto ${className}`}
      >
        <div className="flex flex-col items-center gap-2 p-3 rounded-md bg-white border border-slate-200 shadow-md">
          <Loader2 className={`${iconSizeClass} text-blue-600 animate-spin`} />
          <span className={`${textSizeClass} font-medium text-slate-700`}>{text}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ minHeight }}
      className={`flex flex-col items-center justify-center p-6 text-center space-y-2 select-none ${className}`}
    >
      <div className={`${boxSizeClass} bg-slate-100 border border-slate-200 flex items-center justify-center text-blue-600`}>
        <Loader2 className={`${iconSizeClass} animate-spin`} />
      </div>
      <p className={`${textSizeClass} font-medium text-slate-500`}>{text}</p>
    </div>
  );
}
