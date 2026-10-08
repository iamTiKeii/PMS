"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { RichTextEditor } from "@/components/RichTextEditor";
import { RequestActivityTimeline } from "@/components/RequestActivityTimeline";
import {
  ArrowLeft,
  FolderKanban,
  ExternalLink,
  Edit2,
  Trash2,
  Users2,
  KeyRound,
  Copy,
  Check,
  Plus,
  Search,
  Calendar,
  Building,
  UserCheck,
  Eye,
  EyeOff,
  Filter,
  FileText,
  AlertCircle,
  Tag,
  Clock,
  Send,
  Sparkles,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useLoading } from "@/components/LoadingProvider";
import { ActionButton } from "@/components/ActionButton";
import { SectionLoading } from "@/components/SectionLoading";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const { success, error } = useToast();
  const { withLoading } = useLoading();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"accounts" | "requests">("accounts");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit Project Modal state
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [shortName, setShortName] = useState("");
  const [systemHisUrl, setSystemHisUrl] = useState("");
  const [defaultPassword, setDefaultPassword] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [level1StaffId, setLevel1StaffId] = useState("");
  const [level2StaffId, setLevel2StaffId] = useState("");
  const [level3StaffId, setLevel3StaffId] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  // Tab 1: Accounts state (UC-32, UC-33)
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountSearch, setAccountSearch] = useState("");
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountStaffId, setAccountStaffId] = useState("");
  const [siteLoginUsername, setSiteLoginUsername] = useState("");
  const [sitePassword, setSitePassword] = useState("");
  const [accountLabel, setAccountLabel] = useState("");
  const [accountNotes, setAccountNotes] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Tab 2: Requests state (UC-34 -> UC-39)
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [nextCodeInfo, setNextCodeInfo] = useState<any>(null);

  // Filters for requests (UC-39)
  const [requestSearch, setRequestSearch] = useState("");
  const [filterRequesterId, setFilterRequesterId] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterReceiverId, setFilterReceiverId] = useState("");
  const [filterFollowerId, setFilterFollowerId] = useState("");
  const [filterDueDate, setFilterDueDate] = useState("");
  const [filterHasJira, setFilterHasJira] = useState("");

  // Create / Edit Request Modal state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [reqRequesterId, setReqRequesterId] = useState("");
  const [reqRequesterName, setReqRequesterName] = useState("");
  const [reqDepartment, setReqDepartment] = useState("");
  const [reqReceiverId, setReqReceiverId] = useState("");
  const [reqContent, setReqContent] = useState("");
  const [reqDueDate, setReqDueDate] = useState("");
  const [reqFollowerIds, setReqFollowerIds] = useState<string[]>([]);
  const [reqJiraUrl, setReqJiraUrl] = useState("");
  const [reqStatus, setReqStatus] = useState("pending");
  const [savingRequest, setSavingRequest] = useState(false);

  // View Request Detail Modal state (UC-36)
  const [viewRequestModalOpen, setViewRequestModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [loadingRequestDetail, setLoadingRequestDetail] = useState(false);

  // Fetch project details
  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Không thể tải thông tin dự án.");
        setLoading(false);
        return;
      }
      setProject(json.data);
    } catch {
      error("Lỗi kết nối khi tải dự án.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch staff list for dropdowns
  const fetchStaffList = async () => {
    try {
      const res = await fetch("/api/staff?status=working");
      const json = await res.json();
      if (json.success) setStaffList(json.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch accounts (UC-32)
  const fetchAccounts = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/accounts`);
      const json = await res.json();
      if (json.success) setAccounts(json.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch requests (UC-34, UC-39)
  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const params = new URLSearchParams();
      if (requestSearch) params.set("q", requestSearch);
      if (filterRequesterId) params.set("requesterId", filterRequesterId);
      if (filterDepartment) params.set("department", filterDepartment);
      if (filterReceiverId) params.set("receiverId", filterReceiverId);
      if (filterFollowerId) params.set("followerId", filterFollowerId);
      if (filterDueDate) params.set("dueDate", filterDueDate);
      if (filterHasJira) params.set("hasJira", filterHasJira);

      const res = await fetch(`/api/projects/${projectId}/requests?${params.toString()}`);
      const json = await res.json();
      if (json.success) setRequests(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Fetch next code preview
  const fetchNextCode = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/requests/next-code`);
      const json = await res.json();
      if (json.success) setNextCodeInfo(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchStaffList();
    fetchAccounts();
    fetchRequests();
    fetchNextCode();
  }, [projectId]);

  useEffect(() => {
    if (activeTab === "requests") {
      fetchRequests();
      fetchNextCode();
    }
  }, [
    activeTab,
    requestSearch,
    filterRequesterId,
    filterDepartment,
    filterReceiverId,
    filterFollowerId,
    filterDueDate,
    filterHasJira,
  ]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    success("Đã sao chép vào bộ nhớ tạm!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Edit Project modal
  const openEditProject = () => {
    if (!project) return;
    setProjectName(project.projectName || "");
    setProjectCode(project.projectCode || "");
    setShortName(project.shortName || "");
    setSystemHisUrl(project.systemHisUrl || "");
    setDefaultPassword(project.defaultPassword || "");
    setDescription(project.description || "");
    setStatus(project.status || "active");

    const l1 = project.assignments?.find((a: any) => a.tierLevel === 1)?.staff?.id || "";
    const l2 = project.assignments?.find((a: any) => a.tierLevel === 2)?.staff?.id || "";
    const l3 = project.assignments?.find((a: any) => a.tierLevel === 3)?.staff?.id || "";
    setLevel1StaffId(l1);
    setLevel2StaffId(l2);
    setLevel3StaffId(l3);
    setEditProjectModalOpen(true);
  };

  // Handle Save Project
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProject(true);
    await withLoading(
      "save-project",
      "Đang cập nhật thông tin dự án...",
      async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectName,
              projectCode,
              shortName: shortName.trim().toUpperCase() || null,
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
            error(json.error?.message || "Lỗi cập nhật dự án.");
            return;
          }
          success("Cập nhật thông tin dự án thành công!");
          setEditProjectModalOpen(false);
          fetchProject();
          fetchNextCode();
        } catch {
          error("Lỗi hệ thống khi cập nhật dự án.");
        } finally {
          setSavingProject(false);
        }
      },
      { minDuration: 300 }
    );
  };

  // Handle Add Account (UC-33)
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountStaffId || !siteLoginUsername.trim()) {
      error("Vui lòng chọn nhân sự và nhập tên đăng nhập.");
      return;
    }

    setSavingAccount(true);
    await withLoading(
      "save-account",
      "Đang lưu tài khoản dự án...",
      async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}/accounts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              staffId: accountStaffId,
              siteLoginUsername: siteLoginUsername.trim(),
              sitePassword: sitePassword.trim() || project?.defaultPassword || "",
              accountLabel: accountLabel.trim(),
              notes: accountNotes.trim(),
            }),
          });

          const json = await res.json();
          if (!res.ok || !json.success) {
            error(json.error?.message || "Lỗi thêm tài khoản dự án.");
            return;
          }

          success(json.message || "Đã thêm tài khoản dự án thành công! (MSG-50)");
          setAccountModalOpen(false);
          setAccountStaffId("");
          setSiteLoginUsername("");
          setSitePassword("");
          setAccountLabel("");
          setAccountNotes("");
          fetchAccounts();
          fetchProject();
        } catch {
          error("Lỗi hệ thống khi lưu tài khoản.");
        } finally {
          setSavingAccount(false);
        }
      },
      { minDuration: 300 }
    );
  };

  // Open Add Request Modal (UC-35)
  const openAddRequestModal = () => {
    if (!project?.shortName) {
      error("Dự án chưa có Tên viết tắt (short_name). Vui lòng bấm [Sửa] để cấu hình Tên viết tắt trước khi tạo yêu cầu!");
      return;
    }
    setEditingRequest(null);
    setReqRequesterId("");
    setReqRequesterName("");
    setReqDepartment("");
    setReqReceiverId("");
    setReqContent("");
    setReqDueDate("");
    setReqFollowerIds([]);
    setReqJiraUrl("");
    setReqStatus("pending");
    fetchNextCode();
    setRequestModalOpen(true);
  };

  // Open Edit Request Modal (UC-37)
  const openEditRequestModal = (req: any) => {
    setEditingRequest(req);
    setReqRequesterId(req.requesterId || "");
    setReqRequesterName(req.requesterName || "");
    setReqDepartment(req.department || "");
    setReqReceiverId(req.receiverId || "");
    setReqContent(req.content || "");
    setReqDueDate(req.dueDate ? req.dueDate.split("T")[0] : "");
    setReqFollowerIds(req.followers?.map((f: any) => f.staffId) || []);
    setReqJiraUrl(req.jiraUrl || "");
    setReqStatus(req.status || "pending");
    setRequestModalOpen(true);
  };

  // Handle Save Request (UC-35, UC-37)
  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqRequesterId && !reqRequesterName.trim()) {
      error("Người yêu cầu không được để trống. (MSG-70)");
      return;
    }
    if (!reqContent.trim()) {
      error("Nội dung yêu cầu không được để trống. (MSG-71)");
      return;
    }

    setSavingRequest(true);
    await withLoading(
      "save-request",
      editingRequest ? "Đang cập nhật yêu cầu..." : "Đang tạo yêu cầu mới...",
      async () => {
        try {
          const url = editingRequest
            ? `/api/projects/${projectId}/requests/${editingRequest.id}`
            : `/api/projects/${projectId}/requests`;
          const method = editingRequest ? "PUT" : "POST";

          const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requesterId: reqRequesterId || null,
              requesterName: reqRequesterName.trim() || null,
              department: reqDepartment.trim() || null,
              receiverId: reqReceiverId || null,
              content: reqContent,
              dueDate: reqDueDate || null,
              followerIds: reqFollowerIds,
              jiraUrl: reqJiraUrl.trim() || null,
              status: reqStatus,
            }),
          });

          const json = await res.json();
          if (!res.ok || !json.success) {
            error(json.error?.message || "Lỗi lưu yêu cầu dự án.");
            return;
          }

          success(json.message || (editingRequest ? "Đã cập nhật yêu cầu. (MSG-74)" : "Đã thêm yêu cầu. (MSG-68)"));
          setRequestModalOpen(false);
          fetchRequests();
          fetchNextCode();
        } catch {
          error("Lỗi hệ thống khi lưu yêu cầu.");
        } finally {
          setSavingRequest(false);
        }
      },
      { minDuration: 300 }
    );
  };

  // Handle Delete Request (UC-38)
  const handleDeleteRequest = async (req: any) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa yêu cầu "${req.requestCode}"? Số thứ tự này sẽ không được tái sử dụng (BR-24).`)) {
      return;
    }
    await withLoading(
      "delete-request",
      `Đang xóa yêu cầu ${req.requestCode}...`,
      async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}/requests/${req.id}`, {
            method: "DELETE",
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            error(json.error?.message || "Lỗi xóa yêu cầu.");
            return;
          }
          success("Đã xóa yêu cầu. (MSG-75)");
          fetchRequests();
          fetchNextCode();
        } catch {
          error("Lỗi khi xóa yêu cầu.");
        }
      },
      { minDuration: 300 }
    );
  };

  // Open View Request Modal (UC-36) & fetch timeline activities
  const openViewRequest = async (req: any) => {
    setSelectedRequest(req);
    setViewRequestModalOpen(true);
    setLoadingRequestDetail(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/requests/${req.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSelectedRequest(json.data);
      }
    } catch (err) {
      console.error("Error fetching request activities:", err);
    } finally {
      setLoadingRequestDetail(false);
    }
  };

  // Toggle reveal password
  const toggleRevealPassword = (accId: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [accId]: !prev[accId] }));
  };

  // Filtered accounts
  const filteredAccounts = accounts.filter((acc) => {
    if (!accountSearch.trim()) return true;
    const q = accountSearch.toLowerCase();
    return (
      acc.siteLoginUsername?.toLowerCase().includes(q) ||
      acc.accountLabel?.toLowerCase().includes(q) ||
      acc.staff?.fullName?.toLowerCase().includes(q) ||
      acc.notes?.toLowerCase().includes(q)
    );
  });

  const level1 = project?.assignments?.find((a: any) => a.tierLevel === 1)?.staff;
  const level2 = project?.assignments?.find((a: any) => a.tierLevel === 2)?.staff;
  const level3 = project?.assignments?.find((a: any) => a.tierLevel === 3)?.staff;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        title="Quản lý Dự án & Nghiệp vụ phát sinh (M4)"
        subtitle="Chi tiết dự án, két tài khoản site và quản lý luồng yêu cầu phát sinh (QLYC)"
        actionButton={
          <Link
            href="/projects"
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Danh sách Dự án</span>
          </Link>
        }
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto flex-1">
        {loading ? (
          <SectionLoading text="Đang tải thông tin chi tiết dự án..." minHeight="360px" />
        ) : !project ? (
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Dự án không tồn tại hoặc đã bị xóa</h3>
            <Link href="/projects" className="text-xs text-blue-400 hover:underline">
              Quay lại danh sách dự án
            </Link>
          </div>
        ) : (
          <>
            {/* UI-08: Khối Thông tin Tổng quan Dự án */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
                      {project.projectCode || "PROJECT"}
                    </span>

                    {project.shortName ? (
                      <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase">
                        Tên viết tắt: {project.shortName}
                      </span>
                    ) : (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3 h-3" />
                        Chưa có Tên viết tắt (Prefix QLYC)
                      </span>
                    )}

                    <span
                      className={`text-xs font-extrabold px-3 py-1 rounded-xl flex items-center gap-1.5 ${
                        project.status === "active"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : project.status === "maintenance"
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          project.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-slate-400"
                        }`}
                      />
                      {project.status === "active"
                        ? "Đang vận hành"
                        : project.status === "maintenance"
                        ? "Bảo trì"
                        : "Đã đóng"}
                    </span>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {project.projectName}
                  </h1>

                  {project.description && (
                    <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </div>

                {/* Edit project button */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={openEditProject}
                    className="px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Sửa thông tin dự án</span>
                  </button>
                </div>
              </div>

              {/* HIS URL Bar & Credentials Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-0.5">
                      Đường dẫn Hệ thống HIS (Staging / Live)
                    </span>
                    <span className="text-xs font-mono text-cyan-300 truncate block">
                      {project.systemHisUrl}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(project.systemHisUrl, "his_url")}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Sao chép link HIS"
                    >
                      {copiedId === "his_url" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={project.systemHisUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 transition-all"
                      title="Mở link hệ thống HIS trên tab mới"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {project.defaultPassword ? (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold block mb-0.5">
                        Mật khẩu mặc định Site
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-200 truncate block">
                        {project.defaultPassword}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(project.defaultPassword, "def_pass")}
                      className="p-1.5 rounded-lg hover:bg-amber-500/20 text-amber-300 hover:text-white transition-colors shrink-0"
                      title="Sao chép mật khẩu mặc định"
                    >
                      {copiedId === "def_pass" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Chưa thiết lập mật khẩu mặc định site</span>
                    <button
                      type="button"
                      onClick={openEditProject}
                      className="text-blue-400 hover:underline text-[11px]"
                    >
                      Thiết lập
                    </button>
                  </div>
                )}
              </div>

              {/* Responsibility Matrix (Level 1, Level 2, Level 3) & Timestamps */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
                    <Users2 className="w-3.5 h-3.5 text-blue-400" />
                    Nhân sự phụ trách:
                  </span>
                  {level1 && (
                    <span className="px-2.5 py-1 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium text-[11px]">
                      <strong className="font-bold text-blue-400">Level 1 (Lead):</strong> {level1.fullName}
                    </span>
                  )}
                  {level2 && (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium text-[11px]">
                      <strong className="font-bold text-amber-400">Level 2 (PM):</strong> {level2.fullName}
                    </span>
                  )}
                  {level3 && (
                    <span className="px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium text-[11px]">
                      <strong className="font-bold text-purple-400">Level 3 (Dir):</strong> {level3.fullName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span>Ngày tạo: <strong>{formatDate(project.createdAt)}</strong></span>
                  <span>•</span>
                  <span>Cập nhật: <strong>{formatDate(project.updatedAt)}</strong></span>
                </div>
              </div>
            </div>

            {/* UI-08: 2 Tab Nghiệp vụ: Tài khoản dự án & Quản lý yêu cầu */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("accounts")}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                    activeTab === "accounts"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                      : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Tài khoản dự án</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/60 text-slate-300">
                    {accounts.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("requests")}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                    activeTab === "requests"
                      ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                      : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Quản lý yêu cầu (QLYC)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/60 text-cyan-300">
                    {requests.length}
                  </span>
                </button>
              </div>

              {/* TAB 1: TÀI KHOẢN DỰ ÁN (UI-11) */}
              {activeTab === "accounts" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div className="relative w-full sm:w-72">
                      <input
                        type="text"
                        value={accountSearch}
                        onChange={(e) => setAccountSearch(e.target.value)}
                        placeholder="Tìm nhân sự, tài khoản site..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    </div>

                    <button
                      type="button"
                      onClick={() => setAccountModalOpen(true)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm tài khoản</span>
                    </button>
                  </div>

                  {filteredAccounts.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs">
                      Chưa có tài khoản site nào được cấp phát cho dự án này.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3">Nhân sự</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Tài khoản (Username)</th>
                            <th className="px-4 py-3">Mật khẩu site</th>
                            <th className="px-4 py-3">Vai trò / Level</th>
                            <th className="px-4 py-3">Trạng thái</th>
                            <th className="px-4 py-3">Ghi chú</th>
                            <th className="px-4 py-3 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {filteredAccounts.map((acc) => {
                            const isRevealed = revealedPasswords[acc.id];
                            return (
                              <tr key={acc.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="px-4 py-3 font-semibold text-white">
                                  {acc.staff?.fullName || "N/A"}
                                </td>
                                <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                                  {acc.staff?.corporateEmail || "—"}
                                </td>
                                <td className="px-4 py-3 font-mono font-bold text-cyan-300">
                                  {acc.siteLoginUsername}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                  {acc.password ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-amber-200 font-bold">
                                        {isRevealed ? acc.password : "••••••••••••"}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => toggleRevealPassword(acc.id)}
                                        className="p-1 text-slate-400 hover:text-white"
                                        title={isRevealed ? "Ẩn" : "Hiện"}
                                      >
                                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(acc.password, `acc_pass_${acc.id}`)}
                                        className="p-1 text-slate-400 hover:text-white"
                                        title="Sao chép mật khẩu"
                                      >
                                        {copiedId === `acc_pass_${acc.id}` ? (
                                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-slate-500">•••••••••••• (Bảo mật)</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {acc.tierLevel ? (
                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                                      Level {acc.tierLevel}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    Đang dùng
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-400 text-[11px] max-w-[180px] truncate">
                                  {acc.notes || "—"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(acc.siteLoginUsername, `copy_u_${acc.id}`)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                    title="Sao chép username"
                                  >
                                    {copiedId === `copy_u_${acc.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: QUẢN LÝ YÊU CẦU (UI-12) (UC-34 -> UC-39) */}
              {activeTab === "requests" && (
                <div className="space-y-4">
                  {/* Action & Filter Bar */}
                  <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="relative w-full sm:w-80">
                        <input
                          type="text"
                          value={requestSearch}
                          onChange={(e) => setRequestSearch(e.target.value)}
                          placeholder="Tìm theo Mã QLYC, nội dung, khoa/phòng..."
                          className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      </div>

                      <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        {nextCodeInfo?.hasShortName && (
                          <div className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-300 hidden md:flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Mã tiếp theo: <strong>{nextCodeInfo.nextCode}</strong></span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={openAddRequestModal}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Thêm yêu cầu</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter Inputs (UC-39) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      <div>
                        <label className="text-slate-400 block mb-1">Người YC</label>
                        <select
                          value={filterRequesterId}
                          onChange={(e) => setFilterRequesterId(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                        >
                          <option value="">Tất cả</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>{s.fullName}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Khoa/phòng</label>
                        <input
                          type="text"
                          value={filterDepartment}
                          onChange={(e) => setFilterDepartment(e.target.value)}
                          placeholder="Khoa/phòng..."
                          className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Tiếp nhận</label>
                        <select
                          value={filterReceiverId}
                          onChange={(e) => setFilterReceiverId(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                        >
                          <option value="">Tất cả</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>{s.fullName}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Theo dõi</label>
                        <select
                          value={filterFollowerId}
                          onChange={(e) => setFilterFollowerId(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                        >
                          <option value="">Tất cả</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>{s.fullName}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Due Date</label>
                        <input
                          type="date"
                          value={filterDueDate}
                          onChange={(e) => setFilterDueDate(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Link Jira</label>
                        <select
                          value={filterHasJira}
                          onChange={(e) => setFilterHasJira(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                        >
                          <option value="">Tất cả</option>
                          <option value="true">Có Jira</option>
                          <option value="false">Không có Jira</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Requests Table (UC-34) */}
                  {loadingRequests ? (
                    <SectionLoading text="Đang tải danh sách yêu cầu phát sinh (QLYC)..." minHeight="240px" size="sm" />
                  ) : requests.length === 0 ? (
                    <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs space-y-2">
                      <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                      <p>Chưa có yêu cầu nào phát sinh cho dự án này.</p>
                      <button
                        type="button"
                        onClick={openAddRequestModal}
                        className="text-cyan-400 hover:underline font-bold"
                      >
                        Bấm vào đây để thêm yêu cầu đầu tiên
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3.5">Mã QLYC</th>
                            <th className="px-4 py-3.5">Người yêu cầu</th>
                            <th className="px-4 py-3.5">Khoa/phòng</th>
                            <th className="px-4 py-3.5">Nhân viên tiếp nhận</th>
                            <th className="px-4 py-3.5">Nội dung tóm tắt</th>
                            <th className="px-4 py-3.5">Due Date</th>
                            <th className="px-4 py-3.5">Theo dõi</th>
                            <th className="px-4 py-3.5">Link Jira</th>
                            <th className="px-4 py-3.5 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {requests.map((req) => (
                            <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-4 py-3 font-mono font-extrabold text-cyan-300">
                                <button
                                  type="button"
                                  onClick={() => openViewRequest(req)}
                                  className="hover:underline flex items-center gap-1"
                                >
                                  {req.requestCode}
                                </button>
                              </td>
                              <td className="px-4 py-3 font-medium text-white">
                                {req.requester?.fullName || req.requesterName || "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-300">
                                {req.department || "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-300">
                                {req.receiver?.fullName || "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                                {req.content ? req.content.replace(/<[^>]*>?/gm, "").slice(0, 70) : "—"}
                              </td>
                              <td className="px-4 py-3">
                                {req.dueDate ? (
                                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px]">
                                    {formatDate(req.dueDate)}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {req.followers?.length > 0 ? (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {req.followers.slice(0, 2).map((f: any) => (
                                      <span
                                        key={f.id}
                                        className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 text-[10px]"
                                      >
                                        {f.staff?.fullName}
                                      </span>
                                    ))}
                                    {req.followers.length > 2 && (
                                      <span className="text-[10px] text-slate-500">
                                        +{req.followers.length - 2}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-500">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {req.jiraUrl ? (
                                  <a
                                    href={req.jiraUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 hover:underline font-mono"
                                  >
                                    <span>Jira</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-slate-500">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openViewRequest(req)}
                                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                    title="Xem chi tiết (UC-36)"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditRequestModal(req)}
                                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                                    title="Sửa yêu cầu (UC-37)"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRequest(req)}
                                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                                    title="Xóa yêu cầu (UC-38)"
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
              )}
            </div>
          </>
        )}
      </div>

      {/* Edit Project Modal */}
      <Modal
        isOpen={editProjectModalOpen}
        onClose={() => setEditProjectModalOpen(false)}
        title="Chỉnh sửa Dự án"
        subtitle="Cập nhật cấu hình link HIS, Tên viết tắt (Prefix QLYC) và phân công phụ trách"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
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
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700 text-white text-sm uppercase font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Tên viết tắt (Prefix QLYC)</span>
                <span className="text-[10px] text-cyan-400 font-mono">A-Z, 0-9</span>
              </label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="VD: DKCT, BVBM..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700 text-white text-sm uppercase font-mono focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Link Hệ thống HIS <span className="text-rose-400">*</span>
              </label>
              <input
                type="url"
                required
                value={systemHisUrl}
                onChange={(e) => setSystemHisUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700 text-white text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Mật khẩu mặc định Site
              </label>
              <input
                type="text"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                placeholder="Hospital#MasterPass2026!"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700 text-white text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Trạng thái
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700 text-white text-sm"
              >
                <option value="active">Đang vận hành (Active)</option>
                <option value="maintenance">Bảo trì (Maintenance)</option>
                <option value="closed">Đã đóng (Closed)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Lead Kỹ thuật (Level 1) <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={level1StaffId}
                onChange={(e) => setLevel1StaffId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700 text-white text-sm"
              >
                <option value="">-- Chọn Level 1 --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName} ({s.staffCode || "N/A"})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                PM Quản lý (Level 2)
              </label>
              <select
                value={level2StaffId}
                onChange={(e) => setLevel2StaffId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700 text-white text-sm"
              >
                <option value="">-- Không yêu cầu --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName} ({s.staffCode || "N/A"})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Director (Level 3)
              </label>
              <select
                value={level3StaffId}
                onChange={(e) => setLevel3StaffId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700 text-white text-sm"
              >
                <option value="">-- Không yêu cầu --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName} ({s.staffCode || "N/A"})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Mô tả dự án
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700 text-white text-sm resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditProjectModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Hủy
            </button>
            <ActionButton
              type="submit"
              variant="primary"
              isLoading={savingProject}
              loadingText="Đang lưu..."
              className="px-6 py-2.5 text-xs font-bold"
            >
              Lưu thay đổi
            </ActionButton>
          </div>
        </form>
      </Modal>

      {/* Add Account Modal (UC-33) */}
      <Modal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        title="Thêm Tài khoản Site cho Dự án"
        subtitle={`Dự án: ${project?.projectName} (UC-33)`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveAccount} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Chọn Nhân sự <span className="text-rose-400">*</span>
            </label>
            <select
              required
              value={accountStaffId}
              onChange={(e) => setAccountStaffId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm"
            >
              <option value="">-- Chọn nhân sự tham gia --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.staffCode || "N/A"}) - {s.department || "Nhân sự"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tên đăng nhập Site (Username) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={siteLoginUsername}
              onChange={(e) => setSiteLoginUsername(e.target.value)}
              placeholder="VD: bs_minh_khoanhi, admin_staging..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Mật khẩu Site
              </label>
              {project?.defaultPassword && (
                <button
                  type="button"
                  onClick={() => setSitePassword(project.defaultPassword)}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Dùng pass mặc định site
                </button>
              )}
            </div>
            <input
              type="text"
              value={sitePassword}
              onChange={(e) => setSitePassword(e.target.value)}
              placeholder={project?.defaultPassword ? `Mặc định: ${project.defaultPassword}` : "Nhập mật khẩu..."}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Nhãn gợi nhớ (Tùy chọn)
            </label>
            <input
              type="text"
              value={accountLabel}
              onChange={(e) => setAccountLabel(e.target.value)}
              placeholder="VD: Bác sĩ trưởng ca, Tài khoản demo..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Ghi chú
            </label>
            <textarea
              rows={2}
              value={accountNotes}
              onChange={(e) => setAccountNotes(e.target.value)}
              placeholder="Phân quyền đặc biệt hoặc lưu ý khi dùng tài khoản này..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm resize-none"
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
            <ActionButton
              type="submit"
              variant="primary"
              isLoading={savingAccount}
              loadingText="Đang lưu..."
              className="px-6 py-2.5 text-xs font-bold"
            >
              Lưu tài khoản
            </ActionButton>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Request Modal (UC-35, UC-37) */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title={editingRequest ? `Sửa Yêu cầu: ${editingRequest.requestCode}` : "Thêm Yêu cầu Mới"}
        subtitle={`Dự án: ${project?.projectName} • ${
          editingRequest ? "Mã QLYC được giữ nguyên (BR-32)" : `Mã tự sinh dự kiến: ${nextCodeInfo?.nextCode || "..."}`
        }`}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveRequest} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Người yêu cầu <span className="text-rose-400">*</span>
              </label>
              <select
                value={reqRequesterId}
                onChange={(e) => {
                  setReqRequesterId(e.target.value);
                  if (e.target.value) setReqRequesterName("");
                }}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm"
              >
                <option value="">-- Chọn từ nhân sự công ty --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName} ({s.staffCode || "N/A"})</option>
                ))}
              </select>
              <div className="pt-1">
                <input
                  type="text"
                  value={reqRequesterName}
                  onChange={(e) => {
                    setReqRequesterName(e.target.value);
                    if (e.target.value) setReqRequesterId("");
                  }}
                  placeholder="Hoặc nhập tên người yêu cầu bên ngoài (bệnh viện)..."
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Khoa / Phòng
              </label>
              <input
                type="text"
                value={reqDepartment}
                onChange={(e) => setReqDepartment(e.target.value)}
                placeholder="VD: Khoa Khám bệnh, CNTT, KHTH..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Nhân viên tiếp nhận
              </label>
              <select
                value={reqReceiverId}
                onChange={(e) => setReqReceiverId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm"
              >
                <option value="">-- Chọn nhân sự tiếp nhận --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName} ({s.staffCode || "N/A"})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Due Date (Hạn hoàn thành)
              </label>
              <input
                type="date"
                value={reqDueDate}
                onChange={(e) => setReqDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Link Jira (Issue Ticket)
              </label>
              <input
                type="url"
                value={reqJiraUrl}
                onChange={(e) => setReqJiraUrl(e.target.value)}
                placeholder="https://jira.company.com/browse/HIS-1234"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm font-mono"
              />
            </div>

            {/* Followers Multi-select */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Nhân sự theo dõi
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                {staffList.map((s) => {
                  const isChecked = reqFollowerIds.includes(s.id);
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => {
                        setReqFollowerIds(
                          isChecked
                            ? reqFollowerIds.filter((id) => id !== s.id)
                            : [...reqFollowerIds, s.id]
                        );
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                        isChecked
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                      }`}
                    >
                      {isChecked ? "✓ " : "+ "}
                      {s.fullName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content with Rich Text Editor (BR-28) */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Nội dung yêu cầu <span className="text-rose-400">*</span></span>
                <span className="text-[10px] text-slate-400">Hỗ trợ định dạng Rich Text (Bold, Lists, Code, Bảng...)</span>
              </label>
              <RichTextEditor
                value={reqContent}
                onChange={setReqContent}
                placeholder="Mô tả chi tiết nội dung yêu cầu, nghiệp vụ phát sinh hoặc hướng xử lý..."
                minHeight="180px"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setRequestModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Hủy
            </button>
            <ActionButton
              type="submit"
              variant="primary"
              isLoading={savingRequest}
              loadingText="Đang lưu..."
              className="px-6 py-2.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-cyan-500/25"
            >
              {editingRequest ? "Lưu thay đổi" : "Tạo yêu cầu"}
            </ActionButton>
          </div>
        </form>
      </Modal>

      {/* View Request Detail Modal (UC-36) */}
      <Modal
        isOpen={viewRequestModalOpen}
        onClose={() => setViewRequestModalOpen(false)}
        title={selectedRequest?.requestCode || "Chi tiết Yêu cầu"}
        subtitle={`Dự án: ${project?.projectName} • Xem chi tiết công việc và nội dung rich text`}
        maxWidth="max-w-3xl"
      >
        {selectedRequest && (
          <div className="space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* Header badges */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-mono font-black px-3 py-1 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {selectedRequest.requestCode}
                </span>

                {/* Status Badge */}
                {(() => {
                  const st = selectedRequest.status || "pending";
                  let bg = "bg-amber-500/15 text-amber-300 border-amber-500/30";
                  let label = "Chờ xử lý";
                  if (st === "in_progress") {
                    bg = "bg-blue-500/15 text-blue-300 border-blue-500/30";
                    label = "Đang xử lý";
                  } else if (st === "completed") {
                    bg = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                    label = "Hoàn thành";
                  } else if (st === "closed") {
                    bg = "bg-slate-700/40 text-slate-300 border-slate-600/30";
                    label = "Đã đóng";
                  }
                  return (
                    <span className={`px-2.5 py-1 rounded-xl border text-xs font-bold ${bg}`}>
                      {label}
                    </span>
                  );
                })()}

                {selectedRequest.department && (
                  <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                    Khoa/phòng: <strong>{selectedRequest.department}</strong>
                  </span>
                )}
                {selectedRequest.jiraUrl && (
                  <a
                    href={selectedRequest.jiraUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 inline-flex items-center gap-1.5 transition-all font-mono"
                  >
                    <span>Mở Jira</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewRequestModalOpen(false);
                    openEditRequestModal(selectedRequest);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 font-bold transition-all flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Sửa yêu cầu</span>
                </button>
              </div>
            </div>

            {/* People & Context Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Người yêu cầu</span>
                <span className="text-xs font-bold text-white block mt-0.5">
                  {selectedRequest.requester?.fullName || selectedRequest.requesterName || "—"}
                </span>
                {selectedRequest.requester?.corporateEmail && (
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {selectedRequest.requester.corporateEmail}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Nhân viên tiếp nhận</span>
                <span className="text-xs font-bold text-white block mt-0.5">
                  {selectedRequest.receiver?.fullName || "—"}
                </span>
                {selectedRequest.receiver?.corporateEmail && (
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {selectedRequest.receiver.corporateEmail}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Due Date (Hạn hoàn thành)</span>
                <span className="text-xs font-mono font-bold text-amber-300 block mt-0.5">
                  {selectedRequest.dueDate ? formatDate(selectedRequest.dueDate) : "Không giới hạn"}
                </span>
              </div>

              <div className="sm:col-span-2 md:col-span-3 pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold mb-1">Nhân sự theo dõi</span>
                {selectedRequest.followers?.length > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedRequest.followers.map((f: any) => (
                      <span
                        key={f.id}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[11px]"
                      >
                        {f.staff?.fullName} ({f.staff?.staffCode || "N/A"})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </div>
            </div>

            {/* Rich Text Content */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Nội dung chi tiết
              </span>
              <div
                className="p-5 rounded-2xl bg-slate-950 border border-slate-800/90 text-slate-200 text-sm leading-relaxed prose prose-invert prose-sm max-w-none shadow-inner"
                dangerouslySetInnerHTML={{ __html: selectedRequest.content || "" }}
              />
            </div>

            {/* Request Activity Timeline (Lịch sử xử lý QLYC - SRS Mục 13 & UC-36) */}
            <div className="pt-3 border-t border-slate-800">
              <RequestActivityTimeline
                activities={selectedRequest.activities}
                isLoading={loadingRequestDetail}
              />
            </div>

            {/* Timestamps */}
            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Ngày tạo: <strong>{formatDate(selectedRequest.createdAt)}</strong></span>
              <span>Cập nhật lần cuối: <strong>{formatDate(selectedRequest.updatedAt)}</strong></span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
