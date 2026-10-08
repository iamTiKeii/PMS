"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
    if (!confirm(`Bạn có chắc chắn muốn xóa thông báo "${notifTitle}" không?`)) {
      return;
    }

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
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          label: "Thành công",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          label: "Cảnh báo",
        };
      case "important":
      case "security":
        return {
          icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
          badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
          label: "Bảo mật",
        };
      default:
        return {
          icon: <Info className="w-4 h-4 text-blue-400" />,
          badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
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
    <div className="flex-1 flex flex-col min-w-0 bg-[#060913] bg-cyber-grid">
      <Header
        title="Bảng tin Thông báo"
        subtitle="Luồng tin thông báo tập trung của hệ thống và đồng bộ qua nhóm Telegram"
        actionButton={
          <div className="flex items-center gap-2.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-800 shadow-md"
              >
                <CheckCheck className="w-4 h-4 text-blue-400" />
                <span>Đánh dấu tất cả đã đọc</span>
              </button>
            )}

            {userRole === "admin" && (
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo thông báo</span>
              </button>
            )}
          </div>
        }
      />

      <div className="p-6 md:p-8 space-y-6 max-w-5xl w-full mx-auto">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === "all"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filter === "unread"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <span>Chưa đọc</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="text-xs text-slate-400">
            Trang <strong className="text-white">{page}</strong> / {totalPages}
          </div>
        </div>

        {/* Notifications Feed */}
        {loading ? (
          <div className="py-24 text-center text-slate-500 text-xs">
            Đang tải dữ liệu bảng tin thông báo...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-24 px-4 rounded-3xl bg-slate-900/50 border border-dashed border-slate-800 text-center space-y-3">
            <Bell className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-bold text-sm">Chưa có thông báo nào</p>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              {filter === "unread"
                ? "Bạn đã đọc hết tất cả các thông báo!"
                : "Hệ thống sẽ tự động cập nhật khi có các sự kiện về dự án, nhân sự, tài khoản hoặc thông báo mới từ Quản trị viên."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((n) => {
              const sev = getSeverityBadge(n.severity);
              return (
                <div
                  key={n.id}
                  className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col sm:flex-row items-start justify-between gap-4 relative overflow-hidden backdrop-blur-xl ${
                    n.isRead
                      ? "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                      : "bg-slate-900/90 border-blue-500/40 shadow-xl shadow-blue-500/5 hover:border-blue-500/60"
                  }`}
                >
                  {!n.isRead && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-indigo-500" />
                  )}

                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 shrink-0 mt-0.5">
                      {sev.icon}
                    </div>

                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${sev.badge}`}
                        >
                          {sev.label}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {getTypeLabel(n.type)}
                        </span>
                        {!n.isRead && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-extrabold text-[10px]">
                            MỚI
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                          {n.title}
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed whitespace-pre-line">
                          {n.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{n.creatorName}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
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
                        className="px-3 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                      >
                        <span>Xem chi tiết</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(n.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Đánh dấu đã đọc"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                      </button>
                    )}

                    {userRole === "admin" && (
                      <button
                        type="button"
                        onClick={() => handleDelete(n.id, n.title)}
                        className="p-2 rounded-xl bg-slate-950/70 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                        title="Xóa thông báo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-40"
            >
              Trang trước
            </button>
            <span className="text-xs text-slate-400 px-3">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
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
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tiêu đề thông báo <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Bảo trì hệ thống HIS Bệnh viện..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Loại thông báo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Mức độ
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Đường dẫn liên kết (Target URL - Tùy chọn)
            </label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="/projects hoặc https://..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Nội dung thông báo <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung chi tiết thông báo..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all"
            >
              {saving ? "Đang gửi..." : "Gửi thông báo"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
