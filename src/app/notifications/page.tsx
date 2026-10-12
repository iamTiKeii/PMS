"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import {
  Bell,
  CheckCheck,
  Plus,
  Trash2,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Shield,
  Layers,
  Clock,
  User,
  ArrowRight,
  Filter,
  Check,
} from "lucide-react";

export default function NotificationsPage() {
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Modal Create Manual Notification (Admin)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("custom");
  const [severity, setSeverity] = useState("info");
  const [targetUrl, setTargetUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Current session user role
  const [userRole, setUserRole] = useState<string>("user");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setUserRole(json.data.role);
        }
      })
      .catch(() => {});
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?filter=${filter}&page=${page}&limit=15`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setNotifications(json.data);
          setTotalPages(json.meta?.totalPages || 1);
          setTotalItems(json.meta?.total || 0);
          setUnreadCount(json.meta?.unreadCount || 0);
        }
      }
    } catch {
      error("Lỗi tải danh sách thông báo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter, page]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      error("Lỗi cập nhật trạng thái đã đọc.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        success("Đã đánh dấu tất cả thông báo là đã đọc.");
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      } else {
        error(json.error?.message || "Lỗi cập nhật.");
      }
    } catch {
      error("Lỗi khi gửi yêu cầu.");
    }
  };

  const handleDelete = async (id: string, notifTitle: string) => {
    const ok = await confirm({
      title: "Xóa thông báo?",
      message: `Bạn có chắc chắn muốn xóa thông báo "${notifTitle}" không?`,
      confirmText: "Xóa thông báo",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        success("Đã xóa thông báo.");
        fetchNotifications();
      } else {
        error(json.error?.message || "Lỗi xóa thông báo.");
      }
    } catch {
      error("Lỗi kết nối máy chủ.");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      error("Vui lòng nhập đầy đủ tiêu đề và nội dung.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          type,
          severity,
          targetUrl: targetUrl.trim() || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success("Đã tạo và gửi thông báo thành công!");
        setCreateModalOpen(false);
        setTitle("");
        setContent("");
        setTargetUrl("");
        fetchNotifications();
      } else {
        error(json.error?.message || "Lỗi tạo thông báo.");
      }
    } catch {
      error("Lỗi kết nối máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "success":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
          label: "Thành công",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          badge: "bg-amber-50 text-amber-700 border-amber-200",
          label: "Cảnh báo",
        };
      case "important":
      case "security":
        return {
          icon: <AlertOctagon className="w-4 h-4 text-rose-600" />,
          badge: "bg-rose-50 text-rose-700 border-rose-200",
          label: "Bảo mật",
        };
      default:
        return {
          icon: <Info className="w-4 h-4 text-blue-600" />,
          badge: "bg-blue-50 text-blue-700 border-blue-200",
          label: "Thông tin",
        };
    }
  };

  const getTypeLabel = (t: string) => {
    switch (t) {
      case "project":
        return "Dự án";
      case "request":
        return "QLYC";
      case "reminder":
        return "Nhắc việc";
      case "attendance":
        return "Chấm công";
      case "staff":
        return "Nhân sự";
      case "account":
        return "Tài khoản";
      case "security":
        return "Bảo mật";
      case "system":
        return "Hệ thống";
      default:
        return "Tùy chỉnh";
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen text-[#172033]">
      <Header
        title="Bảng tin Thông báo"
        subtitle="Luồng tin thông báo tập trung của hệ thống và đồng bộ qua nhóm Telegram"
        actionButton={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-3 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] font-medium text-xs flex items-center gap-1.5 transition-colors border border-[#DDE2E9] shadow-xs"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#2457A7]" />
                <span>Đánh dấu tất cả đã đọc</span>
              </button>
            )}

            {userRole === "admin" && (
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="px-3.5 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo thông báo</span>
              </button>
            )}
          </div>
        }
      />

      <div className="p-6 md:p-8 space-y-4 max-w-5xl w-full mx-auto">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg bg-white border border-[#DDE2E9] shadow-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === "all"
                  ? "bg-[#2457A7] text-white shadow-xs font-semibold"
                  : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#172033]"
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter("unread");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                filter === "unread"
                  ? "bg-[#2457A7] text-white shadow-xs font-semibold"
                  : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#172033]"
              }`}
            >
              <span>Chưa đọc</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#B91C1C] text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="text-xs text-[#64748B] font-medium">
            Trang <strong className="text-[#172033]">{page}</strong> / {totalPages}
          </div>
        </div>

        {/* Notifications Feed */}
        {loading ? (
          <div className="py-20 text-center text-[#94A3B8] text-xs">
            Đang tải dữ liệu bảng tin thông báo...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 px-4 rounded-lg bg-white border border-[#DDE2E9] text-center space-y-2 shadow-xs">
            <Bell className="w-8 h-8 text-[#94A3B8] mx-auto" />
            <p className="text-[#172033] font-semibold text-sm">Chưa có thông báo nào</p>
            <p className="text-[#64748B] text-xs max-w-sm mx-auto">
              {filter === "unread"
                ? "Bạn đã đọc hết tất cả các thông báo!"
                : "Hệ thống sẽ tự động cập nhật khi có các sự kiện về dự án, nhân sự, tài khoản hoặc thông báo mới từ Quản trị viên."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const sev = getSeverityBadge(n.severity);
              return (
                <div
                  key={n.id}
                  className={`p-4 rounded-lg border transition-colors flex flex-col sm:flex-row items-start justify-between gap-4 relative shadow-xs ${
                    n.isRead
                      ? "bg-white border-[#DDE2E9] hover:border-[#CBD5E1]"
                      : "bg-[#F8FAFC] border-[#DDE2E9] hover:border-[#CBD5E1] border-l-4 border-l-[#2457A7]"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-md bg-[#F1F3F6] border border-[#DDE2E9] shrink-0 mt-0.5">
                      {sev.icon}
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${sev.badge}`}
                        >
                          {sev.label}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#F1F3F6] text-[#64748B] border border-[#DDE2E9]">
                          {getTypeLabel(n.type)}
                        </span>
                        {!n.isRead && (
                          <span className="px-1.5 py-0.5 rounded bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] font-bold text-[10px]">
                            MỚI
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-[#172033] leading-snug">
                          {n.title}
                        </h3>
                        <p className="text-xs text-[#64748B] mt-1 leading-relaxed whitespace-pre-line">
                          {n.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-[#94A3B8] pt-1 flex-wrap font-medium">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-[#94A3B8]" />
                          <span>{n.creatorName}</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-[#94A3B8]" />
                          <span>{new Date(n.createdAt).toLocaleString("vi-VN")}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {n.targetUrl && (
                      <Link
                        href={n.targetUrl}
                        onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                        className="px-2.5 py-1 rounded-md bg-[#E5EDFA] hover:bg-[#D5E4F8] text-[#2457A7] border border-[#BFD4F7] text-xs font-medium inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Xem chi tiết</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}

                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(n.id)}
                        className="p-1.5 rounded-md bg-[#F1F3F6] hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#172033] transition-colors"
                        title="Đánh dấu đã đọc"
                      >
                        <Check className="w-3.5 h-3.5 text-[#15803D]" />
                      </button>
                    )}

                    {userRole === "admin" && (
                      <button
                        type="button"
                        onClick={() => handleDelete(n.id, n.title)}
                        className="p-1.5 rounded-md bg-white hover:bg-[#FEF2F2] text-[#94A3B8] hover:text-[#B91C1C] border border-[#DDE2E9] transition-colors"
                        title="Xóa thông báo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Accessible Pagination Landmark */}
        {totalItems > 0 && (
          <Pagination
            currentPage={page}
            totalItems={totalItems}
            pageSize={15}
            onPageChange={(newPage) => setPage(newPage)}
            filterDeps={[filter]}
            className="mt-4"
          />
        )}
      </div>

      {/* Create Notification Modal (Admin) */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Tạo Thông báo Hệ thống Mới"
        subtitle="Thông báo sẽ hiển thị trên Web Feed và tự động phát qua Telegram nếu được bật"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#64748B]">
              Tiêu đề thông báo <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Bảo trì hệ thống HIS Bệnh viện..."
              className="w-full px-3 py-2 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#64748B]">
                Loại thông báo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] transition-colors"
              >
                <option value="system">Hệ thống (System)</option>
                <option value="project">Dự án (Project)</option>
                <option value="staff">Nhân sự (Staff)</option>
                <option value="account">Tài khoản (Account)</option>
                <option value="security">Bảo mật (Security)</option>
                <option value="custom">Tùy chỉnh (Custom)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#64748B]">
                Mức độ
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] transition-colors"
              >
                <option value="info">Thông tin (Info)</option>
                <option value="success">Thành công (Success)</option>
                <option value="warning">Cảnh báo (Warning)</option>
                <option value="important">Quan trọng (Important)</option>
                <option value="security">Bảo mật cao (Security)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#64748B]">
              Đường dẫn liên kết (Target URL - Tùy chọn)
            </label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="/projects hoặc https://..."
              className="w-full px-3 py-2 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs font-mono focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#64748B]">
              Nội dung thông báo <span className="text-[#B91C1C]">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung chi tiết thông báo..."
              className="w-full px-3 py-2 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE2E9]">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:text-[#172033] hover:bg-[#F1F3F6]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs disabled:opacity-50 transition-colors"
            >
              {saving ? "Đang gửi..." : "Gửi thông báo"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
