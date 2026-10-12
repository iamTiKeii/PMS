"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import {
  UserCog,
  ShieldCheck,
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
  const { confirm } = useConfirm();
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
    const ok = await confirm({
      title: "Xóa tài khoản người dùng?",
      message: `Bạn có chắc chắn muốn xóa tài khoản @${u.username} không? Người dùng này sẽ bị hủy quyền truy cập hệ thống ngay lập tức.`,
      confirmText: "Xóa tài khoản",
      variant: "danger",
    });
    if (!ok) return;

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

  const getRoleBadge = (r: string, userRoles?: any[]) => {
    if (userRoles && userRoles.length > 0) {
      return (
        <div className="flex flex-wrap gap-1">
          {userRoles.map((ur: any) => (
            <span
              key={ur.role.id}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                ur.role.code === "admin"
                  ? "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]"
                  : ur.role.code === "pm"
                  ? "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]"
                  : "bg-[#F1F3F6] text-[#334155] border-[#CBD5E1]"
              }`}
            >
              {ur.role.name}
            </span>
          ))}
        </div>
      );
    }

    switch (r) {
      case "admin":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] uppercase tracking-wider">
            Quản trị viên (ADMIN)
          </span>
        );
      case "pm":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] uppercase tracking-wider">
            Quản lý dự án (PM)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F1F3F6] text-[#334155] border border-[#CBD5E1] uppercase tracking-wider">
            Nhân viên dự án
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen">
      <Header
        title="Danh mục Tài khoản Người dùng"
        subtitle="Quản trị tài khoản đăng nhập, cấp phát mật khẩu, mở khóa tài khoản và liên kết hồ sơ nhân sự"
        actionButton={
          <div className="flex items-center gap-2">
            <Link
              href="/access-control"
              className="px-3 py-1.5 rounded-md bg-[#18283F] hover:bg-[#233752] text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Module Quản trị truy cập (RBAC)</span>
            </Link>
            <button
              onClick={() => setImportModalOpen(true)}
              className="px-3 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] font-medium text-xs flex items-center gap-1.5 transition-colors border border-[#DDE2E9] shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#15803D]" />
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
              className="px-3.5 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm người dùng</span>
            </button>
          </div>
        }
      />

      <div className="p-6 md:p-8 space-y-5 max-w-7xl w-full mx-auto">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-lg bg-white border border-[#DDE2E9] shadow-xs">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên đăng nhập, họ tên, email..."
              className="w-full px-3 py-1.5 pl-9 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
            />
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: "all", label: "Tất cả vai trò" },
              { id: "admin", label: "Super Admin" },
              { id: "pm", label: "Project Manager" },
              { id: "user", label: "Standard User" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRoleFilter(r.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                  roleFilter === r.id
                    ? "bg-[#2457A7] text-white shadow-xs font-semibold"
                    : "bg-white text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#172033] border border-[#DDE2E9]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-lg bg-white border border-[#DDE2E9] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#DDE2E9] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Tài khoản & Hồ sơ</th>
                  <th className="py-2.5 px-3">Vai trò (Role)</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3">Sai pass / Khóa</th>
                  <th className="py-2.5 px-3">Đăng nhập gần nhất</th>
                  <th className="py-2.5 px-3">Ngày tạo</th>
                  <th className="py-2.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF1F5] text-[#172033]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#64748B] text-xs">
                      Đang tải danh sách người dùng...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#64748B] text-xs">
                      Không tìm thấy tài khoản người dùng nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-[#E5EDFA] border border-[#CBD5E1] text-[#2457A7] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {u.staff?.fullName ? u.staff.fullName.charAt(0) : u.username.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-[#172033] text-xs font-mono">
                              @{u.username}
                            </div>
                            {u.staff ? (
                              <div className="text-[11px] text-[#64748B]">
                                {u.staff.fullName} ({u.staff.staffCode || "N/A"})
                              </div>
                            ) : (
                              <div className="text-[10px] text-[#94A3B8] italic">
                                Chưa liên kết hồ sơ nhân sự
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">{getRoleBadge(u.role, u.userRoles)}</td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium items-center gap-1.5 ${
                            u.status === "active"
                              ? "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]"
                              : u.status === "locked"
                              ? "bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]"
                              : "bg-[#F8FAFC] text-[#64748B] border border-[#DDE2E9]"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.status === "active"
                                ? "bg-[#15803D]"
                                : u.status === "locked"
                                ? "bg-[#B91C1C]"
                                : "bg-slate-400"
                            }`}
                          />
                          {u.status === "active" ? "Hoạt động" : u.status === "locked" ? "Bị khóa" : "Tắt"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[#64748B]">
                        {u.failedAttempts > 0 ? (
                          <span className="text-[#B45309] font-semibold">{u.failedAttempts} lần sai</span>
                        ) : (
                          <span className="text-[#94A3B8]">0</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-[#64748B] font-mono text-[11px]">
                        {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Chưa đăng nhập"}
                      </td>

                      <td className="py-2.5 px-3 text-[#64748B] font-mono text-[11px]">
                        {formatDate(u.createdAt)}
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openResetModal(u)}
                            className="p-1 rounded hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#B45309] transition-colors"
                            title="Đặt lại mật khẩu mới"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleLock(u)}
                            className={`p-1 rounded transition-colors ${
                              u.status === "locked"
                                ? "text-[#15803D] hover:bg-[#F0FDF4]"
                                : "text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEF2F2]"
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
                            className="p-1 rounded hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#172033] transition-colors"
                            title="Sửa vai trò & liên kết nhân sự"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1 rounded hover:bg-[#FEF2F2] text-[#64748B] hover:text-[#B91C1C] transition-colors"
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
        subtitle="Mật khẩu sẽ được băm bảo mật và bắt buộc đổi pass ở lần đầu đăng nhập"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
              Tên đăng nhập <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="VD: dung.nguyen, dev_ha..."
              className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider flex items-center justify-between">
              <span>Mật khẩu khởi tạo <span className="text-rose-500">*</span></span>
              <button
                type="button"
                onClick={() => setPassword(generateRandomPassword(10))}
                className="text-[11px] text-[#2457A7] hover:underline font-semibold flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Tạo ngẫu nhiên
              </button>
            </label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                Vai trò (Role)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
              >
                <option value="user">Standard User</option>
                <option value="pm">Project Manager (PM)</option>
                <option value="admin">Super Admin</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                Trạng thái tài khoản
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
              >
                <option value="active">Hoạt động (Active)</option>
                <option value="locked">Khóa (Locked)</option>
                <option value="inactive">Tắt (Inactive)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
              Liên kết Hồ sơ Nhân sự (Tùy chọn)
            </label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
            >
              <option value="">-- Không liên kết nhân sự --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.staffCode || "N/A"}) - {s.corporateEmail || "No Email"}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EDF1F5]">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] border border-[#DDE2E9] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs disabled:opacity-50 transition-colors"
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
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                  Vai trò (Role)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
                >
                  <option value="user">Standard User</option>
                  <option value="pm">Project Manager (PM)</option>
                  <option value="admin">Super Admin</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
                >
                  <option value="active">Hoạt động (Active)</option>
                  <option value="locked">Khóa (Locked)</option>
                  <option value="inactive">Tắt (Inactive)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider">
                Liên kết Hồ sơ Nhân sự
              </label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
              >
                <option value="">-- Không liên kết --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.staffCode || "N/A"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EDF1F5]">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] border border-[#DDE2E9] transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs disabled:opacity-50 transition-colors"
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
          subtitle="Sinh mật khẩu mới ngẫu nhiên và cấp phát lại cho người dùng"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleExecuteReset} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider flex items-center justify-between">
                <span>Mật khẩu mới</span>
                <button
                  type="button"
                  onClick={() => setNewPassword(generateRandomPassword(12))}
                  className="text-[11px] text-[#2457A7] hover:underline font-semibold flex items-center gap-1"
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
                className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
              />
            </div>

            {newPassword && (
              <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] flex items-center justify-between gap-2">
                <span className="text-xs text-[#172033] font-mono font-bold">{newPassword}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newPassword);
                    setCopied(true);
                    success("Đã sao chép mật khẩu mới!");
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded bg-white hover:bg-[#F8FAFC] text-[#172033] border border-[#DDE2E9] text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-[#15803D]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Đã copy" : "Copy"}</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EDF1F5]">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] border border-[#DDE2E9] transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving || !newPassword.trim()}
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs disabled:opacity-50 transition-colors"
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
