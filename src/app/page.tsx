"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import {
  FileText,
  FolderKanban,
  KeyRound,
  Users2,
  ExternalLink,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  Activity,
  CheckCircle2,
  Lock,
  Search,
  Copy,
  Check,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/Toast";

export default function DashboardPage() {
  const { success } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const json = await res.json();
          if (json.success) setStats(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    success("Đã sao chép link hệ thống HIS vào bộ nhớ tạm!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#060913] bg-cyber-grid">
      <Header
        title="Bảng Điều khiển Tổng quan"
        subtitle="Hệ thống Quản trị Tập trung Tài sản Số, Nhân sự & Két Mật khẩu Dự án"
        actionButton={
          <div className="flex items-center gap-2.5">
            <Link
              href="/doc-links"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 flex items-center gap-1.5 transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Thêm Link Docs</span>
            </Link>
            <Link
              href="/vault"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/25 flex items-center gap-1.5 transition-all"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Mở Két Mật khẩu</span>
            </Link>
          </div>
        }
      />

      <div className="p-6 md:p-8 space-y-8 max-w-7xl w-full mx-auto">
        {/* Hero Welcome Banner with Cyber Gradients */}
        <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-950 border border-blue-500/20 shadow-2xl overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-cyan-400 border border-blue-500/20 text-[11px] font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Trung tâm Điều hành Dự án Tập trung</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {getGreeting()}, <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">Quản trị viên</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Hệ thống quản trị tài sản số, liên kết dự án, tài khoản đăng nhập và nhân sự phụ trách.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái Hệ thống</div>
                <div className="text-sm font-extrabold text-emerald-400 flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Hoạt động ổn định
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Interactive KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Projects */}
          <Link
            href="/projects"
            className="group p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800/80 shadow-xl hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/15 transition-all" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Dự án & Link HIS
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FolderKanban className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight relative z-10">
              {loading ? (
                <div className="w-12 h-8 bg-slate-800 animate-pulse rounded-lg" />
              ) : (
                stats?.counts.projects || 0
              )}
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between relative z-10">
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Đang vận hành thực tế
              </span>
              <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-bold">
                Chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>

          {/* Card 2: Doc Links */}
          <Link
            href="/doc-links"
            className="group p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800/80 shadow-xl hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Link Docs / Sheets
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight relative z-10">
              {loading ? (
                <div className="w-12 h-8 bg-slate-800 animate-pulse rounded-lg" />
              ) : (
                stats?.counts.docLinks || 0
              )}
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between relative z-10">
              <span className="text-[11px] text-cyan-400 font-semibold">Tự động bóc tách ID</span>
              <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-bold">
                Mở kho <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>

          {/* Card 3: Credential Vault */}
          <Link
            href="/vault"
            className="group p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800/80 shadow-xl hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/15 transition-all" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Két Mật khẩu Site
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <KeyRound className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight relative z-10">
              {loading ? (
                <div className="w-12 h-8 bg-slate-800 animate-pulse rounded-lg" />
              ) : (
                stats?.counts.accounts || 0
              )}
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between relative z-10">
              <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Bảo mật an toàn
              </span>
              <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-bold">
                Két khóa <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>

          {/* Card 4: Staff Directory */}
          <Link
            href="/staff"
            className="group p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800/80 shadow-xl hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/15 transition-all" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Danh bạ Nhân sự
              </span>
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight relative z-10">
              {loading ? (
                <div className="w-12 h-8 bg-slate-800 animate-pulse rounded-lg" />
              ) : (
                stats?.counts.staff || 0
              )}
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between relative z-10">
              <span className="text-[11px] text-purple-400 font-semibold">Phân cấp L1 / L2 / L3</span>
              <span className="text-purple-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-bold">
                Xem <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        </div>

        {/* Two-Column Grid: Active Projects & Recent Docs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
          {/* Section: Urgent / Active Projects */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-tight">Dự án Đang Vận hành Trọng điểm</h3>
                  <p className="text-[11px] text-slate-400">Danh sách dự án đang vận hành</p>
                </div>
              </div>
              <Link href="/projects" className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
                Tất cả ({stats?.counts.projects || 0}) <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="py-8 text-center text-slate-500 text-xs">Đang tải dữ liệu dự án...</div>
              ) : !stats?.urgentProjects || stats.urgentProjects.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">Chưa có dự án nào đang hoạt động.</div>
              ) : (
                stats.urgentProjects.map((p: any) => {
                  const leadStaff = p.assignments?.find((a: any) => a.tierLevel === 1)?.staff;
                  const pmStaff = p.assignments?.find((a: any) => a.tierLevel === 2)?.staff;

                  return (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                            {p.projectCode || "PROJECT"}
                          </span>
                          <span className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                            {p.projectName}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          {leadStaff && (
                            <span className="truncate">
                              L1 Lead: <strong className="text-slate-300">{leadStaff.fullName}</strong>
                            </span>
                          )}
                          {pmStaff && (
                            <span className="truncate">
                              L2 PM: <strong className="text-slate-300">{pmStaff.fullName}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(p.systemHisUrl, p.id)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Sao chép link hệ thống HIS"
                        >
                          {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <a
                          href={p.systemHisUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <span>Mở HIS</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section: Recent Doc Links */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-tight">Tài liệu Số Mới Cập nhật</h3>
                  <p className="text-[11px] text-slate-400">Tài liệu, biểu mẫu và liên kết quan trọng</p>
                </div>
              </div>
              <Link href="/doc-links" className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1">
                Tất cả ({stats?.counts.docLinks || 0}) <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="py-8 text-center text-slate-500 text-xs">Đang tải kho tài liệu...</div>
              ) : !stats?.recentLinks || stats.recentLinks.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">Chưa có liên kết tài liệu nào.</div>
              ) : (
                stats.recentLinks.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                            doc.linkCategory === "docs"
                              ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                              : doc.linkCategory === "sheets"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {doc.linkCategory}
                        </span>
                        <span className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                          {doc.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-sm">
                        {doc.targetUrl}
                      </div>
                    </div>

                    <a
                      href={doc.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-300 border border-slate-700 transition-all shrink-0"
                      title="Mở tài liệu trên tab mới"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section: Live Security Audit Trail (Admin only or summary) */}
        {stats?.recentLogs && stats.recentLogs.length > 0 && (
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-tight">Nhật ký Hoạt động An ninh Hệ thống (Live Audit Feed)</h3>
                  <p className="text-[11px] text-slate-400">Ghi nhận bất biến 100% các thao tác thay đổi và mở mật khẩu</p>
                </div>
              </div>
              <Link href="/audit-logs" className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1">
                Xem toàn bộ nhật ký <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.recentLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-3 text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0 animate-pulse" />
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] font-bold text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded truncate">
                        {log.actionCode}
                      </span>
                      <span className="text-[10px] text-slate-500">{formatDate(log.createdAt)}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Người thực hiện: <strong className="text-slate-200">{log.user?.username || "System"}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
