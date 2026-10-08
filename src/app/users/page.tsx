"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import {
  UserCog,
  Search,
  Plus,
  Key,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Shield,
  User,
  Copy,
  Check,
  Sparkles,
  FileSpreadsheet,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { generateRandomPassword } from "@/lib/crypto";
import { ExcelImportModal, ColumnDefinition } from "@/components/ExcelImportModal";

export default function UsersPage() {
  const { success, error } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Add User Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [status, setStatus] = useState("active");
  const [staffId, setStaffId] = useState("");

  // Edit User Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Reset Password Modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const [saving, setSaving] = useState(false);

  // Excel Import Modal state
  const [importModalOpen, setImportModalOpen] = useState(false);

  const userExcelColumns: ColumnDefinition[] = [
    { key: "username", label: "Tên đăng nhập", required: true, example: "kien.trung" },
    { key: "password", label: "Mật khẩu khởi tạo", example: "User@123456 (để trống để tự sinh)" },
    { key: "role", label: "Vai trò", example: "user (hoặc admin, pm)" },
    { key: "status", label: "Trạng thái", example: "active (hoặc locked, inactive)" },
    { key: "staffIdentifier", label: "Nhân sự liên kết (Email/Mã NV/Tên)", example: "lan.nguyen@company.com" },
  ];

  const sampleUserData = [
    {
      "Tên đăng nhập": "lan.nguyen",
      "Mật khẩu khởi tạo": "Lan@Pass2026!",
      "Vai trò": "user",
      "Trạng thái": "active",
      "Nhân sự liên kết (Email/Mã NV/Tên)": "lan.nguyen@company.com",
    },
    {
      "Tên đăng nhập": "thang.tran",
      "Mật khẩu khởi tạo": "",
      "Vai trò": "pm",
      "Trạng thái": "active",
      "Nhân sự liên kết (Email/Mã NV/Tên)": "EMP011",
    },
  ];

  const handleImportUsers = async (items: any[]) => {
    const res = await fetch("/api/users/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    const json = await res.json();
    return {
      success: json.success,
      message: json.message || json.error?.message,
      count: json.data?.importedCount,
    };
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (roleFilter && roleFilter !== "all") params.set("role", roleFilter);

      const res = await fetch(`/api/users?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setUsers(json.data);
      }
    } catch (err) {
      console.error(err);
      error("Lỗi khi tải danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/staff?status=working");
      if (res.ok) {
        const json = await res.json();
        if (json.success) setStaffList(json.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, roleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      error("Vui lòng nhập tên đăng nhập và mật khẩu.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          role,
          status,
          staffId: staffId || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Không thể tạo người dùng mới.");
        setSaving(false);
        return;
      }

      success("Tạo người dùng mới thành công!");
      setAddModalOpen(false);
      fetchUsers();
    } catch {
      error("Lỗi kết nối máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          status,
          staffId: staffId || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Không thể cập nhật người dùng.");
        setSaving(false);
        return;
      }

      success("Cập nhật thông tin người dùng thành công!");
      setEditModalOpen(false);
      fetchUsers();
    } catch {
      error("Lỗi kết nối máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async (u: any) => {
    const newStatus = u.status === "locked" ? "active" : "locked";
    const actionText = newStatus === "locked" ? "khóa" : "mở khóa";

    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success(`Đã ${actionText} tài khoản @${u.username} thành công.`);
        fetchUsers();
      } else {
        error(json.error?.message || `Lỗi khi ${actionText} tài khoản.`);
      }
    } catch {
      error("Lỗi gửi yêu cầu.");
    }
  };

  const handleDeleteUser = async (u: any) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản @${u.username} không?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        success("Đã xóa người dùng thành công.");
        fetchUsers();
      } else {
        error(json.error?.message || "Lỗi xóa người dùng.");
      }
    } catch {
      error("Lỗi gửi yêu cầu xóa.");
    }
  };

  const openResetModal = (u: any) => {
    setResettingUser(u);
    const pwd = generateRandomPassword(12);
    setNewPassword(pwd);
    setCopied(false);
    setResetModalOpen(true);
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !newPassword.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${resettingUser.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success(`Đã đặt lại mật khẩu cho @${resettingUser.username}!`);
        setResetModalOpen(false);
        fetchUsers();
      } else {
        error(json.error?.message || "Lỗi đặt lại mật khẩu.");
      }
    } catch {
      error("Lỗi máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (r: string) => {
    switch (r) {
      case "admin":
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30 uppercase tracking-wider">
            Super Admin
          </span>
        );
      case "pm":
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
            Project Manager
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
            Standard User
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#060913] bg-cyber-grid">
      <Header
        title="Quản trị Người dùng Tool (IAM / RBAC)"
        subtitle="Quản lý tài khoản đăng nhập, phân quyền vai trò (Admin, PM, User) và bảo mật chống Brute-force"
        actionButton={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setImportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-800 shadow-md"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Import Excel</span>
            </button>
            <button
              onClick={() => {
                setUsername("");
                setPassword("");
                setRole("user");
                setStatus("active");
                setStaffId("");
                setAddModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Người dùng</span>
            </button>
          </div>
        }
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl backdrop-blur-xl">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên đăng nhập, họ tên, email..."
              className="w-full px-4 py-2.5 pl-10 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto w-full sm:w-auto">
            {[
              { id: "all", label: "Tất cả vai trò" },
              { id: "admin", label: "Super Admin" },
              { id: "pm", label: "Project Manager" },
              { id: "user", label: "Standard User" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRoleFilter(r.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  roleFilter === r.id
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800/80 overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-5">Tài khoản & Hồ sơ</th>
                  <th className="py-4 px-4">Vai trò (Role)</th>
                  <th className="py-4 px-4">Trạng thái</th>
                  <th className="py-4 px-4">Sai pass / Khóa</th>
                  <th className="py-4 px-4">Đăng nhập gần nhất</th>
                  <th className="py-4 px-4">Ngày tạo</th>
                  <th className="py-4 px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-500 text-xs">
                      Đang tải danh sách người dùng...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-500 text-xs">
                      Không tìm thấy tài khoản người dùng nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-md ring-1 ring-white/10">
                            {u.staff?.fullName ? u.staff.fullName.charAt(0) : u.username.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm font-mono group-hover:text-blue-300 transition-colors">
                              @{u.username}
                            </div>
                            {u.staff ? (
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {u.staff.fullName} ({u.staff.staffCode || "N/A"})
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-500 italic mt-0.5">
                                Chưa liên kết hồ sơ nhân sự
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">{getRoleBadge(u.role)}</td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 w-max ${
                            u.status === "active"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : u.status === "locked"
                              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.status === "active"
                                ? "bg-emerald-400"
                                : u.status === "locked"
                                ? "bg-rose-400"
                                : "bg-slate-400"
                            }`}
                          />
                          {u.status === "active" ? "Hoạt động" : u.status === "locked" ? "Bị khóa" : "Tắt"}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono text-slate-400">
                        {u.failedAttempts > 0 ? (
                          <span className="text-amber-400 font-bold">{u.failedAttempts} lần sai</span>
                        ) : (
                          <span className="text-slate-600">0</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">
                        {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Chưa đăng nhập"}
                      </td>

                      <td className="py-4 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDate(u.createdAt)}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openResetModal(u)}
                            className="p-2 rounded-xl bg-slate-950/70 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-slate-800 hover:border-amber-500/30 transition-all"
                            title="Đặt lại mật khẩu mới"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleLock(u)}
                            className={`p-2 rounded-xl border transition-all ${
                              u.status === "locked"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                                : "bg-slate-950/70 text-slate-400 border-slate-800 hover:text-rose-400 hover:border-rose-500/30"
                            }`}
                            title={u.status === "locked" ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                          >
                            {u.status === "locked" ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setRole(u.role);
                              setStatus(u.status);
                              setStaffId(u.staffId || "");
                              setEditModalOpen(true);
                            }}
                            className="p-2 rounded-xl bg-slate-950/70 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition-all"
                            title="Sửa vai trò & liên kết nhân sự"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-2 rounded-xl bg-slate-950/70 hover:bg-rose-600/80 text-slate-400 hover:text-white border border-slate-800 hover:border-rose-500 transition-all"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Tạo Người dùng Mới"
        subtitle="Mật khẩu sẽ được băm Argon2/Bcrypt và bắt buộc đổi pass ở lần đầu đăng nhập"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tên đăng nhập <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="VD: dung.nguyen, dev_ha..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Mật khẩu khởi tạo <span className="text-rose-400">*</span></span>
              <button
                type="button"
                onClick={() => setPassword(generateRandomPassword(10))}
                className="text-[10px] text-cyan-400 hover:underline font-bold flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Tạo mật khẩu ngẫu nhiên
              </button>
            </label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Phân quyền Vai trò (RBAC)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white text-xs font-semibold"
              >
                <option value="user">Standard User</option>
                <option value="pm">Project Manager (PM)</option>
                <option value="admin">Super Admin</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Trạng thái tài khoản
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white text-xs font-semibold"
              >
                <option value="active">Hoạt động (Active)</option>
                <option value="locked">Khóa (Locked)</option>
                <option value="inactive">Tắt (Inactive)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Liên kết Hồ sơ Nhân sự (Tùy chọn)
            </label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white text-xs"
            >
              <option value="">-- Không liên kết nhân sự --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.staffCode || "N/A"}) - {s.corporateEmail || "No Email"}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all"
            >
              {saving ? "Đang tạo..." : "Xác nhận Tạo"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      {editingUser && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Chỉnh sửa @${editingUser.username}`}
          subtitle="Cập nhật vai trò, trạng thái và liên kết hồ sơ nhân sự"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleEditUser} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Vai trò (Role)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white text-xs font-semibold"
                >
                  <option value="user">Standard User</option>
                  <option value="pm">Project Manager (PM)</option>
                  <option value="admin">Super Admin</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white text-xs font-semibold"
                >
                  <option value="active">Hoạt động (Active)</option>
                  <option value="locked">Khóa (Locked)</option>
                  <option value="inactive">Tắt (Inactive)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Liên kết Hồ sơ Nhân sự
              </label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white text-xs"
              >
                <option value="">-- Không liên kết --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.staffCode || "N/A"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all"
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <Modal
          isOpen={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          title={`Đặt lại Mật khẩu: @${resettingUser.username}`}
          subtitle="Sinh mật khẩu mới ngẫu nhiên và gửi cho người dùng"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleExecuteReset} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Mật khẩu mới</span>
                <button
                  type="button"
                  onClick={() => setNewPassword(generateRandomPassword(12))}
                  className="text-[10px] text-cyan-400 hover:underline font-bold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Tạo pass khác
                </button>
              </label>
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-inner"
              />
            </div>

            {newPassword && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                <span className="text-xs text-emerald-400 font-mono font-bold">{newPassword}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newPassword);
                    setCopied(true);
                    success("Đã sao chép mật khẩu mới!");
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Đã copy" : "Copy"}</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving || !newPassword.trim()}
                className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/25 disabled:opacity-50 transition-all"
              >
                {saving ? "Đang cập nhật..." : "Xác nhận Đặt lại"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Nhập Danh sách Người dùng từ Excel"
        subtitle="Hỗ trợ nhập hàng loạt tài khoản người dùng, phân quyền vai trò và tự động liên kết hồ sơ nhân sự"
        columns={userExcelColumns}
        sampleData={sampleUserData}
        templateFileName="mau_import_nguoi_dung.xlsx"
        onImport={handleImportUsers}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
