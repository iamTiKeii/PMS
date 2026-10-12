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
  Plus,
  Clock,
  ChevronRight,
  Activity,
  CheckCircle2,
  Lock,
  Copy,
  Check,
  UtensilsCrossed,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { Skeleton } from "@/components/Skeleton";

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

  const urgentRequestsCount = stats?.counts?.pendingRequests || 0;
  const activeOrdersCount = stats?.counts?.activeGroupOrders || 0;
  const hasActionableItems = urgentRequestsCount > 0 || activeOrdersCount > 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen">
      <Header
        title="Bảng Điều khiển Tổng quan"
        subtitle="Hệ thống Quản trị Tập trung Dự án, Vận hành QLYC & Két Mật khẩu Site"
        actionButton={
          <div className="flex items-center gap-2">
            <Link
              href="/doc-links"
              className="px-3 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] text-xs font-medium border border-[#DDE2E9] flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#2457A7]" />
              <span>Thêm Link Docs</span>
            </Link>
            <Link
              href="/projects"
              className="px-3 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-medium shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Quản lý Dự án</span>
            </Link>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl w-full mx-auto">
        {/* Action Center: Việc Cần Xử Lý Ngay */}
        {hasActionableItems && (
          <div className="p-4 rounded-md bg-white border border-[#DDE2E9] shadow-xs relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EDF1F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-[#172033] flex items-center gap-2">
                    <span>Việc Cần Xử Lý Ngay (Action Center)</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-[#FFFBEB] text-[#B45309] text-[10px] font-semibold border border-[#FDE68A]">
                      {urgentRequestsCount + activeOrdersCount} mục
                    </span>
                  </h2>
                  <p className="text-[11px] text-[#64748B]">
                    Các yêu cầu nghiệp vụ đang chờ giải quyết và đơn đặt nhóm đang mở gom món
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {urgentRequestsCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7] font-medium text-[11px]">
                    <Clock className="w-3 h-3 text-[#2457A7]" />
                    {urgentRequestsCount} QLYC chờ xử lý
                  </span>
                )}
                {activeOrdersCount > 0 && (
                  <Link
                    href="/group-orders"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-medium text-[11px] hover:bg-[#FEF3C7] transition-colors"
                  >
                    <UtensilsCrossed className="w-3 h-3 text-[#B45309]" />
                    {activeOrdersCount} Đơn đang gom món
                  </Link>
                )}
              </div>
            </div>

            {/* Quick Action Item Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
              {stats?.urgentRequests && stats.urgentRequests.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                    Yêu cầu QLYC ưu tiên cao nhất
                  </span>
                  <div className="space-y-1.5">
                    {stats.urgentRequests.slice(0, 2).map((req: any) => (
                      <Link
                        key={req.id}
                        href={`/projects/${req.projectId}?tab=requests`}
                        className="p-2 rounded-md bg-[#F8FAFC] hover:bg-[#F1F3F6] border border-[#DDE2E9] flex items-center justify-between gap-2 text-xs transition-colors group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-[#2457A7] bg-[#E5EDFA] px-1 rounded border border-[#BFD4F7]">
                              {req.requestCode}
                            </span>
                            <span className="font-semibold text-[#172033] truncate group-hover:text-[#2457A7]">
                              {req.project?.projectName}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#64748B] truncate mt-0.5">
                            Phụ trách: {req.receiver?.fullName || "Chưa gán"}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {req.dueDate ? (
                            <span className="text-[10px] font-medium text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] px-1.5 py-0.5 rounded">
                              Hạn: {new Date(req.dueDate).toLocaleDateString("vi-VN")}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#94A3B8]">Không có hạn</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {stats?.openGroupOrders && stats.openGroupOrders.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                    Đơn đặt nhóm đang gom
                  </span>
                  <div className="space-y-1.5">
                    {stats.openGroupOrders.slice(0, 2).map((order: any) => (
                      <Link
                        key={order.id}
                        href={`/group-orders/${order.id}`}
                        className="p-2 rounded-md bg-[#F8FAFC] hover:bg-[#F1F3F6] border border-[#DDE2E9] flex items-center justify-between gap-2 text-xs transition-colors group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-[#15803D] bg-[#F0FDF4] px-1 rounded border border-[#BBF7D0]">
                              {order.orderCode}
                            </span>
                            <span className="font-semibold text-[#172033] truncate group-hover:text-[#2457A7]">
                              {order.title}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#64748B] truncate mt-0.5">
                            Trưởng nhóm: {order.createdByUser?.staff?.fullName || order.createdByUser?.username} • {order._count?.items || 0} món
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="text-[10px] font-semibold text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] px-1.5 py-0.5 rounded">
                            {order.totalAmount ? `${order.totalAmount.toLocaleString("vi-VN")} đ` : "Đang gom"}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* KPI Metric Tiles Grid (4 Professional Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Tile 1: Projects */}
          <Link
            href="/projects"
            className="p-4 rounded-md bg-white border border-[#DDE2E9] shadow-xs hover:border-[#CBD5E1] transition-colors flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Dự án Đang chạy
              </span>
              <div className="w-8 h-8 rounded-md bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7] flex items-center justify-center">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-[#172033] tracking-tight">
                {loading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  stats?.counts?.projects || 0
                )}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1 flex items-center justify-between">
                <span className="text-[#15803D] font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                  Đang vận hành
                </span>
                <span className="text-[#2457A7] group-hover:underline flex items-center gap-0.5 font-medium">
                  Xem danh sách <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </Link>

          {/* Tile 2: Actionable QLYC Requests */}
          <Link
            href="/projects"
            className="p-4 rounded-md bg-white border border-[#DDE2E9] shadow-xs hover:border-[#CBD5E1] transition-colors flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Yêu cầu QLYC Mở
              </span>
              <div className="w-8 h-8 rounded-md bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-[#172033] tracking-tight">
                {loading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  stats?.counts?.pendingRequests || 0
                )}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1 flex items-center justify-between">
                <span className="text-[#B45309] font-medium">Cần theo dõi xử lý</span>
                <span className="text-[#2457A7] group-hover:underline flex items-center gap-0.5 font-medium">
                  Xem QLYC <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </Link>

          {/* Tile 3: Doc Links */}
          <Link
            href="/doc-links"
            className="p-4 rounded-md bg-white border border-[#DDE2E9] shadow-xs hover:border-[#CBD5E1] transition-colors flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Kho Tài liệu Số
              </span>
              <div className="w-8 h-8 rounded-md bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-[#172033] tracking-tight">
                {loading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  stats?.counts?.docLinks || 0
                )}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1 flex items-center justify-between">
                <span className="text-[#64748B]">Docs / Sheets / Drive</span>
                <span className="text-[#15803D] group-hover:underline flex items-center gap-0.5 font-medium">
                  Mở kho link <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </Link>

          {/* Tile 4: Accounts in Vault */}
          <Link
            href="/vault"
            className="p-4 rounded-md bg-white border border-[#DDE2E9] shadow-xs hover:border-[#CBD5E1] transition-colors flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Tài khoản Két Site
              </span>
              <div className="w-8 h-8 rounded-md bg-[#FAF5FF] text-[#7E22CE] border border-[#E9D5FF] flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-[#172033] tracking-tight">
                {loading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  stats?.counts?.accounts || 0
                )}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1 flex items-center justify-between">
                <span className="text-[#7E22CE] font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Mã hóa PIN
                </span>
                <span className="text-[#7E22CE] group-hover:underline flex items-center gap-0.5 font-medium">
                  Mở Két <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Two-Column Grid: Active Projects & Recent Docs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Section: Urgent / Active Projects */}
          <div className="p-4 rounded-md bg-white border border-[#DDE2E9] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#EDF1F5] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7] flex items-center justify-center">
                  <FolderKanban className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[#172033]">Dự án Đang Vận hành Trọng điểm</h3>
                  <p className="text-[11px] text-[#64748B]">Các hệ thống HIS được phân bổ kỹ thuật</p>
                </div>
              </div>
              <Link href="/projects" className="text-xs text-[#2457A7] hover:underline font-medium flex items-center gap-0.5">
                Xem tất cả ({stats?.counts?.projects || 0}) <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="py-6 text-center text-[#64748B] text-xs">Đang tải dữ liệu dự án...</div>
              ) : !stats?.urgentProjects || stats.urgentProjects.length === 0 ? (
                <div className="py-6 text-center text-[#64748B] text-xs">Chưa có dự án nào đang hoạt động.</div>
              ) : (
                stats.urgentProjects.map((p: any) => {
                  const leadStaff = p.assignments?.find((a: any) => a.tierLevel === 1)?.staff;
                  const pmStaff = p.assignments?.find((a: any) => a.tierLevel === 2)?.staff;

                  return (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] hover:bg-[#F1F3F6] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7] uppercase">
                            {p.projectCode || "PROJECT"}
                          </span>
                          <Link
                            href={`/projects/${p.id}`}
                            className="font-semibold text-[#172033] hover:text-[#2457A7] truncate transition-colors"
                          >
                            {p.projectName}
                          </Link>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                          {leadStaff && (
                            <span className="truncate">
                              Lead L1: <strong className="text-[#172033] font-medium">{leadStaff.fullName}</strong>
                            </span>
                          )}
                          {pmStaff && (
                            <span className="truncate">
                              • PM L2: <strong className="text-[#172033] font-medium">{pmStaff.fullName}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(p.systemHisUrl, p.id)}
                          className="p-1.5 rounded hover:bg-white text-[#64748B] hover:text-[#172033] transition-colors"
                          title="Sao chép link HIS"
                          aria-label="Sao chép link hệ thống HIS"
                        >
                          {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <a
                          href={p.systemHisUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded bg-white hover:bg-[#F8FAFC] text-[#2457A7] border border-[#DDE2E9] text-xs font-medium flex items-center gap-1 transition-colors shadow-xs"
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
          <div className="p-4 rounded-md bg-white border border-[#DDE2E9] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#EDF1F5] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[#172033]">Tài liệu Số Mới Cập nhật</h3>
                  <p className="text-[11px] text-[#64748B]">Google Docs, Sheets và Drive</p>
                </div>
              </div>
              <Link href="/doc-links" className="text-xs text-[#2457A7] hover:underline font-medium flex items-center gap-0.5">
                Xem tất cả ({stats?.counts?.docLinks || 0}) <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="py-6 text-center text-[#64748B] text-xs">Đang tải kho tài liệu...</div>
              ) : !stats?.recentLinks || stats.recentLinks.length === 0 ? (
                <div className="py-6 text-center text-[#64748B] text-xs">Chưa có liên kết tài liệu nào.</div>
              ) : (
                stats.recentLinks.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] hover:bg-[#F1F3F6] transition-colors flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                            doc.linkCategory === "docs"
                              ? "bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7]"
                              : doc.linkCategory === "sheets"
                              ? "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]"
                              : "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                          }`}
                        >
                          {doc.linkCategory}
                        </span>
                        <a
                          href={doc.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[#172033] hover:text-[#2457A7] truncate transition-colors"
                        >
                          {doc.title}
                        </a>
                      </div>
                      <div className="text-[11px] text-[#64748B] truncate max-w-sm">
                        {doc.targetUrl}
                      </div>
                    </div>

                    <a
                      href={doc.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded bg-white hover:bg-[#F1F3F6] text-[#64748B] hover:text-[#2457A7] border border-[#DDE2E9] transition-colors shrink-0 shadow-xs"
                      title="Mở tài liệu trên tab mới"
                      aria-label="Mở tài liệu trên tab mới"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section: Live Security Audit Trail */}
        {stats?.recentLogs && stats.recentLogs.length > 0 && (
          <div className="p-4 rounded-md bg-white border border-[#DDE2E9] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#EDF1F5] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#F1F3F6] text-[#475569] border border-[#DDE2E9] flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[#172033]">Nhật ký Hoạt động An ninh (Audit Trail)</h3>
                  <p className="text-[11px] text-[#64748B]">Ghi nhận các thao tác mở mật khẩu két và đăng nhập</p>
                </div>
              </div>
              <Link href="/audit-logs" className="text-xs text-[#2457A7] hover:underline font-medium flex items-center gap-0.5">
                Xem toàn bộ nhật ký <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {stats.recentLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] flex items-start gap-2 text-xs"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2457A7] mt-1.5 shrink-0" />
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] font-semibold text-[#172033] bg-white border border-[#DDE2E9] px-1 py-0.2 rounded truncate">
                        {log.actionCode}
                      </span>
                      <span className="text-[10px] text-[#64748B]">{formatDate(log.createdAt)}</span>
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      Người thực hiện: <strong className="text-[#172033] font-medium">{log.user?.username || "System"}</strong>
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
