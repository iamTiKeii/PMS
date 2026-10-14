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
  RotateCcw,
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

  // 1. Reset Default Password Modal state (SRS 1.3)
  const [resetDefaultModalOpen, setResetDefaultModalOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<any>(null);

  // 2. Unlock User Modal state (SRS 2.3)
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockingUser, setUnlockingUser] = useState<any>(null);
  const [unlockReason, setUnlockReason] = useState("");

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

  // Khóa tài khoản chủ động (Quản trị viên khóa thủ công)
  const handleLockUser = async (u: any) => {
    const ok = await confirm({
      title: `Khóa tài khoản @${u.username}?`,
      message: `Tài khoản sẽ bị tạm ngừng quyền truy cập hệ thống PMS và Extension. Bạn có chắc chắn muốn khóa tài khoản này?`,
      confirmText: "Khóa tài khoản",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "locked" }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success(`Đã khóa tài khoản @${u.username} thành công.`);
        fetchUsers();
      } else {
        error(json.error?.message || "Lỗi khi khóa tài khoản.");
      }
    } catch {
      error("Lỗi gửi yêu cầu khóa tài khoản.");
    }
  };

  // Mở modal Mở khóa tài khoản (SRS mục 2.3)
  const openUnlockModal = (u: any) => {
    setUnlockingUser(u);
    setUnlockReason("");
    setUnlockModalOpen(true);
  };

  // Thực thi Mở khóa tài khoản (SRS mục 2.2, 2.4)
  const handleExecuteUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockingUser) return;
    if (!unlockReason.trim()) {
      error("Vui lòng nhập lý do mở khóa tài khoản.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${unlockingUser.id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: unlockReason.trim() }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success(`Đã mở khóa tài khoản @${unlockingUser.username} thành công!`);
        setUnlockModalOpen(false);
        fetchUsers();
      } else {
        error(json.error?.message || "Lỗi khi mở khóa tài khoản.");
      }
    } catch {
      error("Lỗi kết nối máy chủ khi mở khóa.");
    } finally {
      setSaving(false);
    }
  };

  // Mở modal Reset mật khẩu mặc định (SRS mục 1.3)
  const openResetDefaultModal = (u: any) => {
    setResettingUser(u);
    setResetDefaultModalOpen(true);
  };

  // Thực thi Reset mật khẩu mặc định bằng Username (SRS mục 1.2, 1.4)
  const handleExecuteResetDefault = async () => {
    if (!resettingUser) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${resettingUser.id}/reset-password-default`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success(`Đã reset mật khẩu tài khoản @${resettingUser.username} về mặc định theo username!`);
        setResetDefaultModalOpen(false);
        fetchUsers();
      } else {
        error(json.error?.message || "Lỗi khi reset mật khẩu mặc định.");
      }
    } catch {
      error("Lỗi kết nối máy chủ khi reset mật khẩu.");
    } finally {
      setSaving(false);
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
                  users.map((u) => {
                    const isTemporarilyLocked =
                      u.lockedUntil && new Date(u.lockedUntil).getTime() > Date.now();
                    const isLockedByAttempts = u.failedAttempts >= 5;
                    const isLocked = u.status === "locked" || isTemporarilyLocked || isLockedByAttempts;

                    return (
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
                          {u.status === "locked" ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium items-center gap-1.5 bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#B91C1C]" />
                              Bị khóa
                            </span>
                          ) : isTemporarilyLocked || isLockedByAttempts ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium items-center gap-1.5 bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]" />
                              Khóa tạm ({u.failedAttempts}/5)
                            </span>
                          ) : u.status === "active" ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium items-center gap-1.5 bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium items-center gap-1.5 bg-[#F8FAFC] text-[#64748B] border border-[#DDE2E9]">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Tắt
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 font-mono text-[#64748B]">
                          {u.failedAttempts > 0 ? (
                            <span className="text-[#B45309] font-semibold">{u.failedAttempts} lần sai</span>
                          ) : (
                            <span className="text-[#94A3B8]">0</span>
                          )}
                          {isTemporarilyLocked && (
                            <div className="text-[10px] text-rose-600 font-sans font-medium">
                              Khóa đến: {formatDate(u.lockedUntil)}
                            </div>
                          )}
                          {u.mustChangePassword && (
                            <div className="text-[10px] text-amber-700 font-sans font-medium">
                              Yêu cầu đổi pass
                            </div>
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
                            {/* Reset mật khẩu mặc định bằng username (SRS mục 1) */}
                            <button
                              onClick={() => openResetDefaultModal(u)}
                              className="p-1 rounded hover:bg-[#FEF3C7] text-[#64748B] hover:text-[#B45309] transition-colors"
                              title="Reset mật khẩu mặc định (= username)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            {/* Mở khóa tài khoản hoặc Khóa tài khoản (SRS mục 2, 4) */}
                            {isLocked ? (
                              <button
                                onClick={() => openUnlockModal(u)}
                                className="p-1 rounded text-[#15803D] hover:bg-[#F0FDF4] hover:text-[#166534] transition-colors"
                                title="Mở khóa tài khoản bị khóa"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleLockUser(u)}
                                className="p-1 rounded text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors"
                                title="Khóa tài khoản"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Sửa vai trò & liên kết nhân sự */}
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

                            {/* Xóa tài khoản */}
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
                    );
                  })
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

      {/* 1. Reset Default Password Modal (SRS mục 1.3) */}
      {resettingUser && (
        <Modal
          isOpen={resetDefaultModalOpen}
          onClose={() => !saving && setResetDefaultModalOpen(false)}
          title="Reset mật khẩu"
          subtitle="Đưa mật khẩu về giá trị mặc định theo username"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            {/* Box thông tin tài khoản */}
            <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#DDE2E9] space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#EDF1F5]">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Username
                </span>
                <span className="font-mono font-bold text-xs text-[#172033] bg-white px-2 py-0.5 rounded border border-[#CBD5E1]">
                  @{resettingUser.username}
                </span>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
                  Mật khẩu mặc định sau khi reset
                </div>
                <div className="font-medium text-xs text-[#1E429F] bg-[#E5EDFA] px-2.5 py-1.5 rounded-md border border-[#BFDBFE] flex items-center justify-between">
                  <span>Được thiết lập theo username</span>
                  <span className="text-[10px] text-[#2457A7] font-semibold">(= {resettingUser.username})</span>
                </div>
                <p className="text-[10px] text-[#64748B] mt-1.5 italic">
                  * Không cần hiển thị mật khẩu hoặc hash mật khẩu trên giao diện quản trị.
                </p>
              </div>
            </div>

            {/* Box Cảnh báo / Xác nhận thao tác */}
            <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] space-y-1">
              <div className="font-semibold text-xs flex items-center gap-1.5 text-[#B45309]">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Xác nhận thao tác</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#78350F]">
                Mật khẩu hiện tại của tài khoản sẽ không còn sử dụng được. Người dùng cần đăng nhập bằng thông tin mặc định và đổi mật khẩu theo chính sách của hệ thống.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EDF1F5]">
              <button
                type="button"
                disabled={saving}
                onClick={() => setResetDefaultModalOpen(false)}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] border border-[#DDE2E9] transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleExecuteResetDefault}
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#B45309] hover:bg-[#92400E] text-white shadow-xs disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{saving ? "Đang xử lý..." : "Xác nhận reset"}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Unlock User Modal (SRS mục 2.3) */}
      {unlockingUser && (
        <Modal
          isOpen={unlockModalOpen}
          onClose={() => !saving && setUnlockModalOpen(false)}
          title="Mở khóa tài khoản"
          subtitle="Khôi phục khả năng đăng nhập cho người dùng"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleExecuteUnlock} className="space-y-4 text-xs">
            {/* Header Status Badge */}
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Trạng thái tài khoản
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B91C1C]" />
                Đang khóa
              </span>
            </div>

            {/* Grid thông tin chi tiết */}
            <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#DDE2E9] space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-[#EDF1F5]">
                <span className="text-[#64748B]">Username</span>
                <span className="font-mono font-bold text-[#172033]">@{unlockingUser.username}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#EDF1F5]">
                <span className="text-[#64748B]">Trạng thái</span>
                <span className="font-semibold text-rose-700">Bị khóa</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#EDF1F5]">
                <span className="text-[#64748B]">Nguyên nhân</span>
                <span className="font-medium text-[#172033]">
                  {unlockingUser.failedAttempts >= 5 ||
                  (unlockingUser.lockedUntil && new Date(unlockingUser.lockedUntil).getTime() > Date.now())
                    ? `Đăng nhập sai nhiều lần (${unlockingUser.failedAttempts} lần)`
                    : "Quản trị viên khóa thủ công"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#64748B]">Thời điểm khóa</span>
                <span className="font-mono text-[#172033] text-[11px]">
                  {formatDate(unlockingUser.lockedUntil || unlockingUser.updatedAt)}
                </span>
              </div>
            </div>

            {/* Trường nhập Lý do mở khóa (Bắt buộc) */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#172033] uppercase tracking-wider flex items-center justify-between">
                <span>
                  Lý do mở khóa <span className="text-rose-500">*</span>
                </span>
              </label>
              <textarea
                required
                rows={3}
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="Nhập lý do mở khóa tài khoản..."
                className="w-full px-3 py-2 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] resize-none"
              />
              <p className="text-[10px] text-[#64748B] italic">
                Khuyến nghị bắt buộc nhập lý do để phục vụ kiểm tra và truy vết.
              </p>
            </div>

            {/* Hộp thông báo Sau khi mở khóa */}
            <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] space-y-1">
              <div className="font-semibold text-xs flex items-center gap-1.5 text-[#1D4ED8]">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Sau khi mở khóa</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#1E3A8A]">
                Tài khoản được phép thử đăng nhập lại theo chính sách xác thực. Mật khẩu hiện tại không tự thay đổi.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EDF1F5]">
              <button
                type="button"
                disabled={saving}
                onClick={() => setUnlockModalOpen(false)}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] border border-[#DDE2E9] transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving || !unlockReason.trim()}
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#15803D] hover:bg-[#166534] text-white shadow-xs disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{saving ? "Đang xử lý..." : "Xác nhận mở khóa"}</span>
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
