"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { PasswordRevealModal } from "@/components/PasswordRevealModal";
import { useToast } from "@/components/Toast";
import {
  KeyRound,
  Search,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Edit2,
  Trash2,
  ShieldCheck,
  Building2,
  User,
  Clock,
  AlertTriangle,
  FolderKanban,
  CheckCircle2,
  FileSpreadsheet,
  Sparkles,
  ShieldAlert,
  Copy,
  Check,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ExcelImportModal, ColumnDefinition } from "@/components/ExcelImportModal";
import { generateRandomPassword } from "@/lib/crypto";

export default function VaultPage() {
  const { success, error } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [projectIdFilter, setProjectIdFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Step-Up Reveal Password Modal state
  const [revealModalOpen, setRevealModalOpen] = useState(false);
  const [selectedAccountForReveal, setSelectedAccountForReveal] = useState<any>(null);

  // Excel Import Modal state
  const [importModalOpen, setImportModalOpen] = useState(false);

  const vaultExcelColumns: ColumnDefinition[] = [
    { key: "projectName", label: "Tên Dự án", required: true, example: "Bệnh viện Đa khoa Quốc tế (HIS)" },
    { key: "staffEmailOrCode", label: "Email hoặc Mã NV", required: true, example: "an.le@company.com" },
    { key: "accountLabel", label: "Tên gợi nhớ / Site Label", required: true, example: "Root Server HIS Bệnh viện" },
    { key: "siteLoginUsername", label: "Tên đăng nhập Site", required: true, example: "admin_his_sysroot" },
    { key: "sitePassword", label: "Mật khẩu Site", required: true, example: "Hospital#MasterPass2026!" },
    { key: "notes", label: "Ghi chú", example: "Tài khoản quản trị cao nhất trên Live" },
    { key: "status", label: "Trạng thái", example: "in_use" },
  ];

  const sampleVaultData = [
    {
      "Tên Dự án": "Bệnh viện Đa khoa Quốc tế (HIS)",
      "Email hoặc Mã NV": "an.le@company.com",
      "Tên gợi nhớ / Site Label": "Root Server HIS Bệnh viện",
      "Tên đăng nhập Site": "admin_his_sysroot",
      "Mật khẩu Site": "Hospital#MasterPass2026!",
      "Ghi chú": "Tài khoản quản trị cao nhất trên Live",
      "Trạng thái": "in_use",
    },
    {
      "Tên Dự án": "Hệ thống Phòng khám Smart Clinic",
      "Email hoặc Mã NV": "EMP004",
      "Tên gợi nhớ / Site Label": "Tài khoản Kỹ thuật viên Clinic",
      "Tên đăng nhập Site": "tech_dung_clinic",
      "Mật khẩu Site": "ClinicSupportDev$999!",
      "Ghi chú": "Dùng để cấu hình phòng khám",
      "Trạng thái": "in_use",
    },
  ];

  // Add / Edit Account Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [projectId, setProjectId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [accountLabel, setAccountLabel] = useState("");
  const [siteLoginUsername, setSiteLoginUsername] = useState("");
  const [sitePassword, setSitePassword] = useState("");
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("in_use");
  const [saving, setSaving] = useState(false);

  // Quick Copy & Visibility state for table rows
  const [copiedUsernameId, setCopiedUsernameId] = useState<string | null>(null);
  const [copiedPasswordId, setCopiedPasswordId] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Computed assigned staff for currently selected project in modal
  const selectedProject = projectsList.find((p) => p.id === projectId);
  const assignedStaffList = selectedProject?.assignments?.map((a: any) => a.staff).filter(Boolean) || [];

  const handleProjectChange = (newProjId: string) => {
    setProjectId(newProjId);
    const proj = projectsList.find((p) => p.id === newProjId);
    const assigned = proj?.assignments?.map((a: any) => a.staff).filter(Boolean) || [];
    if (assigned.length > 0) {
      setStaffId(assigned[0].id);
      setAccountLabel(`Tài khoản Site - ${assigned[0].fullName}`);
    } else {
      setStaffId("");
      setAccountLabel("");
    }
  };

  const handleStaffChange = (newStaffId: string) => {
    setStaffId(newStaffId);
    const staffObj = assignedStaffList.find((s: any) => s.id === newStaffId);
    if (staffObj) {
      setAccountLabel(`Tài khoản Site - ${staffObj.fullName}`);
    }
  };

  const handleCopyUsername = (username: string, id: string) => {
    navigator.clipboard.writeText(username);
    setCopiedUsernameId(id);
    success(`Đã sao chép tên đăng nhập: ${username}`);
    setTimeout(() => setCopiedUsernameId(null), 2500);
  };

  const handleCopyPassword = (pwd: string, id: string) => {
    if (!pwd) {
      error("Chưa có thông tin mật khẩu hoặc bạn không có quyền xem.");
      return;
    }
    navigator.clipboard.writeText(pwd);
    setCopiedPasswordId(id);
    success("Đã sao chép mật khẩu vào Clipboard!");
    setTimeout(() => setCopiedPasswordId(null), 2500);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (projectIdFilter && projectIdFilter !== "all") params.set("projectId", projectIdFilter);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/vault/accounts?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setAccounts(json.data);
      }
    } catch (err) {
      console.error(err);
      error("Lỗi khi tải danh sách tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [projRes, staffRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/staff?status=working"),
      ]);
      if (projRes.ok) {
        const pJson = await projRes.json();
        if (pJson.success) setProjectsList(pJson.data);
      }
      if (staffRes.ok) {
        const sJson = await staffRes.json();
        if (sJson.success) setStaffList(sJson.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchAccounts();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, projectIdFilter, statusFilter]);

  const openAddModal = () => {
    setEditingAccount(null);
    const firstProj = projectsList[0];
    const firstProjId = firstProj?.id || "";
    setProjectId(firstProjId);
    const assigned = firstProj?.assignments?.map((a: any) => a.staff).filter(Boolean) || [];
    const firstStaff = assigned[0];
    setStaffId(firstStaff?.id || "");
    setAccountLabel(firstStaff ? `Tài khoản Site - ${firstStaff.fullName}` : "");
    setSiteLoginUsername("");
    setSitePassword("");
    setUseCustomPassword(false);
    setNotes("");
    setStatus("in_use");
    setModalOpen(true);
  };

  const openEditModal = (acc: any) => {
    setEditingAccount(acc);
    setProjectId(acc.projectId);
    setStaffId(acc.staffId);
    setAccountLabel(acc.accountLabel);
    setSiteLoginUsername(acc.siteLoginUsername);
    setSitePassword(""); // Never prefill encrypted password
    setUseCustomPassword(false);
    setNotes(acc.notes || "");
    setStatus(acc.status || "in_use");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !staffId || !siteLoginUsername.trim()) {
      error("Vui lòng chọn Dự án, Nhân sự và nhập Tên đăng nhập.");
      return;
    }

    if (!editingAccount && useCustomPassword && !sitePassword.trim()) {
      error("Vui lòng nhập mật khẩu tùy chỉnh hoặc bỏ chọn để lấy mật khẩu mặc định của dự án.");
      return;
    }

    if (!editingAccount && !useCustomPassword && !selectedProject?.defaultPassword) {
      error(`Dự án "${selectedProject?.projectName}" chưa có Mật khẩu mặc định. Vui lòng bật tùy chỉnh mật khẩu hoặc cấu hình mật khẩu mặc định cho dự án.`);
      return;
    }

    setSaving(true);
    try {
      const url = editingAccount ? `/api/vault/accounts/${editingAccount.id}` : "/api/vault/accounts";
      const method = editingAccount ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          staffId,
          accountLabel: accountLabel.trim() || undefined,
          siteLoginUsername: siteLoginUsername.trim(),
          sitePassword: useCustomPassword && sitePassword.trim() ? sitePassword.trim() : undefined,
          notes,
          status,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Lỗi khi lưu tài khoản site.");
        setSaving(false);
        return;
      }

      success(editingAccount ? "Cập nhật tài khoản site thành công!" : "Thêm mới tài khoản site vào két thành công (kế thừa mật khẩu mặc định)!");
      setModalOpen(false);
      fetchAccounts();
    } catch {
      error("Lỗi khi kết nối đến máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${label}" khỏi Két bảo mật không?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/vault/accounts/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        success("Đã xóa tài khoản site khỏi Két an toàn.");
        fetchAccounts();
      } else {
        error(json.error?.message || "Lỗi xóa tài khoản.");
      }
    } catch {
      error("Lỗi khi gửi yêu cầu xóa tài khoản.");
    }
  };

  const handleOpenReveal = (acc: any) => {
    setSelectedAccountForReveal(acc);
    setRevealModalOpen(true);
  };

  const handleImportVault = async (items: any[]) => {
    const res = await fetch("/api/vault/accounts/import", {
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

  const handleGeneratePassword = () => {
    const pw = generateRandomPassword(14);
    setSitePassword(pw);
    success("Đã tạo mật khẩu ngẫu nhiên an toàn!");
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#060913] bg-cyber-grid">
      <Header
        title="Két Thông tin Xác thực Dự án (Credential Vault)"
        subtitle="Quản lý tài khoản đăng nhập site dự án, mã hóa đối xứng AES-256-GCM & Re-Authentication"
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
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/25 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Tài khoản Site</span>
            </button>
          </div>
        }
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Security Policy Banner */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-500/30 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>Chính sách An toàn Thông tin & Quyền truy cập Két</span>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  AES-256-GCM
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Mật khẩu lưu trong két luôn được mã hóa 2 lớp. Để hiển thị mật khẩu rõ, thành viên dự án bắt buộc phải xác thực lại mật khẩu Tool (Step-Up Re-Auth) và hệ thống sẽ <strong>tự động che giấu sau 15 giây</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl backdrop-blur-xl">
          <div className="relative w-full lg:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên site, user, dự án, nhân sự..."
              className="w-full px-4 py-2.5 pl-10 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-inner"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Project Filter */}
            <select
              value={projectIdFilter}
              onChange={(e) => setProjectIdFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">-- Tất cả Dự án --</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectName}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">-- Mọi trạng thái --</option>
              <option value="in_use">Đang dùng</option>
              <option value="rotation_needed">Cần đổi mật khẩu</option>
              <option value="stopped">Đã ngừng dùng</option>
            </select>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800/80 overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-5">Tên Gợi nhớ / Môi trường</th>
                  <th className="py-4 px-4">Dự án</th>
                  <th className="py-4 px-4">Nhân sự phụ trách</th>
                  <th className="py-4 px-4">Tên đăng nhập Site</th>
                  <th className="py-4 px-4">Mật khẩu</th>
                  <th className="py-4 px-4">Trạng thái</th>
                  <th className="py-4 px-4">Đổi pass gần nhất</th>
                  <th className="py-4 px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-500 text-xs">
                      Đang tải danh sách tài khoản trong két...
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-500 text-xs">
                      Không tìm thấy tài khoản site nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="py-4 px-5">
                        <div className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">
                          {acc.accountLabel}
                        </div>
                        {acc.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-xs">
                            {acc.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 font-bold text-blue-400">
                        {acc.project?.projectName}
                      </td>

                      <td className="py-4 px-4 text-slate-300">
                        <div className="font-bold text-white">{acc.staff?.fullName}</div>
                        <div className="text-[10px] text-slate-400">{acc.staff?.staffCode || "—"}</div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold">
                          <span>{acc.siteLoginUsername}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyUsername(acc.siteLoginUsername, acc.id)}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all shrink-0"
                            title="Sao chép tên đăng nhập"
                          >
                            {copiedUsernameId === acc.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Password Column with 1-Click Copy and Eye Toggle */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-300 tracking-wider text-xs select-all">
                            {visiblePasswords[acc.id] && acc.password
                              ? acc.password
                              : "••••••••••••"}
                          </span>

                          {acc.canReveal ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Toggle eye */}
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(acc.id)}
                                className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                                title={visiblePasswords[acc.id] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                              >
                                {visiblePasswords[acc.id] ? (
                                  <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* 1-Click Copy Password */}
                              <button
                                type="button"
                                onClick={() => handleCopyPassword(acc.password, acc.id)}
                                className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm"
                                title="Sao chép mật khẩu"
                              >
                                {copiedPasswordId === acc.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400">Đã chép</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-amber-400" />
                                    <span>Copy Pass</span>
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <span
                              className="px-2 py-0.5 rounded-lg bg-slate-800/60 text-slate-500 text-[10px] font-medium cursor-not-allowed"
                              title="Bạn không thuộc dự án này nên không có quyền mở mật khẩu"
                            >
                              Khóa
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 w-max ${
                            acc.status === "in_use"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : acc.status === "rotation_needed"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              acc.status === "in_use"
                                ? "bg-emerald-400"
                                : acc.status === "rotation_needed"
                                ? "bg-amber-400"
                                : "bg-slate-400"
                            }`}
                          />
                          {acc.status === "in_use"
                            ? "Đang dùng"
                            : acc.status === "rotation_needed"
                            ? "Cần đổi pass"
                            : "Đã ngừng"}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">
                        {formatDate(acc.lastRotatedAt || acc.createdAt)}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(acc)}
                            className="p-2 rounded-xl bg-slate-950/70 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition-all"
                            title="Sửa tài khoản / Đổi mật khẩu"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(acc.id, acc.accountLabel)}
                            className="p-2 rounded-xl bg-slate-950/70 hover:bg-rose-600/80 text-slate-400 hover:text-white border border-slate-800 hover:border-rose-500 transition-all"
                            title="Xóa tài khoản khỏi két"
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

      {/* Add / Edit Account Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAccount ? "Chỉnh sửa Tài khoản Site" : "Thêm mới Tài khoản vào Két"}
        subtitle="Mật khẩu sẽ được tự động mã hóa đối xứng AES-256-GCM trước khi lưu"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Project Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Dự án áp dụng <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white text-xs font-medium focus:ring-2 focus:ring-amber-500"
              >
                {projectsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectName} {p.defaultPassword ? "🔑" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Staff Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Nhân sự được gán <span className="text-rose-400">*</span></span>
                <span className="text-[10px] text-amber-400 font-normal">
                  {assignedStaffList.length} nhân sự trong dự án
                </span>
              </label>
              <select
                required
                disabled={assignedStaffList.length === 0}
                value={staffId}
                onChange={(e) => handleStaffChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              >
                {assignedStaffList.length === 0 ? (
                  <option value="">-- Dự án chưa phân công nhân sự --</option>
                ) : (
                  assignedStaffList.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.staffCode || "N/A"})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Warning if no assigned staff */}
            {assignedStaffList.length === 0 && (
              <div className="sm:col-span-2 p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  Dự án này chưa có nhân sự nào được phân công. Két tài khoản chỉ cho phép tạo tài khoản cho nhân sự đã được gán vào dự án. Vui lòng vào <strong>Quản lý Dự án</strong> để gán nhân sự (L1/L2/L3) trước.
                </div>
              </div>
            )}

            {/* Project Default Password Banner */}
            <div className="sm:col-span-2 p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  Mật khẩu mặc định của Dự án
                </span>
                {selectedProject?.defaultPassword && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Sẵn sàng kế thừa
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                {selectedProject?.defaultPassword ? (
                  <div className="font-mono text-sm font-bold text-white bg-slate-950/90 px-3 py-2 rounded-xl border border-slate-800 w-full flex items-center justify-between">
                    <span className="text-amber-200">{selectedProject.defaultPassword}</span>
                    <span className="text-[10px] text-slate-400 font-sans font-normal">
                      (Tự động cấp cho tài khoản mới)
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-amber-300/80 italic">
                    Dự án này chưa có mật khẩu mặc định. Bạn có thể bật "Tùy chỉnh mật khẩu riêng" bên dưới hoặc cấu hình trong Quản lý Dự án.
                  </div>
                )}
              </div>
            </div>

            {/* Account Label */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Tên Gợi nhớ / Phân vùng Site
              </label>
              <input
                type="text"
                value={accountLabel}
                onChange={(e) => setAccountLabel(e.target.value)}
                placeholder="VD: Tài khoản Site - Lê Văn An, Root HIS Bệnh viện..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-inner"
              />
            </div>

            {/* Site Login Username */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>
                  Tên đăng nhập Site <span className="text-rose-400">*</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  (Nhân sự khi vào két sẽ nhấn sao chép tên đăng nhập này)
                </span>
              </label>
              <input
                type="text"
                required
                value={siteLoginUsername}
                onChange={(e) => setSiteLoginUsername(e.target.value)}
                placeholder="admin, his_root, tech_dev..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-inner"
              />
            </div>

            {/* Custom password toggle (Optional) */}
            <div className="sm:col-span-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                <input
                  type="checkbox"
                  checked={useCustomPassword}
                  onChange={(e) => setUseCustomPassword(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/50 w-4 h-4 bg-slate-950"
                />
                <span>
                  {editingAccount
                    ? "Đổi mật khẩu mới cho tài khoản này"
                    : "Tùy chỉnh mật khẩu riêng (thay vì dùng mật khẩu mặc định của dự án)"}
                </span>
              </label>

              {useCustomPassword && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Mật khẩu riêng:
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[10px] text-amber-400 hover:underline font-semibold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Tạo ngẫu nhiên
                    </button>
                  </div>
                  <input
                    type="text"
                    required={useCustomPassword}
                    value={sitePassword}
                    onChange={(e) => setSitePassword(e.target.value)}
                    placeholder="Nhập mật khẩu riêng..."
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-inner"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Trạng thái hoạt động
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white text-xs font-medium"
              >
                <option value="in_use">Đang sử dụng (In use)</option>
                <option value="rotation_needed">Cần đổi mật khẩu (Rotation needed)</option>
                <option value="stopped">Đã ngừng sử dụng (Stopped)</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Ghi chú thêm
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú về mục đích tài khoản, server, cổng kết nối..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none shadow-inner"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/25 disabled:opacity-50 transition-all"
            >
              {saving ? "Đang mã hóa & lưu..." : editingAccount ? "Lưu thay đổi" : "Lưu vào Két"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Step-Up Password Reveal Modal */}
      {selectedAccountForReveal && (
        <PasswordRevealModal
          isOpen={revealModalOpen}
          onClose={() => {
            setRevealModalOpen(false);
            setSelectedAccountForReveal(null);
          }}
          accountId={selectedAccountForReveal.id}
          accountLabel={selectedAccountForReveal.accountLabel}
          projectName={selectedAccountForReveal.project?.projectName || "Dự án"}
          siteUsername={selectedAccountForReveal.siteLoginUsername}
        />
      )}

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Nhập Danh sách Tài khoản Site từ Excel"
        subtitle="Hỗ trợ nhập hàng loạt tài khoản đăng nhập site và tự động mã hóa đối xứng AES-256-GCM"
        columns={vaultExcelColumns}
        sampleData={sampleVaultData}
        templateFileName="mau_import_tai_khoan_site.xlsx"
        onImport={handleImportVault}
        onSuccess={fetchAccounts}
      />
    </div>
  );
}
