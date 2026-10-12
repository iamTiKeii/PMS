"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  Users2,
  UserCog,
  ShieldCheck,
  History,
  Lock,
  LogOut,
  Layers,
  Bell,
  Send,
  UtensilsCrossed,
  X,
  Headset,
  BarChart3,
  Sliders,
  Puzzle,
} from "lucide-react";
import { useToast } from "./Toast";
import { useSidebar } from "./SidebarContext";

interface UserProfile {
  userId: string;
  username: string;
  role: "admin" | "pm" | "user";
  roleName?: string;
  roles?: { id: string; code: string; name: string }[];
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
  }[];
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { success, error } = useToast();
  const { isMobileOpen, closeMobile } = useSidebar();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        success("Đăng xuất thành công.");
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
      title: "Vận hành & Nghiệp vụ",
      items: [
        {
          label: "Quản lý Dự án",
          href: "/projects",
          icon: FolderKanban,
          roles: ["admin", "pm", "user"],
          badge: "HIS",
        },
        {
          label: "Kho Link Docs / Sheets",
          href: "/doc-links",
          icon: FileText,
          roles: ["admin", "pm", "user"],
          badge: "Drive",
        },
        {
          label: "Danh mục Nhân sự",
          href: "/staff",
          icon: Users2,
          roles: ["admin", "pm", "user"],
        },
        {
          label: "Đơn đặt nhóm",
          href: "/group-orders",
          icon: UtensilsCrossed,
          roles: ["admin", "pm", "user"],
          badge: "Order",
        },
      ],
    },
    {
      title: "Hỗ trợ & Vận hành",
      items: [
        {
          label: "Ghi nhận hỗ trợ",
          href: "/support-tickets",
          icon: Headset,
          roles: ["admin", "pm", "user"],
          badge: "Ca HT",
        },
        {
          label: "Báo cáo hỗ trợ",
          href: "/support-tickets/reports",
          icon: BarChart3,
          roles: ["admin", "pm", "user"],
        },
        {
          label: "Danh mục hỗ trợ",
          href: "/support-tickets/master-data",
          icon: Sliders,
          roles: ["admin"],
          badge: "MD",
        },
        {
          label: "Extension Chrome",
          href: "/support-tickets/extension",
          icon: Puzzle,
          roles: ["admin", "pm", "user"],
          badge: "v1.0",
        },
      ],
    },
    {
      title: "Quản trị & Hệ thống",
      items: [
        {
          label: "Cấu hình Telegram",
          href: "/telegram",
          icon: Send,
          roles: ["admin"],
          badge: "Bot",
        },
        {
          label: "Tài khoản hệ thống",
          href: "/users",
          icon: UserCog,
          roles: ["admin"],
          badge: "IAM",
        },
        {
          label: "Quản trị truy cập",
          href: "/access-control",
          icon: ShieldCheck,
          roles: ["admin"],
          badge: "RBAC",
        },
        {
          label: "Nhật ký Kiểm toán",
          href: "/audit-logs",
          icon: History,
          roles: ["admin"],
        },
        {
          label: "Hồ sơ & Bảo mật",
          href: "/profile",
          icon: Lock,
          roles: ["admin", "pm", "user"],
        },
      ],
    },
  ];

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full select-none bg-[#18283F] text-[#94A3B8]">
      {/* Brand Header */}
      <div className="h-14 px-4 border-b border-[#233752] flex items-center justify-between">
        <Link
          href="/"
          onClick={isMobile ? closeMobile : undefined}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-md bg-[#2457A7] flex items-center justify-center text-white shrink-0 shadow-xs group-hover:bg-[#1C4585] transition-colors">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-[#FFFFFF] tracking-tight flex items-center gap-1.5">
              <span>{process.env.NEXT_PUBLIC_APP_NAME || "ISF Can Tho Hub"}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#1F3657] text-[#CBD5E1] border border-[#2D4769]">
                v2.4
              </span>
            </div>
            <div className="text-[10px] text-[#64748B] truncate font-normal leading-tight">
              ISF Cần Thơ • Operations
            </div>
          </div>
        </Link>
        {isMobile && (
          <button
            type="button"
            onClick={closeMobile}
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-[#1F3657] transition-colors"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav aria-label="Thanh điều hướng chính" className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navSections.map((section, idx) => {
          const visibleItems = section.items.filter(
            (item) => !user || item.roles.includes(user.role)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                {section.title}
              </div>

              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={isMobile ? closeMobile : undefined}
                      className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-colors ${
                        isActive
                          ? "bg-[#2457A7] text-[#FFFFFF] font-semibold shadow-xs"
                          : "text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-[#1F3657] font-medium"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? "text-[#FFFFFF]" : "text-[#64748B] group-hover:text-[#CBD5E1]"
                        }`}
                      />
                      <span className="flex-1 truncate tracking-tight">{item.label}</span>

                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                            isActive
                              ? "bg-[#1C4585] text-[#FFFFFF] border-[#3B6DB5]"
                              : "bg-[#1F3657] text-[#CBD5E1] border-[#2D4769]"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-[#233752] bg-[#142236]">
        {user ? (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-[#1F3657]/70 transition-colors">
            <Link
              href="/profile"
              onClick={isMobile ? closeMobile : undefined}
              className="flex items-center gap-2 min-w-0 flex-1"
            >
              <div className="w-7 h-7 rounded-md bg-[#2457A7] text-white flex items-center justify-center font-bold text-[11px] uppercase shrink-0">
                {user.fullName ? user.fullName.charAt(0) : user.username.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#FFFFFF] truncate">
                  {user.fullName || user.username}
                </div>
                <div className="text-[10px] text-[#38BDF8] font-semibold truncate max-w-[130px]" title={user.roleName || user.role}>
                  {user.roleName || (user.role === "admin" ? "Quản trị viên (ADMIN)" : user.role)}
                </div>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F87171] hover:bg-[#2A1D25] transition-colors shrink-0"
              title="Đăng xuất"
              aria-label="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            onClick={isMobile ? closeMobile : undefined}
            className="w-full py-1.5 px-3 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Đăng nhập</span>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky/Static Sidebar */}
      <aside className="hidden lg:flex w-60 bg-[#18283F] border-r border-[#233752] flex-col shrink-0 min-h-screen relative z-40">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Off-Canvas */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#0F172A]/70 backdrop-blur-xs transition-opacity"
            onClick={closeMobile}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <aside className="fixed inset-y-0 left-0 w-64 bg-[#18283F] border-r border-[#233752] z-50 flex flex-col shadow-2xl">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
