"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { PasswordRevealModal } from "@/components/PasswordRevealModal";
import { Pagination, usePagination } from "@/components/Pagination";
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
  Lock,
  ShieldCheck,
  Copy,
  Check,
  Plus,
  Search,
  Calendar,
  Building,
  User,
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
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";
import { formatDate, formatShortDate } from "@/lib/utils";
import { useLoading } from "@/components/LoadingProvider";
import { ActionButton } from "@/components/ActionButton";
import { ProjectDetailSkeleton, TableSkeleton } from "@/components/Skeleton";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import { Combobox, MultiCombobox } from "@/components/Combobox";
import * as XLSX from "xlsx";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const { success, error } = useToast();
  const { confirm } = useConfirm();
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
  const [contactStaffId, setContactStaffId] = useState("");
  const [contactStaffName, setContactStaffName] = useState("");
  const [contactStaffPosition, setContactStaffPosition] = useState("");
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
  const [revealModalOpen, setRevealModalOpen] = useState(false);
  const [selectedAccountForReveal, setSelectedAccountForReveal] = useState<any>(null);

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

  // Pagination hook for QLYC
  const {
    page: requestPage,
    offset: requestOffset,
    goToPage: setRequestPage,
  } = usePagination({
    totalItems: requests.length,
    pageSize: 15,
    filterDeps: [
      requestSearch,
      filterRequesterId,
      filterDepartment,
      filterReceiverId,
      filterFollowerId,
      filterDueDate,
      filterHasJira,
    ],
  });

  const paginatedRequests = requests.slice(requestOffset, requestOffset + 15);

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

  // Export requests state
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exportingRequests, setExportingRequests] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close export dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setContactStaffId(project.contactStaffId || project.contactStaff?.id || "");
    setContactStaffName(project.contactStaffName || project.contactStaff?.fullName || "");
    setContactStaffPosition(project.contactStaffPosition || project.contactStaff?.department || "");
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
              contactStaffId: contactStaffId || null,
              contactStaffName: contactStaffName.trim() || null,
              contactStaffPosition: contactStaffPosition.trim() || null,
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
    const ok = await confirm({
      title: "Xóa yêu cầu (QLYC)?",
      message: `Bạn có chắc chắn muốn xóa yêu cầu "${req.requestCode}"? Số thứ tự này sẽ không được tái sử dụng (BR-24).`,
      confirmText: "Xóa yêu cầu",
      variant: "danger",
    });
    if (!ok) return;
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

  // Helper: Strip HTML tags and format text for Excel export
  const htmlToPlainText = (html?: string) => {
    if (!html) return "";
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<br\s*[\/]?>/gi, "\n")
      .replace(/<li>/gi, "• ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const getRequestStatusLabel = (reqStatusValue?: string) => {
    switch (reqStatusValue) {
      case "completed":
        return "Đã hoàn thành";
      case "in_progress":
        return "Đang xử lý";
      case "cancelled":
        return "Đã hủy";
      case "pending":
      default:
        return "Chờ xử lý";
    }
  };

  const hasActiveRequestFilters = Boolean(
    requestSearch.trim() ||
    filterRequesterId ||
    filterDepartment.trim() ||
    filterReceiverId ||
    filterFollowerId ||
    filterDueDate ||
    filterHasJira
  );

  const executeExcelExport = (itemsToExport: any[], scope: "loc" | "toan_bo") => {
    if (!itemsToExport || itemsToExport.length === 0) {
      error("Không có dữ liệu yêu cầu để xuất Excel.");
      return;
    }

    try {
      const exportData = itemsToExport.map((req: any, index: number) => {
        const requesterText = req.requester?.fullName || req.requesterName || "—";
        const requesterCode = req.requester?.staffCode || "—";
        const departmentText = req.department || req.requester?.department || "—";
        const receiverText = req.receiver?.fullName || "—";
        const receiverCode = req.receiver?.staffCode || "—";
        const followersText =
          req.followers && req.followers.length > 0
            ? req.followers
                .map((f: any) => f.staff?.fullName || f.staff?.staffCode)
                .filter(Boolean)
                .join(", ")
            : "—";

        return {
          "STT": index + 1,
          "Mã QLYC": req.requestCode || "—",
          "Người yêu cầu": requesterText,
          "Mã NV yêu cầu": requesterCode,
          "Khoa/phòng": departmentText,
          "Nhân viên tiếp nhận": receiverText,
          "Mã NV tiếp nhận": receiverCode,
          "Nội dung yêu cầu": htmlToPlainText(req.content) || "—",
          "Hạn xử lý (Due Date)": req.dueDate ? formatShortDate(req.dueDate) : "—",
          "Người theo dõi": followersText,
          "Trạng thái": getRequestStatusLabel(req.status),
          "Link Jira": req.jiraUrl || "—",
          "Người tạo": req.createdByUser?.username || "—",
          "Ngày tạo": req.createdAt ? formatDate(req.createdAt) : "—",
          "Cập nhật lần cuối": req.updatedAt ? formatDate(req.updatedAt) : "—",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet["!cols"] = [
        { wch: 6 },   // STT
        { wch: 16 },  // Mã QLYC
        { wch: 24 },  // Người yêu cầu
        { wch: 15 },  // Mã NV yêu cầu
        { wch: 22 },  // Khoa/phòng
        { wch: 24 },  // Nhân viên tiếp nhận
        { wch: 16 },  // Mã NV tiếp nhận
        { wch: 50 },  // Nội dung yêu cầu
        { wch: 16 },  // Hạn xử lý
        { wch: 28 },  // Người theo dõi
        { wch: 16 },  // Trạng thái
        { wch: 35 },  // Link Jira
        { wch: 16 },  // Người tạo
        { wch: 18 },  // Ngày tạo
        { wch: 18 },  // Cập nhật lần cuối
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách QLYC");

      const projectIdentifier = (project?.shortName || project?.projectCode || "DuAn").replace(/[^a-zA-Z0-9_-]/g, "_");
      const todayStr = new Date().toISOString().slice(0, 10);
      const fileName = `QLYC_${projectIdentifier}_${todayStr}.xlsx`;

      XLSX.writeFile(workbook, fileName);
      success(`Đã xuất thành công ${exportData.length} yêu cầu ra file Excel: ${fileName}`);

      // Gửi nhật ký kiểm toán (Audit log)
      fetch(`/api/projects/${projectId}/requests/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: exportData.length,
          scope: scope === "toan_bo" ? "toan_bo" : "dang_loc",
        }),
      }).catch(() => {});
    } catch (err) {
      console.error("Excel export error:", err);
      error("Đã xảy ra lỗi khi tạo file Excel.");
    }
  };

  const handleExportClick = () => {
    if (hasActiveRequestFilters) {
      setExportDropdownOpen((prev) => !prev);
    } else {
      executeExcelExport(requests, "toan_bo");
    }
  };

  const handleExportAllRequests = async () => {
    setExportDropdownOpen(false);
    setExportingRequests(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/requests`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        executeExcelExport(json.data, "toan_bo");
      } else {
        error("Không thể tải danh sách toàn bộ yêu cầu để xuất file.");
      }
    } catch {
      error("Lỗi kết nối khi tải dữ liệu xuất Excel.");
    } finally {
      setExportingRequests(false);
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
    <div className="min-h-screen bg-[#F1F3F6] text-[#172033] flex flex-col">
      <Header
        title="Quản lý Dự án & Nghiệp vụ phát sinh (M4)"
        subtitle="Chi tiết dự án, két tài khoản site và quản lý luồng yêu cầu phát sinh (QLYC)"
        actionButton={
          <Link
            href="/projects"
            className="px-3 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] border border-[#DDE2E9] text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Danh sách Dự án</span>
          </Link>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl w-full mx-auto flex-1">
        {loading ? (
          <ProjectDetailSkeleton />
        ) : !project ? (
          <div className="p-8 rounded-lg bg-white border border-[#DDE2E9] text-center space-y-3 shadow-xs">
            <AlertCircle className="w-8 h-8 text-[#B91C1C] mx-auto" />
            <h3 className="text-sm font-semibold text-[#172033]">Dự án không tồn tại hoặc đã bị xóa</h3>
            <Link href="/projects" className="text-xs text-[#2457A7] hover:underline">
              Quay lại danh sách dự án
            </Link>
          </div>
        ) : (
          <>
            {/* UI-08: Khối Thông tin Tổng quan Dự án */}
            <div className="p-4 sm:p-5 rounded-lg bg-white border border-[#DDE2E9] shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7] uppercase">
                      {project.projectCode || "PROJECT"}
                    </span>

                    {project.shortName ? (
                      <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-[#F1F3F6] text-[#172033] border border-[#DDE2E9] uppercase">
                        Tên viết tắt: {project.shortName}
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        Chưa có Tên viết tắt (Prefix QLYC)
                      </span>
                    )}

                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1.5 ${
                        project.status === "active"
                          ? "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]"
                          : project.status === "maintenance"
                          ? "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                          : "bg-[#F1F3F6] text-[#64748B] border border-[#DDE2E9]"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          project.status === "active" ? "bg-[#15803D]" : "bg-[#94A3B8]"
                        }`}
                      />
                      {project.status === "active"
                        ? "Đang vận hành"
                        : project.status === "maintenance"
                        ? "Bảo trì"
                        : "Đã đóng"}
                    </span>
                  </div>

                  <h1 className="text-lg sm:text-xl font-bold text-[#172033] leading-snug">
                    {project.projectName}
                  </h1>

                  {project.description && (
                    <p className="text-xs text-[#64748B] max-w-3xl leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </div>

                {/* Edit project button */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={openEditProject}
                    className="px-3 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] border border-[#DDE2E9] text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Sửa thông tin dự án</span>
                  </button>
                </div>
              </div>

              {/* HIS URL Bar & Credentials Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] flex items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <span className="text-[10px] text-[#64748B] uppercase font-semibold block mb-0.5">
                      Đường dẫn Hệ thống HIS (Staging / Live)
                    </span>
                    <a
                      href={project.systemHisUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-[#2457A7] hover:underline truncate block"
                      title={project.systemHisUrl}
                    >
                      {project.systemHisUrl}
                    </a>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(project.systemHisUrl, "his_url")}
                      className="p-1 rounded hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#172033] transition-colors"
                      title="Sao chép link HIS"
                    >
                      {copiedId === "his_url" ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={project.systemHisUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#2457A7] transition-colors"
                      title="Mở link hệ thống HIS trên tab mới"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {project.defaultPassword ? (
                  <div className="p-3 rounded-md bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#B45309] uppercase font-semibold block mb-0.5">
                        Mật khẩu mặc định Site
                      </span>
                      <span className="text-xs font-mono font-semibold text-[#78350F] truncate block">
                        {project.defaultPassword}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(project.defaultPassword, "def_pass")}
                      className="p-1 rounded hover:bg-[#FEF3C7] text-[#B45309] transition-colors shrink-0"
                      title="Sao chép mật khẩu mặc định"
                    >
                      {copiedId === "def_pass" ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] flex items-center justify-between text-xs text-[#64748B]">
                    <span>Chưa thiết lập mật khẩu mặc định site</span>
                    <button
                      type="button"
                      onClick={openEditProject}
                      className="text-[#2457A7] hover:underline text-[11px] font-medium"
                    >
                      Thiết lập
                    </button>
                  </div>
                )}
              </div>

              {/* Nhân sự đầu mối */}
              {(project.contactStaffName || project.contactStaff) && (
                <div className="p-3 rounded-md bg-[#F0FDF4] border border-[#BBF7D0] flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-[#DCFCE7] border border-[#BBF7D0] flex items-center justify-center text-[#15803D] shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] uppercase font-semibold text-[#166534]">
                          Nhân sự đầu mối
                        </span>
                        {(project.contactStaffPosition || project.contactStaff?.department) && (
                          <span className="text-[11px] font-normal text-[#15803D]">
                            ({project.contactStaffPosition || project.contactStaff?.department})
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-[#172033] flex items-center gap-1.5 mt-0.5">
                        <span>{project.contactStaffName || project.contactStaff?.fullName}</span>
                        {project.contactStaff?.staffCode && (
                          <span className="text-[11px] font-mono font-normal text-[#64748B]">
                            ({project.contactStaff.staffCode})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {(project.contactStaff?.phoneNumber || project.contactStaff?.corporateEmail) && (
                    <div className="text-right text-xs text-[#172033]">
                      {project.contactStaff?.phoneNumber && (
                        <div className="font-mono text-[#15803D] font-semibold flex items-center gap-1 justify-end">
                          <span className="text-[#64748B] font-sans text-[11px]">SĐT:</span>
                          <span>{project.contactStaff.phoneNumber}</span>
                        </div>
                      )}
                      {project.contactStaff?.corporateEmail && (
                        <div className="text-[11px] text-[#64748B]">
                          {project.contactStaff.corporateEmail}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Responsibility Matrix (Level 1, Level 2, Level 3) & Timestamps */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[#EDF1F5] text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-[#64748B] flex items-center gap-1 mr-0.5">
                    <Users2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                    Phụ trách:
                  </span>
                  {level1 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7]">
                      Level 1 (Lead): {level1.fullName}
                    </span>
                  )}
                  {level2 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                      Level 2 (PM): {level2.fullName}
                    </span>
                  )}
                  {level3 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FAF5FF] text-[#7E22CE] border border-[#E9D5FF]">
                      Level 3 (Dir): {level3.fullName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                  <span>Ngày tạo: <strong>{formatDate(project.createdAt)}</strong></span>
                  <span>•</span>
                  <span>Cập nhật: <strong>{formatDate(project.updatedAt)}</strong></span>
                </div>
              </div>
            </div>

            {/* UI-08: 2 Tab Nghiệp vụ: Tài khoản dự án & Quản lý yêu cầu */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#DDE2E9]">
                <button
                  type="button"
                  onClick={() => setActiveTab("accounts")}
                  className={`px-4 py-2 border-b-2 text-xs font-medium flex items-center gap-2 transition-colors ${
                    activeTab === "accounts"
                      ? "border-[#2457A7] text-[#2457A7] font-semibold bg-white rounded-t-md border-t border-x border-[#DDE2E9] -mb-px"
                      : "border-transparent text-[#64748B] hover:text-[#172033]"
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Tài khoản dự án</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#F1F3F6] text-[#64748B] border border-[#DDE2E9]">
                    {accounts.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("requests")}
                  className={`px-4 py-2 border-b-2 text-xs font-medium flex items-center gap-2 transition-colors ${
                    activeTab === "requests"
                      ? "border-[#2457A7] text-[#2457A7] font-semibold bg-white rounded-t-md border-t border-x border-[#DDE2E9] -mb-px"
                      : "border-transparent text-[#64748B] hover:text-[#172033]"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Quản lý yêu cầu (QLYC)</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#F1F3F6] text-[#64748B] border border-[#DDE2E9]">
                    {requests.length}
                  </span>
                </button>
              </div>

              {/* TAB 1: TÀI KHOẢN DỰ ÁN */}
              {activeTab === "accounts" && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg bg-white border border-[#DDE2E9] shadow-xs">
                    <div className="relative w-full sm:w-72">
                      <input
                        type="text"
                        value={accountSearch}
                        onChange={(e) => setAccountSearch(e.target.value)}
                        placeholder="Tìm nhân sự, tài khoản site..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
                      />
                      <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
                    </div>

                    <button
                      type="button"
                      onClick={() => setAccountModalOpen(true)}
                      className="w-full sm:w-auto px-3.5 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm tài khoản</span>
                    </button>
                  </div>

                  {filteredAccounts.length === 0 ? (
                    <div className="p-10 text-center rounded-lg bg-white border border-[#DDE2E9] text-[#64748B] text-xs shadow-xs">
                      Chưa có tài khoản site nào được cấp phát cho dự án này.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-[#DDE2E9] bg-white shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F8FAFC] text-[#64748B] uppercase text-[11px] font-semibold tracking-wider border-b border-[#DDE2E9]">
                          <tr>
                            <th className="px-3.5 py-2.5">Nhân sự</th>
                            <th className="px-3.5 py-2.5">Email</th>
                            <th className="px-3.5 py-2.5">Tài khoản (Username)</th>
                            <th className="px-3.5 py-2.5">Mật khẩu & Chế độ</th>
                            <th className="px-3.5 py-2.5">Vai trò / Level</th>
                            <th className="px-3.5 py-2.5">Trạng thái</th>
                            <th className="px-3.5 py-2.5">Ghi chú</th>
                            <th className="px-3.5 py-2.5 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EDF1F5] text-[#172033]">
                          {filteredAccounts.map((acc) => {
                            const isRevealed = revealedPasswords[acc.id];
                            return (
                              <tr key={acc.id} className="hover:bg-[#F8FAFC] transition-colors">
                                <td className="px-3.5 py-2.5 font-semibold text-[#172033]">
                                  {acc.staff?.fullName || "N/A"}
                                </td>
                                <td className="px-3.5 py-2.5 text-[#64748B] font-mono text-[11px]">
                                  {acc.staff?.corporateEmail || "—"}
                                </td>
                                <td className="px-3.5 py-2.5 font-mono font-semibold text-[#2457A7]">
                                  {acc.siteLoginUsername}
                                </td>
                                <td className="px-3.5 py-2.5 font-mono">
                                  <div className="flex flex-col gap-1">
                                    {acc.passwordStatus === "CUSTOM" ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[#94A3B8] font-bold tracking-wider">••••••••••••</span>
                                        {acc.isOwner ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedAccountForReveal(acc);
                                              setRevealModalOpen(true);
                                            }}
                                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FAF5FF] hover:bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF] flex items-center gap-1 transition-colors"
                                            title="Mật khẩu riêng tư - Nhập mã PIN của bạn để xem"
                                          >
                                            <Lock className="w-3 h-3" />
                                            <span>Xem (PIN)</span>
                                          </button>
                                        ) : (
                                          <span
                                            className="text-[10px] text-[#64748B] italic bg-[#F1F3F6] px-1.5 py-0.5 rounded border border-[#DDE2E9] flex items-center gap-1"
                                            title="Chỉ nhân sự sở hữu tài khoản mới có quyền xem"
                                          >
                                            <Lock className="w-2.5 h-2.5 text-[#94A3B8]" />
                                            <span>Chủ sở hữu</span>
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        {acc.password ? (
                                          <>
                                            <span className="text-[#78350F] font-semibold">
                                              {isRevealed ? acc.password : "••••••••••••"}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => toggleRevealPassword(acc.id)}
                                              className="p-1 text-[#94A3B8] hover:text-[#172033]"
                                              title={isRevealed ? "Ẩn" : "Hiện"}
                                            >
                                              {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleCopy(acc.password, `acc_pass_${acc.id}`)}
                                              className="p-1 text-[#94A3B8] hover:text-[#172033]"
                                              title="Sao chép mật khẩu"
                                            >
                                              {copiedId === `acc_pass_${acc.id}` ? (
                                                <Check className="w-3 h-3 text-[#15803D]" />
                                              ) : (
                                                <Copy className="w-3 h-3" />
                                              )}
                                            </button>
                                          </>
                                        ) : (
                                          <span className="text-[#94A3B8]">•••••••••••• (Bảo mật)</span>
                                        )}
                                      </div>
                                    )}

                                    {/* Password Status Badge */}
                                    <div>
                                      {acc.passwordStatus === "CUSTOM" ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#FAF5FF] text-[#7E22CE] border border-[#E9D5FF]">
                                          <Lock className="w-2.5 h-2.5" />
                                          <span>Riêng tư</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7]">
                                          <KeyRound className="w-2.5 h-2.5" />
                                          <span>Mặc định</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3.5 py-2.5">
                                  {acc.tierLevel ? (
                                    <span className="px-1.5 py-0.5 rounded bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7] text-[10px] font-medium">
                                      Level {acc.tierLevel}
                                    </span>
                                  ) : (
                                    <span className="text-[#94A3B8]">—</span>
                                  )}
                                </td>
                                <td className="px-3.5 py-2.5">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                                    Đang dùng
                                  </span>
                                </td>
                                <td className="px-3.5 py-2.5 text-[#64748B] text-[11px] max-w-[180px] truncate">
                                  {acc.notes || "—"}
                                </td>
                                <td className="px-3.5 py-2.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(acc.siteLoginUsername, `copy_u_${acc.id}`)}
                                    className="p-1 rounded hover:bg-[#F1F3F6] text-[#64748B] hover:text-[#172033] transition-colors"
                                    title="Sao chép username"
                                  >
                                    {copiedId === `copy_u_${acc.id}` ? (
                                      <Check className="w-3 h-3 text-[#15803D]" />
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

              {/* TAB 2: QUẢN LÝ YÊU CẦU (QLYC) */}
              {activeTab === "requests" && (
                <div className="space-y-3">
                  {/* Action & Filter Bar */}
                  <div className="p-3.5 rounded-lg bg-white border border-[#DDE2E9] shadow-xs space-y-2.5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                      <div className="relative w-full sm:w-80">
                        <input
                          type="text"
                          value={requestSearch}
                          onChange={(e) => setRequestSearch(e.target.value)}
                          placeholder="Tìm theo Mã QLYC, nội dung, khoa/phòng..."
                          className="w-full pl-9 pr-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
                        />
                        <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {nextCodeInfo?.hasShortName && (
                          <div className="px-2.5 py-1 rounded-md bg-[#E5EDFA] border border-[#BFD4F7] text-xs font-mono text-[#2457A7] hidden md:flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#2457A7]" />
                            <span>Mã tiếp theo: <strong>{nextCodeInfo.nextCode}</strong></span>
                          </div>
                        )}

                        {/* Nút Xuất Excel & Dropdown lựa chọn */}
                        <div className="relative" ref={exportDropdownRef}>
                          <button
                            type="button"
                            onClick={handleExportClick}
                            disabled={exportingRequests || (requests.length === 0 && !hasActiveRequestFilters)}
                            className="w-full sm:w-auto px-3 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] border border-[#DDE2E9] text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            title={hasActiveRequestFilters ? "Tùy chọn xuất Excel (đang lọc / toàn bộ)" : "Xuất danh sách yêu cầu ra file Excel"}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{exportingRequests ? "Đang xuất..." : "Xuất Excel"}</span>
                            {hasActiveRequestFilters && (
                              <ChevronDown className="w-3 h-3 text-[#64748B] -mr-0.5" />
                            )}
                          </button>

                          {exportDropdownOpen && (
                            <div className="absolute right-0 mt-1 w-60 rounded-md bg-white border border-[#DDE2E9] shadow-lg py-1 z-30 text-xs text-[#172033] animate-in fade-in zoom-in-95 duration-100">
                              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#64748B] border-b border-[#EDF1F5] uppercase tracking-wider">
                                Tùy chọn Xuất Excel
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setExportDropdownOpen(false);
                                  executeExcelExport(requests, "loc");
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-[#F8FAFC] flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <span className="font-medium">Xuất kết quả đang lọc</span>
                                <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] border border-emerald-200">
                                  {requests.length} mục
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={handleExportAllRequests}
                                className="w-full text-left px-3.5 py-2 hover:bg-[#F8FAFC] flex items-center justify-between border-t border-[#EDF1F5] transition-colors cursor-pointer"
                              >
                                <span className="font-medium">Xuất toàn bộ yêu cầu</span>
                                <span className="text-[#64748B] text-[10px]">Tất cả</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={openAddRequestModal}
                          className="w-full sm:w-auto px-3.5 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm yêu cầu</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter Inputs */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-[#EDF1F5] text-[11px]">
                      <div>
                        <label className="text-[#64748B] block mb-0.5">Người YC</label>
                        <select
                          value={filterRequesterId}
                          onChange={(e) => setFilterRequesterId(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:ring-1 focus:ring-[#2457A7]"
                        >
                          <option value="">Tất cả</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>{s.fullName}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[#64748B] block mb-0.5">Khoa/phòng</label>
                        <input
                          type="text"
                          value={filterDepartment}
                          onChange={(e) => setFilterDepartment(e.target.value)}
                          placeholder="Khoa/phòng..."
                          className="w-full px-2 py-1 rounded bg-white border border-[#DDE2E9] text-[#172033] text-xs placeholder-[#94A3B8] focus:ring-1 focus:ring-[#2457A7]"
                        />
                      </div>

                      <div>
                        <label className="text-[#64748B] block mb-0.5">Tiếp nhận</label>
                        <select
                          value={filterReceiverId}
                          onChange={(e) => setFilterReceiverId(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:ring-1 focus:ring-[#2457A7]"
                        >
                          <option value="">Tất cả</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>{s.fullName}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[#64748B] block mb-0.5">Theo dõi</label>
                        <select
                          value={filterFollowerId}
                          onChange={(e) => setFilterFollowerId(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:ring-1 focus:ring-[#2457A7]"
                        >
                          <option value="">Tất cả</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>{s.fullName}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[#64748B] block mb-0.5">Due Date</label>
                        <input
                          type="date"
                          value={filterDueDate}
                          onChange={(e) => setFilterDueDate(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:ring-1 focus:ring-[#2457A7]"
                        />
                      </div>

                      <div>
                        <label className="text-[#64748B] block mb-0.5">Link Jira</label>
                        <select
                          value={filterHasJira}
                          onChange={(e) => setFilterHasJira(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:ring-1 focus:ring-[#2457A7]"
                        >
                          <option value="">Tất cả</option>
                          <option value="true">Có Jira</option>
                          <option value="false">Không có Jira</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Requests Table */}
                  {loadingRequests ? (
                    <TableSkeleton rows={5} columns={9} />
                  ) : requests.length === 0 ? (
                    <div className="p-10 text-center rounded-lg bg-white border border-[#DDE2E9] text-[#64748B] text-xs space-y-2 shadow-xs">
                      <FileText className="w-7 h-7 text-[#94A3B8] mx-auto" />
                      <p>Chưa có yêu cầu nào phát sinh cho dự án này.</p>
                      <button
                        type="button"
                        onClick={openAddRequestModal}
                        className="text-[#2457A7] hover:underline font-medium"
                      >
                        Bấm vào đây để thêm yêu cầu đầu tiên
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-[#DDE2E9] bg-white shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F8FAFC] text-[#64748B] uppercase text-[11px] font-semibold tracking-wider border-b border-[#DDE2E9]">
                          <tr>
                            <th className="px-3.5 py-2.5">Mã QLYC</th>
                            <th className="px-3.5 py-2.5">Người yêu cầu</th>
                            <th className="px-3.5 py-2.5">Khoa/phòng</th>
                            <th className="px-3.5 py-2.5">Nhân viên tiếp nhận</th>
                            <th className="px-3.5 py-2.5">Nội dung tóm tắt</th>
                            <th className="px-3.5 py-2.5">Due Date</th>
                            <th className="px-3.5 py-2.5">Theo dõi</th>
                            <th className="px-3.5 py-2.5">Link Jira</th>
                            <th className="px-3.5 py-2.5 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EDF1F5] text-[#172033]">
                          {paginatedRequests.map((req) => (
                            <tr key={req.id} className="hover:bg-[#F8FAFC] transition-colors">
                              <td className="px-3.5 py-2.5 font-mono font-semibold text-[#2457A7]">
                                <button
                                  type="button"
                                  onClick={() => openViewRequest(req)}
                                  className="hover:underline flex items-center gap-1"
                                >
                                  {req.requestCode}
                                </button>
                              </td>
                              <td className="px-3.5 py-2.5 font-medium text-[#172033]">
                                {req.requester?.fullName || req.requesterName || "—"}
                              </td>
                              <td className="px-3.5 py-2.5 text-[#64748B]">
                                {req.department || "—"}
                              </td>
                              <td className="px-3.5 py-2.5 text-[#64748B]">
                                {req.receiver?.fullName || "—"}
                              </td>
                              <td className="px-3.5 py-2.5 text-[#64748B] max-w-xs truncate">
                                {req.content ? req.content.replace(/<[^>]*>?/gm, "").slice(0, 70) : "—"}
                              </td>
                              <td className="px-3.5 py-2.5">
                                {req.dueDate ? (
                                  <span className="px-1.5 py-0.5 rounded bg-[#F1F3F6] text-[#172033] border border-[#DDE2E9] font-mono text-[11px]">
                                    {formatDate(req.dueDate)}
                                  </span>
                                ) : (
                                  <span className="text-[#94A3B8]">—</span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5">
                                {req.followers?.length > 0 ? (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {req.followers.slice(0, 2).map((f: any) => (
                                      <span
                                        key={f.id}
                                        className="px-1.5 py-0.5 rounded bg-[#E5EDFA] text-[#2457A7] text-[10px]"
                                      >
                                        {f.staff?.fullName}
                                      </span>
                                    ))}
                                    {req.followers.length > 2 && (
                                      <span className="text-[10px] text-[#94A3B8]">
                                        +{req.followers.length - 2}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[#94A3B8]">—</span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5">
                                {req.jiraUrl ? (
                                  <a
                                    href={req.jiraUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-[#2457A7] hover:underline font-mono"
                                  >
                                    <span>Jira</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-[#94A3B8]">—</span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openViewRequest(req)}
                                    className="p-1 rounded hover:bg-[#F1F3F6] text-[#94A3B8] hover:text-[#172033] transition-colors"
                                    title="Xem chi tiết (UC-36)"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditRequestModal(req)}
                                    className="p-1 rounded hover:bg-[#F1F3F6] text-[#94A3B8] hover:text-[#2457A7] transition-colors"
                                    title="Sửa yêu cầu (UC-37)"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRequest(req)}
                                    className="p-1 rounded hover:bg-[#FEF2F2] text-[#94A3B8] hover:text-[#B91C1C] transition-colors"
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

                    {/* Accessible Pagination Landmark */}
                    {requests.length > 0 && (
                      <Pagination
                        currentPage={requestPage}
                        totalItems={requests.length}
                        pageSize={15}
                        onPageChange={setRequestPage}
                        filterDeps={[
                          requestSearch,
                          filterRequesterId,
                          filterDepartment,
                          filterReceiverId,
                          filterFollowerId,
                          filterDueDate,
                          filterHasJira,
                        ]}
                        className="rounded-t-none border-x-0 border-b-0 border-t border-[#DDE2E9]"
                      />
                    )}
                  </>
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
        <form onSubmit={handleSaveProject} className="space-y-3.5 text-xs">
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
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 text-xs uppercase font-mono"
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
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 text-xs uppercase font-mono focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                Link Hệ thống HIS <span className="text-rose-500">*</span>
              </label>
              <input
                type="url"
                required
                value={systemHisUrl}
                onChange={(e) => setSystemHisUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 text-xs font-mono"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                Mật khẩu mặc định Site
              </label>
              <input
                type="text"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                placeholder="Hospital#MasterPass2026!"
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Trạng thái
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 text-xs"
              >
                <option value="active">Đang vận hành (Active)</option>
                <option value="maintenance">Bảo trì (Maintenance)</option>
                <option value="closed">Đã đóng (Closed)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Lead Kỹ thuật (Level 1) <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={level1StaffId}
                onChange={(e) => setLevel1StaffId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 text-xs"
              >
                <option value="">-- Chọn Level 1 --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName} ({s.staffCode || "N/A"})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                PM Quản lý (Level 2)
              </label>
              <select
                value={level2StaffId}
                onChange={(e) => setLevel2StaffId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 text-xs"
              >
                <option value="">-- Không yêu cầu --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName} ({s.staffCode || "N/A"})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Director (Level 3)
              </label>
              <select
                value={level3StaffId}
                onChange={(e) => setLevel3StaffId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 text-xs"
              >
                <option value="">-- Không yêu cầu --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName} ({s.staffCode || "N/A"})</option>
                ))}
              </select>
            </div>

            {/* Nhóm thông tin: Nhân sự đầu mối */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5 sm:col-span-2">
              <div className="font-semibold text-slate-800 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <User className="w-3.5 h-3.5" />
                  Nhân sự đầu mối phụ trách
                </span>
                <span className="text-[10px] text-slate-500">Người chịu trách nhiệm liên hệ & phối hợp</span>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">
                    Chọn từ danh sách nhân sự
                  </label>
                  <select
                    value={contactStaffId}
                    onChange={(e) => {
                      const sId = e.target.value;
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
                    className="w-full px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 text-xs"
                  >
                    <option value="">-- Chọn nhân sự từ hệ thống hoặc nhập bên dưới --</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.staffCode || "N/A"}) {s.department ? `— ${s.department}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

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
                      className="w-full px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 text-xs placeholder-slate-400"
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
                      className="w-full px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 text-xs placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                Mô tả dự án
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 text-xs resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setEditProjectModalOpen(false)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <ActionButton
              type="submit"
              variant="primary"
              isLoading={savingProject}
              loadingText="Đang lưu..."
              className="px-4 py-1.5 text-xs font-medium"
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
        subtitle={`Dự án: ${project?.projectName}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveAccount} className="space-y-3.5 text-xs">
          <Combobox
            label="Chọn Nhân sự"
            required
            options={staffList.map((s) => ({
              value: s.id,
              label: s.fullName,
              subLabel: `${s.staffCode ? `Mã: ${s.staffCode} • ` : ""}${s.department || "Nhân sự"}`,
            }))}
            value={accountStaffId}
            onChange={(val) => setAccountStaffId(val)}
            placeholder="-- Chọn nhân sự tham gia --"
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Tên đăng nhập Site (Username) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={siteLoginUsername}
              onChange={(e) => setSiteLoginUsername(e.target.value)}
              placeholder="VD: bs_minh_khoanhi, admin_staging..."
              className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Mật khẩu Site
              </label>
              {project?.defaultPassword && (
                <button
                  type="button"
                  onClick={() => setSitePassword(project.defaultPassword)}
                  className="text-[11px] text-blue-600 hover:underline"
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
              className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 text-xs font-mono"
            />
            <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1 mt-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Quy tắc bảo vệ mật khẩu Két:</span>
              </div>
              <p>
                • Nếu để trống hoặc dùng mật khẩu mặc định: Chế độ <strong>Mặc định</strong>, các thành viên dự án có thể xem trực tiếp.
              </p>
              <p>
                • Nếu nhập mật khẩu khác: Chế độ <strong>Riêng tư</strong>, chỉ nhân sự được cấp tài khoản mới có thể xem sau khi xác thực PIN.
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Nhãn gợi nhớ (Tùy chọn)
            </label>
            <input
              type="text"
              value={accountLabel}
              onChange={(e) => setAccountLabel(e.target.value)}
              placeholder="VD: Bác sĩ trưởng ca, Tài khoản demo..."
              className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Ghi chú
            </label>
            <textarea
              rows={2}
              value={accountNotes}
              onChange={(e) => setAccountNotes(e.target.value)}
              placeholder="Phân quyền đặc biệt hoặc lưu ý khi dùng tài khoản này..."
              className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 text-xs resize-none"
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
            <ActionButton
              type="submit"
              variant="primary"
              isLoading={savingAccount}
              loadingText="Đang lưu..."
              className="px-4 py-1.5 text-xs font-medium"
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
          editingRequest ? "Mã QLYC được giữ nguyên" : `Mã tự sinh dự kiến: ${nextCodeInfo?.nextCode || "..."}`
        }`}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveRequest} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <Combobox
                label="Người yêu cầu"
                required
                options={staffList.map((s) => ({
                  value: s.id,
                  label: s.fullName,
                  subLabel: s.staffCode ? `Mã: ${s.staffCode}` : s.department,
                }))}
                value={reqRequesterId}
                onChange={(val) => {
                  setReqRequesterId(val);
                  if (val) setReqRequesterName("");
                }}
                placeholder="-- Chọn từ nhân sự công ty --"
                allowCustomValue
                onCustomValueCommit={(name) => {
                  setReqRequesterName(name);
                  setReqRequesterId("");
                }}
              />
              <div className="pt-1">
                <input
                  type="text"
                  value={reqRequesterName}
                  onChange={(e) => {
                    setReqRequesterName(e.target.value);
                    if (e.target.value) setReqRequesterId("");
                  }}
                  placeholder="Hoặc nhập tên người yêu cầu bên ngoài (bệnh viện)..."
                  className="w-full px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Khoa / Phòng
              </label>
              <input
                type="text"
                value={reqDepartment}
                onChange={(e) => setReqDepartment(e.target.value)}
                placeholder="VD: Khoa Khám bệnh, CNTT, KHTH..."
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Combobox
                label="Nhân viên tiếp nhận"
                options={staffList.map((s) => ({
                  value: s.id,
                  label: s.fullName,
                  subLabel: s.staffCode ? `Mã: ${s.staffCode}` : s.department,
                }))}
                value={reqReceiverId}
                onChange={(val) => setReqReceiverId(val)}
                placeholder="-- Chọn nhân sự tiếp nhận --"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Due Date (Hạn hoàn thành)
              </label>
              <input
                type="date"
                value={reqDueDate}
                onChange={(e) => setReqDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 text-xs"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                Link Jira (Issue Ticket)
              </label>
              <input
                type="url"
                value={reqJiraUrl}
                onChange={(e) => setReqJiraUrl(e.target.value)}
                placeholder="https://jira.company.com/browse/HIS-1234"
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 text-xs font-mono"
              />
            </div>

            {/* Followers Multi-select */}
            <div className="space-y-1 sm:col-span-2">
              <MultiCombobox
                label="Nhân sự theo dõi"
                options={staffList.map((s) => ({
                  value: s.id,
                  label: s.fullName,
                  subLabel: s.staffCode ? `Mã: ${s.staffCode} • ${s.department || ""}` : s.department,
                }))}
                value={reqFollowerIds}
                onChange={(vals) => setReqFollowerIds(vals)}
                placeholder="Thêm nhân sự theo dõi..."
              />
            </div>

            {/* Content with Rich Text Editor */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Nội dung yêu cầu <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-500">Hỗ trợ định dạng Rich Text</span>
              </label>
              <RichTextEditor
                value={reqContent}
                onChange={setReqContent}
                placeholder="Mô tả chi tiết nội dung yêu cầu, nghiệp vụ phát sinh..."
                minHeight="180px"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setRequestModalOpen(false)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <ActionButton
              type="submit"
              variant="primary"
              isLoading={savingRequest}
              loadingText="Đang lưu..."
              className="px-4 py-1.5 text-xs font-medium"
            >
              {editingRequest ? "Lưu thay đổi" : "Tạo yêu cầu"}
            </ActionButton>
          </div>
        </form>
      </Modal>

      {/* View Request Detail Modal */}
      <Modal
        isOpen={viewRequestModalOpen}
        onClose={() => setViewRequestModalOpen(false)}
        title={selectedRequest?.requestCode || "Chi tiết Yêu cầu"}
        subtitle={`Dự án: ${project?.projectName} • Xem chi tiết công việc`}
        maxWidth="max-w-3xl"
      >
        {selectedRequest && (
          <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-0.5">
            {/* Header badges */}
            <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#DDE2E9] flex items-center justify-between flex-wrap gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-mono font-bold px-2.5 py-0.5 rounded bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7]">
                  {selectedRequest.requestCode}
                </span>

                {/* Status Badge */}
                {(() => {
                  const st = selectedRequest.status || "pending";
                  let bg = "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]";
                  let label = "Chờ xử lý";
                  if (st === "in_progress") {
                    bg = "bg-[#E5EDFA] text-[#2457A7] border-[#BFD4F7]";
                    label = "Đang xử lý";
                  } else if (st === "completed") {
                    bg = "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]";
                    label = "Hoàn thành";
                  } else if (st === "closed") {
                    bg = "bg-[#F1F3F6] text-[#64748B] border-[#DDE2E9]";
                    label = "Đã đóng";
                  }
                  return (
                    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${bg}`}>
                      {label}
                    </span>
                  );
                })()}

                {selectedRequest.department && (
                  <span className="px-2 py-0.5 rounded bg-white text-[#172033] border border-[#DDE2E9]">
                    Khoa/phòng: <strong>{selectedRequest.department}</strong>
                  </span>
                )}
                {selectedRequest.jiraUrl && (
                  <a
                    href={selectedRequest.jiraUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 rounded bg-white hover:bg-[#F8FAFC] text-[#2457A7] border border-[#DDE2E9] inline-flex items-center gap-1 font-mono transition-colors"
                  >
                    <span>Mở Jira</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setViewRequestModalOpen(false);
                    openEditRequestModal(selectedRequest);
                  }}
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] border border-[#DDE2E9] font-medium text-xs flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Sửa yêu cầu</span>
                </button>
              </div>
            </div>

            {/* People & Context Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3.5 rounded-lg bg-[#F8FAFC] border border-[#DDE2E9]">
              <div>
                <span className="text-[10px] text-[#64748B] uppercase block font-semibold">Người yêu cầu</span>
                <span className="text-xs font-semibold text-[#172033] block mt-0.5">
                  {selectedRequest.requester?.fullName || selectedRequest.requesterName || "—"}
                </span>
                {selectedRequest.requester?.corporateEmail && (
                  <span className="text-[10px] text-[#64748B] font-mono block">
                    {selectedRequest.requester.corporateEmail}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-[#64748B] uppercase block font-semibold">Nhân viên tiếp nhận</span>
                <span className="text-xs font-semibold text-[#172033] block mt-0.5">
                  {selectedRequest.receiver?.fullName || "—"}
                </span>
                {selectedRequest.receiver?.corporateEmail && (
                  <span className="text-[10px] text-[#64748B] font-mono block">
                    {selectedRequest.receiver.corporateEmail}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-[#64748B] uppercase block font-semibold">Due Date</span>
                <span className="text-xs font-mono font-semibold text-[#172033] block mt-0.5">
                  {selectedRequest.dueDate ? formatDate(selectedRequest.dueDate) : "Không giới hạn"}
                </span>
              </div>

              <div className="sm:col-span-2 md:col-span-3 pt-2 border-t border-[#DDE2E9]">
                <span className="text-[10px] text-[#64748B] uppercase block font-semibold mb-1">Nhân sự theo dõi</span>
                {selectedRequest.followers?.length > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedRequest.followers.map((f: any) => (
                      <span
                        key={f.id}
                        className="px-2 py-0.5 rounded bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7] text-[11px]"
                      >
                        {f.staff?.fullName} ({f.staff?.staffCode || "N/A"})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[#94A3B8]">—</span>
                )}
              </div>
            </div>

            {/* Rich Text Content */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#172033] uppercase block">
                Nội dung chi tiết
              </span>
              <div
                className="p-4 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs leading-relaxed prose prose-sm max-w-none shadow-xs"
                dangerouslySetInnerHTML={{ __html: selectedRequest.content || "" }}
              />
            </div>

            {/* Request Activity Timeline */}
            <div className="pt-2 border-t border-[#DDE2E9]">
              <RequestActivityTimeline
                activities={selectedRequest.activities}
                isLoading={loadingRequestDetail}
              />
            </div>

            {/* Timestamps */}
            <div className="pt-2 border-t border-[#DDE2E9] text-[11px] text-[#64748B] flex items-center justify-between">
              <span>Ngày tạo: <strong>{formatDate(selectedRequest.createdAt)}</strong></span>
              <span>Cập nhật lần cuối: <strong>{formatDate(selectedRequest.updatedAt)}</strong></span>
            </div>
          </div>
        )}
      </Modal>

      {/* Password Reveal Modal for Project Accounts */}
      <PasswordRevealModal
        isOpen={revealModalOpen}
        onClose={() => setRevealModalOpen(false)}
        accountId={selectedAccountForReveal?.id || null}
        accountLabel={selectedAccountForReveal?.accountLabel || selectedAccountForReveal?.siteLoginUsername || ""}
        projectName={project?.projectName || "Dự án"}
        siteUsername={selectedAccountForReveal?.siteLoginUsername || ""}
        isOwner={selectedAccountForReveal?.isOwner}
        passwordStatus={selectedAccountForReveal?.passwordStatus || "DEFAULT"}
      />
    </div>
  );
}
