"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck,
  ChevronRight,
  Clock,
  Sparkles,
  Search,
  Bell,
  CheckCheck,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Shield,
  Layers,
} from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export function Header({ title, subtitle, actionButton }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const json = await res.json();
        if (json.success) setUnreadCount(json.count);
      }
    } catch (err) {
      // ignore silent error
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Poll unread count every 30s
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
      // ignore
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
      // ignore
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
        return "Quản trị Người dùng IAM";
      case "/audit-logs":
        return "Nhật ký Kiểm toán";
      case "/profile":
        return "Thông tin Cá nhân & Bảo mật";
      case "/notifications":
        return "Bảng tin Thông báo";
      case "/telegram":
        return "Cấu hình Telegram";
      default:
        return title;
    }
  };

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case "success":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case "important":
      case "security":
        return <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Info className="w-3.5 h-3.5 text-blue-400" />;
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

      {/* Right Controls: Realtime Clock + Notification Bell + Action Buttons */}
      <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
        {currentTime && (
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{currentTime}</span>
          </div>
        )}

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={handleToggleDropdown}
            className={`relative p-2 rounded-xl border transition-all ${
              dropdownOpen
                ? "bg-blue-600/20 border-blue-500/50 text-white shadow-md shadow-blue-500/20"
                : "bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
            }`}
            title="Thông báo hệ thống"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white font-extrabold text-[10px] flex items-center justify-center animate-pulse border-2 border-[#060913]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Popup */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#090d1a] border border-slate-800 shadow-2xl z-50 overflow-hidden backdrop-blur-2xl">
              <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/70">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-xs">Thông báo</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Đọc tất cả</span>
                  </button>
                )}
              </div>

              {/* Notification List (5 items) */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                {loadingNotifications ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Đang tải thông báo...
                  </div>
                ) : recentNotifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs space-y-1">
                    <p className="font-semibold text-slate-400">Chưa có thông báo mới</p>
                    <p className="text-[11px]">Hệ thống sẽ cập nhật khi có sự kiện phát sinh</p>
                  </div>
                ) : (
                  recentNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleItemClick(n)}
                      className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 ${
                        n.isRead ? "hover:bg-slate-900/60 opacity-80" : "bg-blue-600/5 hover:bg-blue-600/10"
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">{getSeverityIcon(n.severity)}</div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-xs truncate ${n.isRead ? "text-slate-300 font-medium" : "text-white font-bold"}`}>
                            {n.title}
                          </h4>
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {n.content}
                        </p>
                        <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-500">
                          <span>{n.creatorName}</span>
                          <span>{new Date(n.createdAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer View All */}
              <div className="p-2.5 bg-slate-950/80 border-t border-slate-800/80 text-center">
                <Link
                  href="/notifications"
                  onClick={() => setDropdownOpen(false)}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Xem tất cả thông báo (Feed)</span>
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

