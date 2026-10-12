"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  Bell,
  CheckCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Menu,
} from "lucide-react";
import { useSidebar } from "./SidebarContext";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export function Header({ title, subtitle, actionButton }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleMobile } = useSidebar();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const json = await res.json();
        if (json.success) setUnreadCount(json.count);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const poll = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(poll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchRecentNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch("/api/notifications?limit=5");
      if (res.ok) {
        const json = await res.json();
        if (json.success) setRecentNotifications(json.data);
      }
    } catch {
      // silent
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleToggleDropdown = () => {
    const nextState = !dropdownOpen;
    setDropdownOpen(nextState);
    if (nextState) {
      fetchRecentNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (res.ok) {
        setUnreadCount(0);
        setRecentNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch {
      // silent
    }
  };

  const handleItemClick = async (n: any) => {
    if (!n.isRead) {
      fetch(`/api/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
      setUnreadCount((c) => Math.max(0, c - 1));
      setRecentNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
      );
    }
    setDropdownOpen(false);
    if (n.targetUrl) {
      router.push(n.targetUrl);
    } else {
      router.push("/notifications");
    }
  };

  const getBreadcrumbName = (path: string) => {
    switch (path) {
      case "/":
        return "Bảng Tổng quan";
      case "/doc-links":
        return "Kho Link Docs & Sheets";
      case "/projects":
        return "Quản lý Dự án & Level";
      case "/staff":
        return "Danh mục Nhân sự";
      case "/users":
        return "Danh mục Tài khoản Người dùng";
      case "/access-control":
        return "Quản trị truy cập";
      case "/audit-logs":
        return "Nhật ký Kiểm toán";
      case "/profile":
        return "Thông tin Cá nhân & Bảo mật";
      case "/notifications":
        return "Bảng tin Thông báo";
      case "/telegram":
        return "Cấu hình Telegram";
      case "/group-orders":
        return "Đơn đặt nhóm";
      default:
        if (path.startsWith("/group-orders/")) return "Chi tiết đơn đặt nhóm";
        if (path.startsWith("/projects/")) return "Chi tiết dự án";
        return title;
    }
  };

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case "success":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />;
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />;
      case "important":
      case "security":
        return <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#DDE2E9] px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-4 shadow-[0_1px_2px_rgba(23,32,51,0.02)]">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={toggleMobile}
          className="p-1.5 -ml-1 rounded-md text-[#64748B] hover:text-[#172033] hover:bg-[#F1F3F6] transition-colors lg:hidden shrink-0"
          aria-label="Mở menu điều hướng"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="space-y-0.5 min-w-0">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#64748B]">
            <Link href="/" className="hover:text-[#2457A7] transition-colors">
              Trang chủ
            </Link>
            {pathname !== "/" && (
              <>
                <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
                <span className="text-[#172033] font-semibold truncate">{getBreadcrumbName(pathname)}</span>
              </>
            )}
          </div>

          {/* Page Title & Subtitle */}
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-base sm:text-lg font-bold text-[#172033] tracking-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="hidden md:inline text-xs text-[#64748B] truncate font-normal">
                — {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right Controls: Notification Bell + Action Button */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Notification Bell Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={handleToggleDropdown}
            className={`relative p-2 rounded-md border transition-colors ${
              dropdownOpen
                ? "bg-[#F1F3F6] border-[#CBD5E1] text-[#172033]"
                : "bg-white border-[#DDE2E9] text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC]"
            }`}
            title="Thông báo hệ thống"
            aria-label={`Thông báo hệ thống${unreadCount > 0 ? `, có ${unreadCount} thông báo mới` : ""}`}
            aria-expanded={dropdownOpen}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 rounded-full bg-[#B91C1C] text-white font-bold text-[10px] flex items-center justify-center border border-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Popup */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-white border border-[#DDE2E9] shadow-xl z-50 overflow-hidden text-[#172033]">
              <div className="p-3 border-b border-[#DDE2E9] flex items-center justify-between bg-[#F8FAFC]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#172033]">Thông báo</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-[#FEF2F2] text-[#B91C1C] text-[10px] font-semibold border border-[#FECACA]">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Đã đọc tất cả</span>
                  </button>
                )}
              </div>

              {/* Notification List (5 items) */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {loadingNotifications ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Đang tải thông báo...
                  </div>
                ) : recentNotifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs space-y-1">
                    <p className="font-semibold text-slate-700">Chưa có thông báo mới</p>
                    <p className="text-[11px]">Hệ thống sẽ cập nhật khi có sự kiện phát sinh</p>
                  </div>
                ) : (
                  recentNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleItemClick(n)}
                      className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 ${
                        n.isRead ? "hover:bg-slate-50 opacity-75" : "bg-blue-50/40 hover:bg-blue-50/80"
                      }`}
                    >
                      {getSeverityIcon(n.severity)}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-xs truncate ${n.isRead ? "text-slate-700 font-medium" : "text-slate-900 font-bold"}`}>
                            {n.title}
                          </h4>
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {n.content}
                        </p>
                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                          <span>{n.creatorName || "Hệ thống"}</span>
                          <span>{new Date(n.createdAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer View All */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
                <Link
                  href="/notifications"
                  onClick={() => setDropdownOpen(false)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 transition-colors"
                >
                  <span>Xem tất cả thông báo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {actionButton}
      </div>
    </header>
  );
}
