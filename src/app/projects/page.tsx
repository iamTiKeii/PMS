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
  Building2,
  MapPin,
  Loader2,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ExcelImportModal, ColumnDefinition } from "@/components/ExcelImportModal";
import { PasswordRevealModal } from "@/components/PasswordRevealModal";
import { Pagination, usePagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { CardGridSkeleton } from "@/components/Skeleton";
import { generateRandomPassword } from "@/lib/crypto";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import { Combobox } from "@/components/Combobox";

export default function ProjectsPage() {
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [projects, setProjects] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regions, setRegions] = useState<any[]>([]);
  const [regionFilter, setRegionFilter] = useState("all");
  const [projectRegionId, setProjectRegionId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination hook
  const {
    page: projectPage,
    offset: projectOffset,
    goToPage: setProjectPage,
  } = usePagination({
    totalItems: projects.length,
    pageSize: 10,
    filterDeps: [search, statusFilter, regionFilter],
  });

  const paginatedProjects = projects.slice(projectOffset, projectOffset + 10);

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
  const [shortName, setShortName] = useState("");
  const [systemHisUrl, setSystemHisUrl] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [defaultPassword, setDefaultPassword] = useState("");
  const [showDefaultPassword, setShowDefaultPassword] = useState(false);
  const [level1StaffId, setLevel1StaffId] = useState("");
  const [level2StaffId, setLevel2StaffId] = useState("");
  const [level3StaffId, setLevel3StaffId] = useState("");
  const [contactStaffId, setContactStaffId] = useState("");
  const [contactStaffName, setContactStaffName] = useState("");
  const [contactStaffPosition, setContactStaffPosition] = useState("");
  const [saving, setSaving] = useState(false);

  // Hospital Facility search state for project creation
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [hospitalResults, setHospitalResults] = useState<any[]>([]);
  const [searchingHospitals, setSearchingHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);

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

  const fetchRegions = async () => {
    try {
      const res = await fetch("/api/regions");
      const json = await res.json();
      if (json.success) setRegions(json.data || []);
    } catch (err) {
      console.error("Lỗi tải danh mục khu vực:", err);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (regionFilter && regionFilter !== "all") params.set("regionId", regionFilter);

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
    fetchRegions();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchProjects();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, statusFilter, regionFilter]);

  useEffect(() => {
    if (!hospitalSearch.trim() || !modalOpen || editingProject) {
      setHospitalResults([]);
      setSearchingHospitals(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingHospitals(true);
      try {
        const res = await fetch(`/api/hospitals?q=${encodeURIComponent(hospitalSearch.trim())}&limit=12`);
        const json = await res.json();
        if (json.success) {
          setHospitalResults(json.data || []);
          setShowHospitalDropdown(true);
        }
      } catch (err) {
        console.error("Error searching hospitals:", err);
      } finally {
        setSearchingHospitals(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [hospitalSearch, modalOpen, editingProject]);

  const handleSelectHospital = (h: any) => {
    setSelectedHospital(h);
    setProjectCode(h.code);
    setProjectName(h.name);

    // Gợi ý shortName từ chữ cái đầu của tên hoặc mã
    if (!shortName.trim()) {
      const words = h.name.split(/\s+/).filter(Boolean);
      const initials = words.map((w: string) => w[0]).join("").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (initials.length >= 2 && initials.length <= 10) {
        setShortName(initials);
      } else if (h.code) {
        const c = h.code.toUpperCase().replace(/[^A-Z0-9]/g, "");
        setShortName(`BV${c}`.slice(0, 10));
      }
    }

    // Tự động điền mô tả từ tuyến, hạng, địa chỉ nếu chưa có
    if (!description.trim()) {
      const parts: string[] = [];
      if (h.technicalLine) parts.push(`Tuyến: ${h.technicalLine}`);
      if (h.hospitalRank) parts.push(`Hạng: ${h.hospitalRank}`);
      if (h.address) parts.push(`Địa chỉ: ${h.address}`);
      setDescription(parts.join(" • "));
    }

    setShowHospitalDropdown(false);
    success(`Đã lấy Mã "${h.code}" và Tên "${h.name}" từ CSKCB!`);
  };

  const handleClearSelectedHospital = () => {
    setSelectedHospital(null);
    setHospitalSearch("");
    setHospitalResults([]);
    setShowHospitalDropdown(false);
  };

  const openAddModal = () => {
    setEditingProject(null);
    setSelectedHospital(null);
    setHospitalSearch("");
    setHospitalResults([]);
    setShowHospitalDropdown(false);
    setProjectName("");
    setProjectCode("");
    setShortName("");
    setSystemHisUrl("");
    setDefaultPassword("");
    setShowDefaultPassword(false);
    setDescription("");
    setStatus("active");
    setProjectRegionId("");
    setLevel1StaffId("");
    setLevel2StaffId("");
    setLevel3StaffId("");
    setContactStaffId("");
    setContactStaffName("");
    setContactStaffPosition("");
    setModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingProject(p);
    setSelectedHospital(null);
    setHospitalSearch("");
    setHospitalResults([]);
    setShowHospitalDropdown(false);
    setProjectName(p.projectName);
    setProjectCode(p.projectCode || "");
    setShortName(p.shortName || "");
    setSystemHisUrl(p.systemHisUrl);
    setDefaultPassword(p.defaultPassword || "");
    setShowDefaultPassword(false);
    setDescription(p.description || "");
    setStatus(p.status || "active");
    setProjectRegionId(p.regionId || "");
    setLevel1StaffId(p.level1?.id || "");
    setLevel2StaffId(p.level2?.id || "");
    setLevel3StaffId(p.level3?.id || "");
    setContactStaffId(p.contactStaffId || p.contactStaff?.id || "");
    setContactStaffName(p.contactStaffName || p.contactStaff?.fullName || "");
    setContactStaffPosition(p.contactStaffPosition || p.contactStaff?.department || "");
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
          shortName: shortName.trim().toUpperCase() || null,
          systemHisUrl,
          defaultPassword: defaultPassword.trim() || null,
          description,
          status,
          regionId: projectRegionId || null,
          level1StaffId,
          level2StaffId: level2StaffId || null,
          level3StaffId: level3StaffId || null,
          contactStaffId: contactStaffId || null,
          contactStaffName: contactStaffName.trim() || null,
          contactStaffPosition: contactStaffPosition.trim() || null,
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
    const ok = await confirm({
      title: "Xóa dự án?",
      message: `Bạn có chắc chắn muốn xóa dự án "${name}" không? Hành động này sẽ chuyển trạng thái dự án sang đã xóa.`,
      confirmText: "Xóa dự án",
      variant: "danger",
    });
    if (!ok) return;

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
    const ok = await confirm({
      title: "Xóa tài khoản site?",
      message: `Bạn có chắc chắn muốn xóa tài khoản "${acc.accountLabel}" (${acc.siteLoginUsername}) khỏi két dự án không?`,
      confirmText: "Xóa tài khoản",
      variant: "danger",
    });
    if (!ok) return;

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
    <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen">
      <Header
        title="Quản lý Link Dự án & Cấp độ Phụ trách"
        subtitle="Hệ thống HIS, Staging/Live Portal và ma trận phân cấp trách nhiệm Level 1/2/3"
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportModalOpen(true)}
              className="px-3 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] font-medium text-xs flex items-center gap-1.5 transition-colors border border-[#DDE2E9] shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#15803D]" />
              <span>Import Excel</span>
            </button>
            <button
              onClick={openAddModal}
              className="px-3 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-medium shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Dự án mới</span>
            </button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl w-full mx-auto">
        {/* Search & Status Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-md bg-white border border-[#DDE2E9] shadow-xs">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên dự án, mã, mô tả..."
              className="w-full px-3 py-1.5 pl-9 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
            />
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase shrink-0">Khu vực:</span>
              <select
                value={regionFilter}
                onChange={(e) => {
                  setRegionFilter(e.target.value);
                  setProjectPage(1);
                }}
                className="px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
              >
                <option value="all">Tất cả khu vực</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-0.5 bg-[#F1F3F6] rounded-md border border-[#DDE2E9]">
            {[
              { id: "all", label: "Tất cả" },
              { id: "active", label: "Đang chạy" },
              { id: "maintenance", label: "Bảo trì" },
              { id: "closed", label: "Đã đóng" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors shrink-0 ${
                  statusFilter === st.id
                    ? "bg-white text-[#2457A7] shadow-xs font-semibold"
                    : "text-[#64748B] hover:text-[#172033] hover:bg-[#E2E8F0]/60"
                }`}
              >
                {st.label}
              </button>
            ))}
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <CardGridSkeleton count={4} />
        ) : projects.length === 0 ? (
          <EmptyState
            title="Chưa có dự án nào"
            description={
              search || statusFilter !== "all"
                ? "Không tìm thấy dự án nào khớp với điều kiện lọc hiện tại. Hãy thử xóa bộ lọc tìm kiếm."
                : "Chưa có dự án nào trong hệ thống. Hãy thêm dự án mới hoặc nhập nhanh từ file Excel."
            }
            icon={<FolderKanban className="w-6 h-6 text-[#64748B]" />}
            action={
              search || statusFilter !== "all" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#F1F3F6] hover:bg-[#E2E8F0] text-[#172033] border border-[#DDE2E9] transition-colors"
                >
                  Xóa bộ lọc
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo dự án đầu tiên</span>
                </button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginatedProjects.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-md bg-white border border-[#DDE2E9] shadow-xs hover:border-[#CBD5E1] transition-colors flex flex-col justify-between space-y-3.5"
              >
                <div className="space-y-3">
                  {/* Top Bar: Code, Status & Actions */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7] uppercase">
                        {p.projectCode || "PROJECT"}
                      </span>
                      {p.shortName && (
                        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[#F1F3F6] text-[#475569] border border-[#DDE2E9] uppercase" title="Tên viết tắt / Prefix sinh mã yêu cầu (QLYC)">
                          QLYC: {p.shortName}
                        </span>
                      )}
                      {p.region && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1" title={`Khu vực: ${p.region.name}`}>
                          <MapPin className="w-3 h-3 text-blue-500" />
                          <span>{p.region.name}</span>
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1.5 ${
                          p.status === "active"
                            ? "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]"
                            : p.status === "maintenance"
                              ? "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                              : "bg-[#F1F3F6] text-[#64748B] border border-[#DDE2E9]"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            p.status === "active"
                              ? "bg-[#15803D]"
                              : p.status === "maintenance"
                                ? "bg-[#B45309]"
                                : "bg-[#94A3B8]"
                          }`}
                        />
                        {p.status === "active" ? "Đang vận hành" : p.status === "maintenance" ? "Bảo trì" : "Đã đóng"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 rounded hover:bg-[#F1F3F6] text-[#64748B] hover:text-[#172033] transition-colors"
                        title="Sửa thông tin dự án"
                        aria-label="Sửa thông tin dự án"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.projectName)}
                        className="p-1.5 rounded hover:bg-[#FEF2F2] text-[#64748B] hover:text-[#B91C1C] transition-colors"
                        title="Xóa dự án"
                        aria-label="Xóa dự án"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Project Name & Description */}
                  <div>
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors leading-snug inline-flex items-center gap-1 group"
                    >
                      <span>{p.projectName}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    {p.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}
                  </div>

                  {/* HIS URL Bar */}
                  <div className="p-2 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                    <a
                      href={p.systemHisUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-blue-600 hover:underline truncate max-w-[280px] sm:max-w-md"
                      title={p.systemHisUrl}
                    >
                      {p.systemHisUrl}
                    </a>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(p.systemHisUrl, p.id)}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                        title="Sao chép link hệ thống HIS"
                      >
                        {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={p.systemHisUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-blue-600 transition-colors"
                        title="Mở link hệ thống HIS trên tab mới"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Default Site Password */}
                  {p.defaultPassword && (
                    <div className="px-2.5 py-1.5 rounded-md bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="text-[11px] text-amber-700 font-medium shrink-0">Mật khẩu mặc định:</span>
                        <span className="text-xs font-mono font-semibold text-amber-900 truncate">{p.defaultPassword}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(p.defaultPassword, "pass_" + p.id)}
                        className="p-1 rounded hover:bg-amber-100 text-amber-700 transition-colors shrink-0"
                        title="Sao chép mật khẩu mặc định"
                      >
                        {copiedId === "pass_" + p.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Phụ trách & Đầu mối */}
                  <div className="space-y-1.5 text-xs pt-0.5">
                    {(p.level1 || p.level2 || p.level3) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mr-0.5">
                          <Users2 className="w-3.5 h-3.5 text-slate-400" />
                          Phụ trách:
                        </span>
                        {p.level1 && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            Lead: {p.level1.fullName}
                          </span>
                        )}
                        {p.level2 && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            PM: {p.level2.fullName}
                          </span>
                        )}
                        {p.level3 && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            Dir: {p.level3.fullName}
                          </span>
                        )}
                      </div>
                    )}

                    {(p.contactStaffName || p.contactStaff) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mr-0.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Đầu mối:
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <span>{p.contactStaffName || p.contactStaff?.fullName}</span>
                          {(p.contactStaffPosition || p.contactStaff?.department) && (
                            <span className="text-emerald-600 font-normal">
                              ({p.contactStaffPosition || p.contactStaff?.department})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Credential Count & Actions */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs flex-wrap">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Tài khoản két: <strong className="text-slate-800 font-semibold">{p.accountCount || 0}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openProjectDetail(p)}
                      className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                      title="Xem nhanh két tài khoản"
                    >
                      Két nhanh
                    </button>
                    <Link
                      href={`/projects/${p.id}`}
                      className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Mở màn hình Chi tiết Dự án & Quản lý yêu cầu (M4)"
                    >
                      <FolderKanban className="w-3.5 h-3.5" />
                      <span>Chi tiết dự án</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Accessible Pagination Landmark */}
        {projects.length > 0 && (
          <Pagination
            currentPage={projectPage}
            totalItems={projects.length}
            pageSize={10}
            onPageChange={setProjectPage}
            filterDeps={[search, statusFilter]}
            className="mt-2"
          />
        )}
      </div>

      {/* Add / Edit Project Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProject ? "Chỉnh sửa Dự án" : "Tạo Dự án Mới"}
        subtitle="Quản lý link cổng hệ thống HIS và thiết lập ma trận trách nhiệm Level 1/2/3"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          {/* Quick Lookup from CSKCB Catalog (Chỉ hiện khi Tạo mới dự án) */}
          {!editingProject && (
            <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 space-y-2 relative">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">
                      Chọn nhanh từ Danh mục Cơ sở Khám chữa bệnh
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Tự động gán Mã dự án = Mã CSKCB, Tên dự án = Tên bệnh viện
                    </span>
                  </div>
                </div>
                {selectedHospital && (
                  <button
                    type="button"
                    onClick={handleClearSelectedHospital}
                    className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 font-medium transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Bỏ chọn
                  </button>
                )}
              </div>

              {selectedHospital ? (
                <div className="p-2.5 rounded-md bg-white border border-emerald-300 flex items-start justify-between gap-2 shadow-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {selectedHospital.code}
                      </span>
                      <span className="text-xs font-semibold text-slate-900">
                        {selectedHospital.name}
                      </span>
                    </div>
                    {selectedHospital.address && (
                      <p className="text-[11px] text-slate-500 leading-snug">
                        📍 {selectedHospital.address}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHospital(null);
                      setHospitalSearch("");
                    }}
                    className="text-[11px] text-blue-600 hover:underline shrink-0 font-medium"
                  >
                    Đổi CS khác
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={hospitalSearch}
                      onChange={(e) => {
                        setHospitalSearch(e.target.value);
                        setShowHospitalDropdown(true);
                      }}
                      onFocus={() => {
                        if (hospitalResults.length > 0) setShowHospitalDropdown(true);
                      }}
                      placeholder="Tìm theo Mã (01001, 79001...), Tên bệnh viện (Bạch Mai, Đa khoa...)..."
                      className="w-full pl-9 pr-9 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchingHospitals && (
                      <div className="absolute right-3">
                        <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                      </div>
                    )}
                    {hospitalSearch && !searchingHospitals && (
                      <button
                        type="button"
                        onClick={() => {
                          setHospitalSearch("");
                          setHospitalResults([]);
                          setShowHospitalDropdown(false);
                        }}
                        className="absolute right-3 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown search results */}
                  {showHospitalDropdown && hospitalSearch.trim().length >= 2 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {searchingHospitals ? (
                        <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                          <span>Đang tra cứu cơ sở y tế...</span>
                        </div>
                      ) : hospitalResults.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500">
                          Không tìm thấy cơ sở y tế phù hợp. Bạn có thể nhập tay thông tin bên dưới.
                        </div>
                      ) : (
                        hospitalResults.map((h) => (
                          <div
                            key={h.code}
                            onClick={() => handleSelectHospital(h)}
                            className="p-2.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-2 text-left"
                          >
                            <span className="font-mono font-semibold text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0 mt-0.5">
                              {h.code}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-slate-900 text-xs block">
                                {h.name}
                              </span>
                              {h.address && (
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  📍 {h.address}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                Tên Dự án <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="VD: Bệnh viện Đa khoa Quốc tế (HIS)"
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Mã Dự án (Project Code)
              </label>
              <input
                type="text"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                placeholder="VD: BVDK-QT"
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs uppercase font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Tên viết tắt (Prefix QLYC)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">A-Z, 0-9</span>
              </div>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="VD: DKCT, BVBM..."
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs uppercase font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Phân loại Khu vực</span>
              </label>
              <select
                value={projectRegionId}
                onChange={(e) => setProjectRegionId(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Chưa phân loại khu vực --</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                Trạng thái
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Đang vận hành (Active)</option>
                <option value="maintenance">Bảo trì (Maintenance)</option>
                <option value="closed">Đã đóng (Closed)</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                Link Hệ thống HIS / Staging Portal <span className="text-rose-500">*</span>
              </label>
              <input
                type="url"
                required
                value={systemHisUrl}
                onChange={(e) => setSystemHisUrl(e.target.value)}
                placeholder="https://his.bvdkquocte.vn"
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Default Site Password */}
            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span>Mật khẩu mặc định Site</span>
                  <span className="text-[10px] text-amber-700 font-medium px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200">
                    Tự động dùng cho Két
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const pass = generateRandomPassword(14);
                    setDefaultPassword(pass);
                    success("Đã sinh mật khẩu mặc định ngẫu nhiên!");
                  }}
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
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
                  placeholder="Nhập mật khẩu mặc định của dự án..."
                  className="w-full px-3 py-2 pr-9 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowDefaultPassword(!showDefaultPassword)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                  title={showDefaultPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showDefaultPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Responsibility Assignment Level 1/2/3 */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="font-semibold text-slate-800 text-xs flex items-center justify-between">
              <span>Phân công Cấp độ Phụ trách (Ma trận L1/L2/L3)</span>
              <span className="text-[10px] text-slate-500">1 nhân sự chỉ 1 Level/dự án</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Combobox
                label="Level 1 (Kỹ thuật)"
                required
                options={staffList.map((s) => ({
                  value: s.id,
                  label: s.fullName,
                  subLabel: s.staffCode ? `Mã: ${s.staffCode}` : s.department,
                }))}
                value={level1StaffId}
                onChange={(val) => setLevel1StaffId(val)}
                placeholder="-- Chọn nhân sự --"
              />

              <Combobox
                label="Level 2 (PM)"
                options={staffList.map((s) => ({
                  value: s.id,
                  label: s.fullName,
                  subLabel: s.staffCode ? `Mã: ${s.staffCode}` : s.department,
                }))}
                value={level2StaffId}
                onChange={(val) => setLevel2StaffId(val)}
                placeholder="-- Không yêu cầu --"
              />

              <Combobox
                label="Level 3 (Director)"
                options={staffList.map((s) => ({
                  value: s.id,
                  label: s.fullName,
                  subLabel: s.staffCode ? `Mã: ${s.staffCode}` : s.department,
                }))}
                value={level3StaffId}
                onChange={(val) => setLevel3StaffId(val)}
                placeholder="-- Không yêu cầu --"
              />
            </div>
          </div>

          {/* Nhóm thông tin: Nhân sự đầu mối */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="font-semibold text-slate-800 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <User className="w-3.5 h-3.5" />
                Nhân sự đầu mối phụ trách
              </span>
              <span className="text-[10px] text-slate-500">Người chịu trách nhiệm liên hệ & phối hợp</span>
            </div>

            <div className="space-y-2.5">
              <Combobox
                label="Chọn từ danh sách nhân sự"
                options={staffList.map((s) => ({
                  value: s.id,
                  label: s.fullName,
                  subLabel: s.staffCode ? `Mã: ${s.staffCode} • ${s.department || ""}` : s.department,
                }))}
                value={contactStaffId}
                onChange={(sId) => {
                  setContactStaffId(sId);
                  if (sId) {
                    const found = staffList.find((s) => s.id === sId);
                    if (found) {
                      setContactStaffName(found.fullName || "");
                      if (found.department) {
                        setContactStaffPosition(found.department);
                      }
                    }
                  }
                }}
                placeholder="-- Chọn nhân sự từ hệ thống --"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">
                    Tên nhân sự
                  </label>
                  <input
                    type="text"
                    value={contactStaffName}
                    onChange={(e) => setContactStaffName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A..."
                    className="w-full px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 text-xs placeholder-slate-400 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">
                    Vị trí / Chức danh
                  </label>
                  <input
                    type="text"
                    value={contactStaffPosition}
                    onChange={(e) => setContactStaffPosition(e.target.value)}
                    placeholder="VD: Trưởng dự án, Kỹ sư triển khai..."
                    className="w-full px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 text-xs placeholder-slate-400 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Mô tả dự án
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả phạm vi, khách hàng hoặc nghiệp vụ dự án..."
              className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors shadow-xs"
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
        subtitle={`Mã: ${selectedProject?.projectCode || "N/A"} • Két tài khoản site`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-0.5">
          {/* Project Summary Card */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                  {selectedProject?.projectCode || "PROJECT"}
                </span>
                {selectedProject?.shortName && (
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                    Prefix QLYC: {selectedProject.shortName}
                  </span>
                )}
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1.5 ${
                    selectedProject?.status === "active"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : selectedProject?.status === "maintenance"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      selectedProject?.status === "active" ? "bg-emerald-600" : "bg-slate-400"
                    }`}
                  />
                  {selectedProject?.status === "active"
                    ? "Đang vận hành"
                    : selectedProject?.status === "maintenance"
                      ? "Bảo trì"
                      : "Đã đóng"}
                </span>

                <Link
                  href={`/projects/${selectedProject?.id}`}
                  className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-medium inline-flex items-center gap-1 ml-auto transition-colors"
                >
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span>Trang Chi tiết & Quản lý yêu cầu ↗</span>
                </Link>
              </div>

              {selectedProject?.defaultPassword && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50/70 border border-amber-200">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[11px] text-amber-700 font-medium">Mật khẩu mặc định:</span>
                  <span className="text-xs font-mono font-semibold text-amber-900">{selectedProject.defaultPassword}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedProject.defaultPassword, "detail_pass")}
                    className="p-1 rounded hover:bg-amber-100 text-amber-700"
                    title="Sao chép mật khẩu"
                  >
                    {copiedId === "detail_pass" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {/* Link HIS Bar */}
            <div className="p-2 rounded-md bg-white border border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 shrink-0">Link HIS:</span>
                <span className="text-xs font-mono text-blue-600 truncate">{selectedProject?.systemHisUrl}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(selectedProject?.systemHisUrl || "", "detail_his")}
                  className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                  title="Sao chép link"
                >
                  {copiedId === "detail_his" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={selectedProject?.systemHisUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600"
                  title="Mở link trong tab mới"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Phụ trách L1/L2/L3 */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mr-0.5">
                <Users2 className="w-3.5 h-3.5 text-slate-400" />
                Phụ trách:
              </span>
              {selectedProject?.level1 && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  Level 1 (Kỹ thuật): {selectedProject.level1.fullName}
                </span>
              )}
              {selectedProject?.level2 && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  Level 2 (PM): {selectedProject.level2.fullName}
                </span>
              )}
              {selectedProject?.level3 && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  Level 3 (Director): {selectedProject.level3.fullName}
                </span>
              )}
            </div>

            {/* Nhân sự đầu mối */}
            {(selectedProject?.contactStaffName || selectedProject?.contactStaff) && (
              <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1.5 border-t border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mr-0.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Đầu mối:
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span>{selectedProject.contactStaffName || selectedProject.contactStaff?.fullName}</span>
                  {(selectedProject.contactStaffPosition || selectedProject.contactStaff?.department) && (
                    <span className="text-emerald-600 font-normal">
                      — {selectedProject.contactStaffPosition || selectedProject.contactStaff?.department}
                    </span>
                  )}
                  {selectedProject.contactStaff?.phoneNumber && (
                    <span className="text-slate-500 font-mono text-[10px] ml-1">
                      • SĐT: {selectedProject.contactStaff.phoneNumber}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Vault Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-semibold text-slate-900">Két Tài khoản Đăng nhập Site</h4>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
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
                    className="w-full px-2.5 py-1.5 pl-8 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                </div>
                <button
                  type="button"
                  onClick={openAddAccountModal}
                  className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs whitespace-nowrap transition-colors"
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
              <div className="py-10 px-4 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
                <KeyRound className="w-7 h-7 text-slate-400 mx-auto" />
                <p className="text-slate-500 text-xs">Chưa có tài khoản nào trong két của dự án này.</p>
                <button
                  type="button"
                  onClick={openAddAccountModal}
                  className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm tài khoản đầu tiên</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Tài khoản / Vai trò</th>
                      <th className="py-2.5 px-3">Nhân sự phụ trách</th>
                      <th className="py-2.5 px-3">Tên đăng nhập Site</th>
                      <th className="py-2.5 px-3">Mật khẩu</th>
                      <th className="py-2.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
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
                        <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900">{acc.accountLabel}</span>
                            {acc.notes && (
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{acc.notes}</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {acc.staff ? (
                              <div className="flex items-center gap-1.5">
                                <User className="w-3 h-3 text-slate-400" />
                                <span className="font-medium text-slate-900">{acc.staff.fullName}</span>
                                {acc.staff.staffCode && (
                                  <span className="text-[10px] text-slate-500">({acc.staff.staffCode})</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Dùng chung</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-medium text-blue-600">{acc.siteLoginUsername}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyAccUsername(acc.siteLoginUsername, acc.id)}
                                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                                title="Sao chép tên đăng nhập"
                              >
                                {copiedAccUsernameId === acc.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAccountForReveal(acc);
                                setRevealModalOpen(true);
                              }}
                              className="px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-medium flex items-center gap-1 transition-colors"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Xem mật khẩu</span>
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditAccountModal(acc)}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                                title="Sửa tài khoản"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAccount(acc)}
                                className="p-1.5 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600"
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
        <form onSubmit={handleSaveAccount} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Tên gợi nhớ / Chức danh <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={accountLabel}
              onChange={(e) => setAccountLabel(e.target.value)}
              placeholder="VD: Admin HIS, Bác sĩ trưởng ca, Tài khoản Kỹ thuật..."
              className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <Combobox
            label="Nhân sự được bàn giao / sử dụng"
            options={staffList.map((s) => ({
              value: s.id,
              label: s.fullName,
              subLabel: `${s.staffCode ? `Mã: ${s.staffCode} • ` : ""}${s.department || ""}`,
            }))}
            value={accountStaffId}
            onChange={(val) => setAccountStaffId(val)}
            placeholder="-- Dùng chung / Không gán đích danh --"
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Tên đăng nhập Site <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={siteLoginUsername}
              onChange={(e) => setSiteLoginUsername(e.target.value)}
              placeholder="VD: admin_bv, bsy_nguyenvana..."
              className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 font-mono placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Mật khẩu Site {editingAccount ? "(Để trống nếu không đổi)" : ""}
              </label>
              <button
                type="button"
                onClick={() => {
                  setSitePassword(generateRandomPassword(14));
                  success("Đã sinh mật khẩu ngẫu nhiên!");
                }}
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
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
              className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 font-mono placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            {!editingAccount && selectedProject?.defaultPassword && !sitePassword && (
              <p className="text-[11px] text-amber-700">
                Lưu ý: Mật khẩu đang để trống sẽ tự động kế thừa mật khẩu mặc định của dự án.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Ghi chú thêm
            </label>
            <textarea
              rows={2}
              value={accountNotes}
              onChange={(e) => setAccountNotes(e.target.value)}
              placeholder="Ghi chú phân quyền, nhóm khoa phòng hoặc lưu ý khi dùng..."
              className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setAccountModalOpen(false)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={savingAccount}
              className="px-4 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors shadow-xs"
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
        isOwner={selectedAccountForReveal?.isOwner}
      />
    </div>
  );
}

