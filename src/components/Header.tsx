"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  ChevronRight,
  Clock,
  Sparkles,
  Search,
} from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export function Header({ title, subtitle, actionButton }: HeaderProps) {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getBreadcrumbName = (path: string) => {
    switch (path) {
      case "/":
        return "Bảng Tổng quan";
      case "/doc-links":
        return "Kho Link Docs & Sheets";
      case "/projects":
        return "Quản lý Dự án & Level";
      case "/vault":
        return "Két Mật khẩu Site";
      case "/staff":
        return "Danh mục Nhân sự";
      case "/users":
        return "Quản trị Người dùng IAM";
      case "/audit-logs":
        return "Nhật ký Kiểm toán";
      case "/profile":
        return "Thông tin Cá nhân & Bảo mật";
      default:
        return title;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#060913]/85 backdrop-blur-xl border-b border-slate-800/80 px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg shadow-black/20">
      <div className="space-y-1">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <Link href="/" className="hover:text-blue-400 transition-colors">
            Trang chủ
          </Link>
          {pathname !== "/" && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-slate-200 font-semibold">{getBreadcrumbName(pathname)}</span>
            </>
          )}
        </div>

        {/* Page Title & Subtitle */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg md:text-xl font-extrabold text-white tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <span className="hidden lg:inline-block text-slate-600 font-light">|</span>
          )}
          {subtitle && (
            <p className="hidden lg:inline-block text-xs text-slate-400 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Controls: Realtime Clock + Action Buttons */}
      <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
        {currentTime && (
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{currentTime}</span>
          </div>
        )}

        {actionButton}
      </div>
    </header>
  );
}
