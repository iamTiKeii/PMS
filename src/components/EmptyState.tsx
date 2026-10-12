"use client";

import React from "react";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`py-12 px-4 flex flex-col items-center justify-center text-center rounded-md border border-dashed border-[#CBD5E1] bg-white ${className}`}
    >
      <div className="w-10 h-10 rounded-md bg-[#F1F3F6] border border-[#DDE2E9] text-[#64748B] flex items-center justify-center mb-3">
        {icon || <FolderOpen className="w-5 h-5 text-[#64748B]" />}
      </div>
      <h3 className="text-sm font-semibold text-[#172033] tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-[#64748B] max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
