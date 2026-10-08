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
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ExcelImportModal, ColumnDefinition } from "@/components/ExcelImportModal";
import { generateRandomPassword } from "@/lib/crypto";

export default function ProjectsPage() {
  const { success, error } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === st.id
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
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                          p.status === "active"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : p.status === "maintenance"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            p.status === "active"
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

                  {/* Default Site Password Bar */}
                  <div className="p-3 rounded-2xl bg-amber-950/25 border border-amber-500/25 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <KeyRound className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase font-bold text-amber-400/90 tracking-wider">
                          Mật khẩu mặc định Site
                        </div>
                        {p.defaultPassword ? (
                          <div className="text-xs font-mono font-bold text-amber-200 truncate">
                            {p.defaultPassword}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 italic">
                            Chưa thiết lập (vui lòng sửa để cài đặt)
                          </div>
                        )}
                      </div>
                    </div>
                    {p.defaultPassword && (
                      <button
                        type="button"
                        onClick={() => handleCopy(p.defaultPassword, "pass_" + p.id)}
                        className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white transition-colors shrink-0"
                        title="Sao chép mật khẩu mặc định của Site"
                      >
                        {copiedId === "pass_" + p.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Responsibility Matrix: L1 / L2 / L3 */}
                  <div className="space-y-2 pt-1">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Users2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Ma trận Trách nhiệm (Tier Matrix):</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {/* Level 1: Lead */}
                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <div className="text-[9px] font-extrabold text-blue-400 uppercase">Level 1 (Kỹ thuật)</div>
                        {p.level1 ? (
                          <div className="mt-1 font-bold text-white text-xs truncate" title={p.level1.fullName}>
                            {p.level1.fullName}
                          </div>
                        ) : (
                          <div className="mt-1 text-slate-600 italic text-[11px]">Chưa gán</div>
                        )}
                      </div>

                      {/* Level 2: PM */}
                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <div className="text-[9px] font-extrabold text-amber-400 uppercase">Level 2 (PM)</div>
                        {p.level2 ? (
                          <div className="mt-1 font-bold text-white text-xs truncate" title={p.level2.fullName}>
                            {p.level2.fullName}
                          </div>
                        ) : (
                          <div className="mt-1 text-slate-600 italic text-[11px]">Không yêu cầu</div>
                        )}
                      </div>

                      {/* Level 3: Director */}
                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <div className="text-[9px] font-extrabold text-purple-400 uppercase">Level 3 (Director)</div>
                        {p.level3 ? (
                          <div className="mt-1 font-bold text-white text-xs truncate" title={p.level3.fullName}>
                            {p.level3.fullName}
                          </div>
                        ) : (
                          <div className="mt-1 text-slate-600 italic text-[11px]">Không yêu cầu</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Credential Count & Details Link */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs relative z-10">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tài khoản trong két: <strong className="text-white">{p.accountCount || 0}</strong></span>
                  </div>

                  <Link
                    href={`/vault?project=${p.id}`}
                    className="text-xs font-bold text-blue-400 hover:text-cyan-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>Xem Két mật khẩu</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
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
    </div>
  );
}
