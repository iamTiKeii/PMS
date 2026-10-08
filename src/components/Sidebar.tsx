"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  KeyRound,
  Users2,
  UserCog,
  History,
  Lock,
  LogOut,
  ShieldCheck,
  Layers,
  Sparkles,
  ChevronRight,
  Bell,
  Send,
} from "lucide-react";
import { useToast } from "./Toast";

interface UserProfile {
  userId: string;
  username: string;
  role: "admin" | "pm" | "user";
  staffId?: string | null;
  fullName?: string;
}

interface SidebarProps {
  user: UserProfile | null;
}

interface NavSection {
  title: string;
  items: {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: string[];
    badge?: string;
    badgeColor?: string;
    highlight?: boolean;
  }[];
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { success, error } = useToast();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        success("Đăng xuất thành công. Hẹn gặp lại bạn!");
        router.push("/login");
        router.refresh();
      }
    } catch {
      error("Lỗi khi đăng xuất.");
    }
  };

  const navSections: NavSection[] = [
    {
      title: "Tổng quan",
      items: [
        {
          label: "Bảng Điều khiển",
          href: "/",
          icon: LayoutDashboard,
          roles: ["admin", "pm", "user"],
        },
        {
          label: "Bảng tin Thông báo",
          href: "/notifications",
          icon: Bell,
          roles: ["admin", "pm", "user"],
        },
      ],
    },
    {
      title: "Tài nguyên & Vận hành",
      items: [
        {
          label: "Kho Link Docs / Sheets",
          href: "/doc-links",
          icon: FileText,
          roles: ["admin", "pm", "user"],
          badge: "Drive",
          badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        },
        {
          label: "Quản lý Dự án",
          href: "/projects",
          icon: FolderKanban,
          roles: ["admin", "pm", "user"],
          badge: "HIS",
          badgeColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
        },
        {
          label: "Danh mục Nhân sự",
          href: "/staff",
          icon: Users2,
          roles: ["admin", "pm", "user"],
        },
      ],
    },
    {
      title: "Quản trị & An toàn",
      items: [
        {
          label: "Cấu hình Telegram",
          href: "/telegram",
          icon: Send,
          roles: ["admin"],
          badge: "Bot",
          badgeColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
        },
        {
          label: "Quản trị Người dùng",
          href: "/users",
          icon: UserCog,
          roles: ["admin"],
          badge: "IAM",
          badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/30",
        },
        {
          label: "Nhật ký Kiểm toán",
          href: "/audit-logs",
          icon: History,
          roles: ["admin"],
        },
        {
          label: "Bảo mật & Đổi MK",
          href: "/profile",
          icon: Lock,
          roles: ["admin", "pm", "user"],
        },
      ],
    },
  ];

  return (
    <aside className="w-72 bg-[#090d1a]/95 backdrop-blur-2xl border-r border-slate-800/80 flex flex-col shrink-0 min-h-screen select-none relative z-40 transition-all">
      {/* Subtle Background Glow behind brand */}
      <div className="absolute top-0 left-0 w-full h-36 bg-gradient-to-b from-blue-600/10 via-indigo-600/5 to-transparent pointer-events-none" />

      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/70 relative">
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 group-hover:shadow-blue-500/40 transition-all duration-300 ring-1 ring-white/20">
              <Layers className="w-5 h-5 transition-transform group-hover:rotate-6" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#090d1a] animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="font-extrabold text-base text-white tracking-tight flex items-center gap-2">
              <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                PMS Hub
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                PRO
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1.5 mt-0.5">
              <span>Operations & Vault Platform</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3.5 py-4 space-y-6 overflow-y-auto">
        {navSections.map((section, idx) => {
          const visibleItems = section.items.filter(
            (item) => !user || item.roles.includes(user.role)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1.5">
              <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                <span>{section.title}</span>
              </div>

              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 font-bold"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                      )}

                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          isActive
                            ? "bg-white/15 text-white"
                            : item.highlight
                            ? "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 group-hover:scale-105"
                            : "bg-slate-800/80 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <span className="flex-1 truncate tracking-tight">{item.label}</span>

                      {item.badge && !isActive && (
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                            item.badgeColor || "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {isActive && (
                        <ChevronRight className="w-3.5 h-3.5 text-white/70" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Security Status Micro Badge */}
      <div className="mx-4 mb-3 p-3 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800/80 shadow-inner">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">Hệ thống Két an toàn</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Hệ thống an toàn
          </span>
          <span className="text-slate-400 font-mono">v2.3</span>
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/60">
        {user ? (
          <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
            <Link href="/profile" className="flex items-center gap-2.5 min-w-0 group flex-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-md ring-1 ring-white/10 group-hover:ring-blue-400/40 transition-all">
                {user.fullName ? user.fullName.charAt(0) : user.username.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                  {user.fullName || user.username}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      user.role === "admin"
                        ? "bg-rose-400"
                        : user.role === "pm"
                        ? "bg-amber-400"
                        : "bg-blue-400"
                    }`}
                  />
                  <span className="uppercase font-extrabold tracking-wider text-[9px] text-slate-300">
                    {user.role}
                  </span>
                </div>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
          >
            <Lock className="w-4 h-4" />
            <span>Đăng nhập hệ thống</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
