"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import {
  FolderKanban,
  Search,
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  Users2,
  KeyRound,
  Shield,
  Copy,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  FileSpreadsheet,
  Check,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  Lock,
  User,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ExcelImportModal, ColumnDefinition } from "@/components/ExcelImportModal";
import { PasswordRevealModal } from "@/components/PasswordRevealModal";
import { generateRandomPassword } from "@/lib/crypto";

export default function ProjectsPage() {
  const { success, error } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Project Detail & Vault Accounts state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectAccounts, setProjectAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");

  // Step-Up Reveal Password Modal state
  const [revealModalOpen, setRevealModalOpen] = useState(false);
  const [selectedAccountForReveal, setSelectedAccountForReveal] = useState<any>(null);

  // Add / Edit Site Account Modal state
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [accountStaffId, setAccountStaffId] = useState("");
  const [accountLabel, setAccountLabel] = useState("");
  const [siteLoginUsername, setSiteLoginUsername] = useState("");
  const [sitePassword, setSitePassword] = useState("");
  const [accountNotes, setAccountNotes] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [copiedAccUsernameId, setCopiedAccUsernameId] = useState<string | null>(null);

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [systemHisUrl, setSystemHisUrl] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [defaultPassword, setDefaultPassword] = useState("");
  const [showDefaultPassword, setShowDefaultPassword] = useState(false);
  const [level1StaffId, setLevel1StaffId] = useState("");
  const [level2StaffId, setLevel2StaffId] = useState("");
  const [level3StaffId, setLevel3StaffId] = useState("");
  const [saving, setSaving] = useState(false);

  // Excel Import Modal state
  const [importModalOpen, setImportModalOpen] = useState(false);

  const projectExcelColumns: ColumnDefinition[] = [
    { key: "projectName", label: "Tên dự án", required: true, example: "Bệnh viện Đa khoa Quốc tế (HIS)" },
    { key: "projectCode", label: "Mã dự án", example: "BVDK-QT" },
    { key: "systemHisUrl", label: "Đường dẫn hệ thống HIS", required: true, example: "https://his.bvdkquocte.vn" },
    { key: "defaultPassword", label: "Mật khẩu mặc định Site", example: "Hospital#MasterPass2026!" },
    { key: "status", label: "Trạng thái", example: "active (hoặc maintenance, closed)" },
    { key: "description", label: "Mô tả dự án", example: "Hệ thống khám chữa bệnh ngoại trú & nội trú" },
    { key: "level1Staff", label: "Lead Kỹ thuật (Level 1 - Email/Mã NV/Tên)", example: "giang.vu@company.com" },
    { key: "level2Staff", label: "PM Quản lý (Level 2 - Email/Mã NV/Tên)", example: "yen.nguyen@company.com" },
    { key: "level3Staff", label: "Director (Level 3 - Email/Mã NV/Tên)", example: "nguyen.van.a@company.com" },
  ];

  const sampleProjectData = [
    {
      "Tên dự án": "Bệnh viện Đa khoa Quốc tế Quảng Ninh (HIS)",
      "Mã dự án": "BVDK-QN",
      "Đường dẫn hệ thống HIS": "https://his.bvdkquangninh.vn",
      "Trạng thái": "active",
      "Mô tả dự án": "Triển khai phần mềm quản lý thông tin bệnh viện số hóa",
      "Lead Kỹ thuật (Level 1 - Email/Mã NV/Tên)": "giang.vu@company.com",
      "PM Quản lý (Level 2 - Email/Mã NV/Tên)": "yen.nguyen@company.com",
      "Director (Level 3 - Email/Mã NV/Tên)": "",
    },
    {
      "Tên dự án": "Trung tâm Y tế Thành phố Hạ Long",
      "Mã dự án": "TTYT-HL",
      "Đường dẫn hệ thống HIS": "https://his.ttythalong.gov.vn",
      "Trạng thái": "active",
      "Mô tả dự án": "Cổng kết nối liên thông dữ liệu bảo hiểm và giám định y tế",
      "Lead Kỹ thuật (Level 1 - Email/Mã NV/Tên)": "EMP010",
      "PM Quản lý (Level 2 - Email/Mã NV/Tên)": "EMP011",
      "Director (Level 3 - Email/Mã NV/Tên)": "",
    },
  ];

  const handleImportProjects = async (items: any[]) => {
    const res = await fetch("/api/projects/import", {
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

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/projects?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setProjects(json.data);
      }
    } catch (err) {
      console.error(err);
      error("Lỗi tải danh sách dự án.");
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
      fetchProjects();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, statusFilter]);

  const openAddModal = () => {
    setEditingProject(null);
    setProjectName("");
    setProjectCode("");
    setSystemHisUrl("");
    setDefaultPassword("");
    setShowDefaultPassword(false);
    setDescription("");
    setStatus("active");
    setLevel1StaffId("");
    setLevel2StaffId("");
    setLevel3StaffId("");
    setModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingProject(p);
    setProjectName(p.projectName);
    setProjectCode(p.projectCode || "");
    setSystemHisUrl(p.systemHisUrl);
    setDefaultPassword(p.defaultPassword || "");
    setShowDefaultPassword(false);
    setDescription(p.description || "");
    setStatus(p.status || "active");
    setLevel1StaffId(p.level1?.id || "");
    setLevel2StaffId(p.level2?.id || "");
    setLevel3StaffId(p.level3?.id || "");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !systemHisUrl.trim()) {
      error("Vui lòng nhập tên dự án và link hệ thống (HIS).");
      return;
    }

    if (!level1StaffId) {
      error("Nhân sự Level 1 (Kỹ thuật/Vận hành trực tiếp) là bắt buộc.");
      return;
    }

    // Check BR-15: cross level duplicates
    const selected = [level1StaffId, level2StaffId, level3StaffId].filter(Boolean);
    if (new Set(selected).size !== selected.length) {
      error("Một nhân sự không thể đồng thời đảm nhận nhiều Level trong cùng một dự án.");
      return;
    }

    setSaving(true);
    try {
      const url = editingProject ? `/api/projects/${editingProject.id}` : "/api/projects";
      const method = editingProject ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          projectCode,
          systemHisUrl,
          defaultPassword: defaultPassword.trim() || null,
          description,
          status,
          level1StaffId,
          level2StaffId: level2StaffId || null,
          level3StaffId: level3StaffId || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Lỗi lưu thông tin dự án.");
        setSaving(false);
        return;
      }

      success(editingProject ? "Cập nhật dự án thành công!" : "Tạo mới dự án thành công!");
      setModalOpen(false);
      fetchProjects();
    } catch {
      error("Lỗi khi kết nối đến máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa dự án "${name}" không?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        success("Đã xóa dự án thành công.");
        fetchProjects();
      } else {
        error(json.error?.message || "Lỗi xóa dự án.");
      }
    } catch {
      error("Lỗi khi gửi yêu cầu xóa dự án.");
    }
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    success("Đã sao chép link hệ thống HIS vào bộ nhớ tạm!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openProjectDetail = (p: any) => {
    setSelectedProject(p);
    setDetailModalOpen(true);
    setAccountSearch("");
    fetchProjectAccounts(p.id);
  };

  const fetchProjectAccounts = async (projectId: string) => {
    setLoadingAccounts(true);
    try {
      const res = await fetch(`/api/vault/accounts?projectId=${projectId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setProjectAccounts(json.data);
      }
    } catch (err) {
      console.error(err);
      error("Lỗi tải danh sách tài khoản của dự án.");
    } finally {
      setLoadingAccounts(false);
    }
  };

  const openAddAccountModal = () => {
    setEditingAccount(null);
    setAccountStaffId("");
    setAccountLabel("");
    setSiteLoginUsername("");
    setSitePassword(selectedProject?.defaultPassword || "");
    setAccountNotes("");
    setAccountModalOpen(true);
  };

  const openEditAccountModal = (acc: any) => {
    setEditingAccount(acc);
    setAccountStaffId(acc.staffId || "");
    setAccountLabel(acc.accountLabel);
    setSiteLoginUsername(acc.siteLoginUsername);
    setSitePassword("");
    setAccountNotes(acc.notes || "");
    setAccountModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject?.id || !accountLabel.trim() || !siteLoginUsername.trim()) {
      error("Vui lòng điền tên gợi nhớ và tên đăng nhập site.");
      return;
    }

    setSavingAccount(true);
    try {
      const isEdit = Boolean(editingAccount);
      const url = isEdit ? `/api/vault/accounts/${editingAccount.id}` : "/api/vault/accounts";
      const method = isEdit ? "PUT" : "POST";

      const payload: any = {
        projectId: selectedProject.id,
        staffId: accountStaffId || null,
        accountLabel: accountLabel.trim(),
        siteLoginUsername: siteLoginUsername.trim(),
        notes: accountNotes.trim() || null,
      };
      if (sitePassword) {
        payload.sitePassword = sitePassword;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success(isEdit ? "Đã cập nhật tài khoản site!" : "Đã thêm tài khoản vào két của dự án!");
        setAccountModalOpen(false);
        fetchProjectAccounts(selectedProject.id);
        fetchProjects();
      } else {
        error(json.error?.message || "Lỗi lưu tài khoản site.");
      }
    } catch {
      error("Lỗi kết nối máy chủ.");
    } finally {
      setSavingAccount(false);
    }
  };

  const handleDeleteAccount = async (acc: any) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${acc.accountLabel}" (${acc.siteLoginUsername}) không?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/vault/accounts/${acc.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        success("Đã xóa tài khoản khỏi két dự án.");
        fetchProjectAccounts(selectedProject.id);
        fetchProjects();
      } else {
        error(json.error?.message || "Lỗi xóa tài khoản.");
      }
    } catch {
      error("Lỗi khi gửi yêu cầu xóa tài khoản.");
    }
  };

  const handleCopyAccUsername = (uname: string, id: string) => {
    navigator.clipboard.writeText(uname);
    setCopiedAccUsernameId(id);
    success("Đã sao chép tên đăng nhập!");
    setTimeout(() => setCopiedAccUsernameId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#060913] bg-cyber-grid">
      <Header
        title="Quản lý Link Dự án & Cấp độ Phụ trách"
        subtitle="Hệ thống HIS, Staging/Live Portal và ma trận phân cấp trách nhiệm Level 1/2/3"
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
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Dự án mới</span>
            </button>
          </div>
        }
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Search & Status Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl backdrop-blur-xl">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên dự án, mã, mô tả..."
              className="w-full px-4 py-2.5 pl-10 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
            {[
              { id: "all", label: "Tất cả" },
              { id: "active", label: "Đang chạy" },
              { id: "maintenance", label: "Bảo trì" },
              { id: "closed", label: "Đã đóng" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === st.id
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 py-20 text-center text-slate-500 text-xs">
              Đang tải danh sách dự án...
            </div>
          ) : projects.length === 0 ? (
            <div className="col-span-2 py-20 text-center text-slate-500 text-xs">
              Chưa có dự án nào khớp với tiêu chí tìm kiếm.
            </div>
          ) : (
            projects.map((p) => (
              <div
                key={p.id}
                className="group p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden backdrop-blur-xl"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all" />

                <div className="space-y-4 relative z-10">
                  {/* Top Bar: Code, Status & Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
                        {p.projectCode || "PROJECT"}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${p.status === "active"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : p.status === "maintenance"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${p.status === "active"
                              ? "bg-emerald-400 animate-pulse"
                              : p.status === "maintenance"
                                ? "bg-amber-400"
                                : "bg-slate-400"
                            }`}
                        />
                        {p.status === "active" ? "Đang vận hành" : p.status === "maintenance" ? "Bảo trì" : "Đã đóng"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-2 rounded-xl bg-slate-950/70 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition-all"
                        title="Sửa thông tin dự án"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.projectName)}
                        className="p-2 rounded-xl bg-slate-950/70 hover:bg-rose-600/80 text-slate-400 hover:text-white border border-slate-800 hover:border-rose-500 transition-all"
                        title="Xóa dự án"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Project Name & Description */}
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug group-hover:text-blue-300 transition-colors">
                      {p.projectName}
                    </h3>
                    {p.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}
                  </div>

                  {/* HIS URL Bar */}
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="text-xs font-mono text-cyan-300 truncate max-w-[280px] sm:max-w-md">
                      {p.systemHisUrl}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(p.systemHisUrl, p.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Sao chép link hệ thống HIS"
                      >
                        {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={p.systemHisUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 transition-all"
                        title="Mở link hệ thống HIS trên tab mới"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Default Site Password (Chỉ hiển thị khi có thiết lập) */}
                  {p.defaultPassword && (
                    <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-[11px] text-amber-400/90 font-medium shrink-0">Mật khẩu mặc định:</span>
                        <span className="text-xs font-mono font-bold text-amber-200 truncate">{p.defaultPassword}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(p.defaultPassword, "pass_" + p.id)}
                        className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-300 hover:text-white transition-colors shrink-0"
                        title="Sao chép mật khẩu mặc định"
                      >
                        {copiedId === "pass_" + p.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Nhân sự phụ trách (Gọn gàng, chỉ hiển thị ai đã được gán) */}
                  {(p.level1 || p.level2 || p.level3) && (
                    <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs">
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-0.5">
                        <Users2 className="w-3.5 h-3.5 text-blue-400" />
                        Phụ trách:
                      </span>
                      {p.level1 && (
                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium text-[11px]">
                          <strong className="font-bold text-blue-400">Lead:</strong> {p.level1.fullName}
                        </span>
                      )}
                      {p.level2 && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium text-[11px]">
                          <strong className="font-bold text-amber-400">PM:</strong> {p.level2.fullName}
                        </span>
                      )}
                      {p.level3 && (
                        <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium text-[11px]">
                          <strong className="font-bold text-purple-400">Dir:</strong> {p.level3.fullName}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer: Credential Count & Open Detail & Vault Modal */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs relative z-10">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tài khoản trong két: <strong className="text-white">{p.accountCount || 0}</strong></span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openProjectDetail(p)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>Chi tiết & Két tài khoản</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Project Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProject ? "Chỉnh sửa Dự án" : "Tạo Dự án Mới"}
        subtitle="Quản lý link cổng hệ thống HIS và thiết lập ma trận trách nhiệm Level 1/2/3"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Tên Dự án <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="VD: Bệnh viện Đa khoa Quốc tế (HIS)"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Mã Dự án (Project Code)
              </label>
              <input
                type="text"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                placeholder="VD: BVDK-QT"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 uppercase font-mono shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Trạng thái
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="active">Đang vận hành (Active)</option>
                <option value="maintenance">Bảo trì (Maintenance)</option>
                <option value="closed">Đã đóng (Closed)</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Link Hệ thống HIS / Staging Portal <span className="text-rose-400">*</span>
              </label>
              <input
                type="url"
                required
                value={systemHisUrl}
                onChange={(e) => setSystemHisUrl(e.target.value)}
                placeholder="https://his.bvdkquocte.vn"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono shadow-inner"
              />
            </div>

            {/* Default Site Password */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>Mật khẩu mặc định Site / Dự án</span>
                  <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    Tự động dùng cho tài khoản trong Két
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const pass = generateRandomPassword(14);
                    setDefaultPassword(pass);
                    success("Đã sinh mật khẩu mặc định ngẫu nhiên!");
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                >
                  <Sparkles className="w-3 h-3" />
                  Sinh mật khẩu
                </button>
              </div>
              <div className="relative">
                <input
                  type={showDefaultPassword ? "text" : "password"}
                  value={defaultPassword}
                  onChange={(e) => setDefaultPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mặc định của dự án (VD: Hospital#MasterPass2026!)..."
                  className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowDefaultPassword(!showDefaultPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white p-1"
                  title={showDefaultPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showDefaultPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Khi Admin tạo tài khoản nhân sự cho dự án này trong Két, chỉ cần nhập Tên đăng nhập — mật khẩu sẽ tự động lấy mật khẩu mặc định này.
              </p>
            </div>
          </div>

          {/* Responsibility Assignment Level 1/2/3 */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="font-bold text-white text-xs flex items-center justify-between">
              <span>Phân công Cấp độ Phụ trách (Ma trận L1/L2/L3)</span>
              <span className="text-[10px] text-slate-400">1 nhân sự chỉ đảm nhận 1 Level/dự án</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-blue-400">
                  Level 1 (Kỹ thuật) <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={level1StaffId}
                  onChange={(e) => setLevel1StaffId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                >
                  <option value="">-- Chọn nhân sự --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.staffCode || "N/A"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-amber-400">Level 2 (PM)</label>
                <select
                  value={level2StaffId}
                  onChange={(e) => setLevel2StaffId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                >
                  <option value="">-- Không yêu cầu --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.staffCode || "N/A"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-purple-400">Level 3 (Director)</label>
                <select
                  value={level3StaffId}
                  onChange={(e) => setLevel3StaffId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                >
                  <option value="">-- Không yêu cầu --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.staffCode || "N/A"})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Mô tả dự án
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả phạm vi, khách hàng hoặc nghiệp vụ dự án..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none shadow-inner"
            />
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
              className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all"
            >
              {saving ? "Đang lưu..." : editingProject ? "Lưu thay đổi" : "Tạo dự án"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Nhập Danh sách Dự án từ Excel"
        subtitle="Hỗ trợ nhập hàng loạt dự án, đường dẫn HIS và tự động phân công cấp bậc trách nhiệm Level 1/2/3"
        columns={projectExcelColumns}
        sampleData={sampleProjectData}
        templateFileName="mau_import_du_an.xlsx"
        onImport={handleImportProjects}
        onSuccess={fetchProjects}
      />

      {/* Project Detail & Vault Accounts Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedProject?.projectName || "Chi tiết Dự án"}
        subtitle={`Mã: ${selectedProject?.projectCode || "N/A"} • Chi tiết cấu hình & Két tài khoản site`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6 text-xs max-h-[80vh] overflow-y-auto pr-1">
          {/* Project Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase">
                  {selectedProject?.projectCode || "PROJECT"}
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                    selectedProject?.status === "active"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : selectedProject?.status === "maintenance"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      selectedProject?.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-slate-400"
                    }`}
                  />
                  {selectedProject?.status === "active"
                    ? "Đang vận hành"
                    : selectedProject?.status === "maintenance"
                      ? "Bảo trì"
                      : "Đã đóng"}
                </span>
              </div>

              {selectedProject?.defaultPassword && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] text-amber-400 font-medium">Mật khẩu mặc định:</span>
                  <span className="text-xs font-mono font-bold text-amber-200">{selectedProject.defaultPassword}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedProject.defaultPassword, "detail_pass")}
                    className="p-1 rounded hover:bg-amber-500/20 text-amber-300"
                    title="Sao chép mật khẩu"
                  >
                    {copiedId === "detail_pass" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {/* Link HIS Bar */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-bold text-slate-400 shrink-0">Link HIS:</span>
                <span className="text-xs font-mono text-cyan-300 truncate">{selectedProject?.systemHisUrl}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(selectedProject?.systemHisUrl || "", "detail_his")}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Sao chép link"
                >
                  {copiedId === "detail_his" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={selectedProject?.systemHisUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30"
                  title="Mở link trong tab mới"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Phụ trách L1/L2/L3 */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
                <Users2 className="w-3.5 h-3.5 text-blue-400" />
                Phụ trách:
              </span>
              {selectedProject?.level1 && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium text-[11px]">
                  <strong className="font-bold text-blue-400">Level 1 (Kỹ thuật):</strong> {selectedProject.level1.fullName}
                </span>
              )}
              {selectedProject?.level2 && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium text-[11px]">
                  <strong className="font-bold text-amber-400">Level 2 (PM):</strong> {selectedProject.level2.fullName}
                </span>
              )}
              {selectedProject?.level3 && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium text-[11px]">
                  <strong className="font-bold text-purple-400">Level 3 (Director):</strong> {selectedProject.level3.fullName}
                </span>
              )}
            </div>

            {selectedProject?.description && (
              <p className="text-xs text-slate-400 leading-relaxed pt-1 border-t border-slate-900">
                {selectedProject.description}
              </p>
            )}
          </div>

          {/* Vault Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-extrabold text-white">Két Tài khoản Đăng nhập Site</h4>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {projectAccounts.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-48 sm:w-56">
                  <input
                    type="text"
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    placeholder="Tìm tài khoản..."
                    className="w-full px-3 py-1.5 pl-8 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                </div>
                <button
                  type="button"
                  onClick={openAddAccountModal}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm tài khoản</span>
                </button>
              </div>
            </div>

            {/* Accounts Table */}
            {loadingAccounts ? (
              <div className="py-12 text-center text-slate-500 text-xs">Đang tải danh sách tài khoản...</div>
            ) : projectAccounts.length === 0 ? (
              <div className="py-12 px-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-3">
                <KeyRound className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-slate-400 text-xs">Chưa có tài khoản nào trong két của dự án này.</p>
                <button
                  type="button"
                  onClick={openAddAccountModal}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm tài khoản đầu tiên</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-900/60 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Tài khoản / Vai trò</th>
                      <th className="py-3 px-4">Nhân sự phụ trách</th>
                      <th className="py-3 px-4">Tên đăng nhập Site</th>
                      <th className="py-3 px-4">Mật khẩu</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {projectAccounts
                      .filter((acc) => {
                        if (!accountSearch.trim()) return true;
                        const q = accountSearch.toLowerCase();
                        return (
                          acc.accountLabel?.toLowerCase().includes(q) ||
                          acc.siteLoginUsername?.toLowerCase().includes(q) ||
                          acc.staff?.fullName?.toLowerCase().includes(q) ||
                          acc.notes?.toLowerCase().includes(q)
                        );
                      })
                      .map((acc) => (
                        <tr key={acc.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{acc.accountLabel}</span>
                            </div>
                            {acc.notes && (
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{acc.notes}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {acc.staff ? (
                              <div className="flex items-center gap-1.5">
                                <User className="w-3 h-3 text-blue-400" />
                                <span className="font-medium text-white">{acc.staff.fullName}</span>
                                {acc.staff.staffCode && (
                                  <span className="text-[10px] text-slate-500">({acc.staff.staffCode})</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">Dùng chung</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-cyan-300">{acc.siteLoginUsername}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyAccUsername(acc.siteLoginUsername, acc.id)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                                title="Sao chép tên đăng nhập"
                              >
                                {copiedAccUsernameId === acc.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAccountForReveal(acc);
                                setRevealModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Xem mật khẩu</span>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditAccountModal(acc)}
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                                title="Sửa tài khoản"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAccount(acc)}
                                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                                title="Xóa tài khoản"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Add / Edit Site Account Modal */}
      <Modal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        title={editingAccount ? "Chỉnh sửa Tài khoản Site" : "Thêm Tài khoản vào Két Dự án"}
        subtitle={`Dự án: ${selectedProject?.projectName}`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveAccount} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tên gợi nhớ / Chức danh <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={accountLabel}
              onChange={(e) => setAccountLabel(e.target.value)}
              placeholder="VD: Admin HIS, Bác sĩ trưởng ca, Tài khoản Kỹ thuật..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Nhân sự được bàn giao / sử dụng
            </label>
            <select
              value={accountStaffId}
              onChange={(e) => setAccountStaffId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">-- Dùng chung / Không gán đích danh --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.staffCode || "N/A"}) - {s.department || "Chưa rõ phòng ban"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tên đăng nhập Site <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={siteLoginUsername}
              onChange={(e) => setSiteLoginUsername(e.target.value)}
              placeholder="VD: admin_bv, bsy_nguyenvana..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white font-mono placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Mật khẩu Site {editingAccount ? "(Để trống nếu không đổi)" : ""}
              </label>
              <button
                type="button"
                onClick={() => {
                  setSitePassword(generateRandomPassword(14));
                  success("Đã sinh mật khẩu ngẫu nhiên!");
                }}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
              >
                <Sparkles className="w-3 h-3" />
                Sinh mật khẩu
              </button>
            </div>
            <input
              type="text"
              value={sitePassword}
              onChange={(e) => setSitePassword(e.target.value)}
              placeholder={
                selectedProject?.defaultPassword
                  ? `Để trống sẽ dùng mật khẩu mặc định: ${selectedProject.defaultPassword}`
                  : "Nhập mật khẩu cho tài khoản..."
              }
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white font-mono placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            {!editingAccount && selectedProject?.defaultPassword && !sitePassword && (
              <p className="text-[11px] text-amber-400">
                Lưu ý: Mật khẩu đang để trống sẽ tự động kế thừa mật khẩu mặc định của dự án.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Ghi chú thêm
            </label>
            <textarea
              rows={2}
              value={accountNotes}
              onChange={(e) => setAccountNotes(e.target.value)}
              placeholder="Ghi chú phân quyền, nhóm khoa phòng hoặc lưu ý khi dùng..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setAccountModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={savingAccount}
              className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all"
            >
              {savingAccount ? "Đang lưu..." : editingAccount ? "Lưu thay đổi" : "Thêm vào Két"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Password Reveal Modal */}
      <PasswordRevealModal
        isOpen={revealModalOpen}
        onClose={() => setRevealModalOpen(false)}
        accountId={selectedAccountForReveal?.id || null}
        accountLabel={selectedAccountForReveal?.accountLabel || ""}
        projectName={selectedProject?.projectName || ""}
        siteUsername={selectedAccountForReveal?.siteLoginUsername || ""}
      />
    </div>
  );
}

