"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import {
  Headset,
  Plus,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Eye,
  Check,
  Tag,
  Calendar,
  X,
  User,
  Building,
  Sparkles,
  ExternalLink,
  Upload,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { ImportTicketsModal } from "@/components/support-tickets/ImportTicketsModal";

interface MasterData {
  businesses: { id: string; code: string; name: string }[];
  methods: { id: string; code: string; name: string }[];
  types: { id: string; code: string; name: string }[];
  timeGroups: { id: string; code: string; name: string }[];
}

interface ProjectOption {
  id: string;
  projectCode: string;
  projectName: string;
}

interface TicketItem {
  id: string;
  ticketCode: string;
  projectId: string;
  project: { id: string; projectCode: string; projectName: string };
  requesterName: string;
  createdBy: { id: string; username: string; fullName: string };
  assignedUserId: string;
  assignedUser: { id: string; username: string; fullName: string };
  business: { id: string; code: string; name: string };
  supportType?: { id: string; code: string; name: string } | null;
  timeGroup?: { id: string; code: string; name: string } | null;
  methods: { id: string; code: string; name: string }[];
  description: string;
  cause?: string | null;
  resolution?: string | null;
  status: "IN_PROGRESS" | "COMPLETED";
  sentAt: string;
  receivedAt?: string | null;
  resolvedAt?: string | null;
  processingMinutes?: number | null;
  totalMinutes?: number | null;
  createdAt: string;
}

export default function SupportTicketsPage() {
  const { success, error, warning } = useToast();
  const [isPending, startTransition] = useTransition();

  // State dữ liệu
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  // Danh mục & Dự án
  const [masterData, setMasterData] = useState<MasterData>({
    businesses: [],
    methods: [],
    types: [],
    timeGroups: [],
  });
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Bộ lọc
  const [filters, setFilters] = useState({
    projectId: "",
    status: "",
    fromDate: "",
    toDate: "",
    businessId: "",
    supportMethodId: "",
    supportTypeId: "",
    timeGroupId: "",
    assignedUserId: "",
    q: "",
  });

  // Modal Import Excel
  const [showImportModal, setShowImportModal] = useState(false);

  // Modal tạo ca mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    projectId: "",
    requesterName: "",
    businessId: "",
    supportMethodIds: [] as string[],
    supportTypeId: "",
    description: "",
    cause: "",
    resolution: "",
    sentAt: "",
    receivedAt: "",
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Modal hoàn thành nhanh
  const [completingTicket, setCompletingTicket] = useState<TicketItem | null>(null);
  const [completeResolution, setCompleteResolution] = useState("");
  const [completeResolvedAt, setCompleteResolvedAt] = useState("");
  const [submittingComplete, setSubmittingComplete] = useState(false);

  // Helper lấy ISO string giờ hiện tại theo local input
  const getNowLocal = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
  };

  // Tải thông tin người dùng và danh mục
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [meRes, projRes, mdRes] = await Promise.all([
        fetch("/api/v1/me"),
        fetch("/api/v1/me/projects"),
        fetch("/api/v1/master-data/support"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.success) setCurrentUser(meData.data);
      }
      if (projRes.ok) {
        const pData = await projRes.json();
        if (pData.success) setProjects(pData.data);
      }
      if (mdRes.ok) {
        const mdData = await mdRes.json();
        if (mdData.success) setMasterData(mdData.data);
      }
    } catch (err) {
      console.error("Lỗi khởi tạo:", err);
    }
  };

  // Tải danh sách ca hỗ trợ
  const loadTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (filters.projectId) params.set("projectId", filters.projectId);
      if (filters.status) params.set("status", filters.status);
      if (filters.fromDate) params.set("fromDate", filters.fromDate);
      if (filters.toDate) params.set("toDate", filters.toDate);
      if (filters.businessId) params.set("businessId", filters.businessId);
      if (filters.supportMethodId) params.set("supportMethodId", filters.supportMethodId);
      if (filters.supportTypeId) params.set("supportTypeId", filters.supportTypeId);
      if (filters.timeGroupId) params.set("timeGroupId", filters.timeGroupId);
      if (filters.assignedUserId) params.set("assignedUserId", filters.assignedUserId);
      if (filters.q.trim()) params.set("q", filters.q.trim());

      const res = await fetch(`/api/v1/support-tickets?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTickets(json.data.items || []);
        setTotal(json.data.total || 0);
      } else {
        error(json.error?.message || "Không thể tải danh sách ca hỗ trợ");
      }
    } catch (err) {
      console.error(err);
      error("Lỗi mạng khi tải dữ liệu ca hỗ trợ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [page, filters.projectId, filters.status, filters.businessId, filters.supportMethodId, filters.supportTypeId, filters.timeGroupId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTickets();
  };

  const handleResetFilters = () => {
    setFilters({
      projectId: "",
      status: "",
      fromDate: "",
      toDate: "",
      businessId: "",
      supportMethodId: "",
      supportTypeId: "",
      timeGroupId: "",
      assignedUserId: "",
      q: "",
    });
    setPage(1);
  };

  // Mở modal tạo ca mới
  const handleOpenCreateModal = () => {
    const nowStr = getNowLocal();
    setCreateForm({
      projectId: projects[0]?.id || "",
      requesterName: "",
      businessId: masterData.businesses[0]?.id || "",
      supportMethodIds: masterData.methods[0]?.id ? [masterData.methods[0].id] : [],
      supportTypeId: masterData.types[0]?.id || "",
      description: "",
      cause: "",
      resolution: "",
      sentAt: nowStr,
      receivedAt: nowStr,
    });
    setShowCreateModal(true);
  };

  // Toggle chọn method tag
  const toggleMethodTag = (methodId: string) => {
    setCreateForm((prev) => {
      const exists = prev.supportMethodIds.includes(methodId);
      if (exists) {
        // Giữ ít nhất 1 phương thức
        if (prev.supportMethodIds.length <= 1) {
          warning("Cần chọn ít nhất một phương thức hỗ trợ");
          return prev;
        }
        return { ...prev, supportMethodIds: prev.supportMethodIds.filter((id) => id !== methodId) };
      } else {
        return { ...prev, supportMethodIds: [...prev.supportMethodIds, methodId] };
      }
    });
  };

  // Submit tạo ca mới
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.projectId) return warning("Vui lòng chọn Dự án");
    if (!createForm.requesterName.trim()) return warning("Vui lòng nhập Người dùng yêu cầu");
    if (!createForm.businessId) return warning("Vui lòng chọn Nghiệp vụ");
    if (!createForm.description.trim()) return warning("Vui lòng nhập Mô tả vấn đề");
    if (createForm.supportMethodIds.length === 0) return warning("Chọn ít nhất một Phương thức");
    if (!createForm.sentAt) return warning("Vui lòng điền Thời điểm gửi yêu cầu");

    setSubmittingCreate(true);
    try {
      // Chuyển local time sang ISO 8601
      const payload = {
        ...createForm,
        sentAt: new Date(createForm.sentAt).toISOString(),
        receivedAt: createForm.receivedAt ? new Date(createForm.receivedAt).toISOString() : new Date().toISOString(),
      };

      const res = await fetch("/api/v1/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        success(`Đã tạo thành công ca hỗ trợ ${json.data.ticketCode}`);
        setShowCreateModal(false);
        loadTickets();
      } else {
        error(json.error?.message || "Tạo ca hỗ trợ thất bại");
      }
    } catch (err) {
      console.error(err);
      error("Lỗi kết nối khi tạo ca");
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Mở modal hoàn thành nhanh
  const handleOpenCompleteModal = (ticket: TicketItem) => {
    setCompletingTicket(ticket);
    setCompleteResolution(ticket.resolution || "");
    setCompleteResolvedAt(getNowLocal());
  };

  // Submit hoàn thành nhanh
  const handleConfirmComplete = async () => {
    if (!completingTicket) return;
    if (!completeResolution.trim()) return warning("Vui lòng nhập Cách xử lý trước khi hoàn thành");

    setSubmittingComplete(true);
    try {
      const res = await fetch(`/api/v1/support-tickets/${completingTicket.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution: completeResolution.trim(),
          resolvedAt: new Date(completeResolvedAt).toISOString(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        success(`Ca ${completingTicket.ticketCode} đã được đánh dấu Hoàn thành!`);
        setCompletingTicket(null);
        loadTickets();
      } else {
        error(json.error?.message || "Không thể hoàn thành ca");
      }
    } catch (err) {
      console.error(err);
      error("Lỗi kết nối khi hoàn thành ca");
    } finally {
      setSubmittingComplete(false);
    }
  };

  // Thống kê nhanh từ danh sách hiện tại
  const countInProgress = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const countCompleted = tickets.filter((t) => t.status === "COMPLETED").length;

  // Tạo URL xuất Excel theo đúng bộ lọc hiện tại
  const getExportUrl = () => {
    const params = new URLSearchParams();
    if (filters.projectId) params.set("projectId", filters.projectId);
    if (filters.status) params.set("status", filters.status);
    if (filters.fromDate) params.set("fromDate", filters.fromDate);
    if (filters.toDate) params.set("toDate", filters.toDate);
    if (filters.businessId) params.set("businessId", filters.businessId);
    if (filters.supportMethodId) params.set("supportMethodId", filters.supportMethodId);
    if (filters.supportTypeId) params.set("supportTypeId", filters.supportTypeId);
    if (filters.timeGroupId) params.set("timeGroupId", filters.timeGroupId);
    if (filters.assignedUserId) params.set("assignedUserId", filters.assignedUserId);
    if (filters.q) params.set("q", filters.q);
    return `/api/v1/support-reports/export?${params.toString()}`;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen">
      <Header
        title="Ghi nhận Ca Hỗ trợ Kỹ thuật"
        subtitle="Quản lý đồng bộ ca hỗ trợ từ Browser Extension và Hub, theo dõi tiến độ và thời gian xử lý"
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] font-medium text-xs flex items-center gap-1.5 transition-colors border border-[#DDE2E9] shadow-xs cursor-pointer"
              title="Nhập hàng loạt ca hỗ trợ từ file Excel (.xlsx)"
            >
              <Upload className="w-3.5 h-3.5 text-[#2457A7]" />
              <span>Nhập Excel</span>
            </button>
            <a
              href={getExportUrl()}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] font-medium text-xs flex items-center gap-1.5 transition-colors border border-[#DDE2E9] shadow-xs"
              title="Xuất danh sách ca hỗ trợ ra file Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#15803D]" />
              <span>Xuất Excel</span>
            </a>
            <Link
              href="/support-tickets/reports"
              className="px-3 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] font-medium text-xs flex items-center gap-1.5 transition-colors border border-[#DDE2E9] shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#2457A7]" />
              <span>Báo cáo</span>
            </Link>
            <button
              onClick={handleOpenCreateModal}
              className="px-3 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-medium shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo ca mới</span>
            </button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl w-full mx-auto">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-md p-3.5 border border-[#DDE2E9] shadow-xs">
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Tổng ca hiển thị</div>
            <div className="text-2xl font-bold text-[#172033] mt-1">{total}</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">Đã áp dụng bộ lọc</div>
          </div>
          <div className="bg-white rounded-md p-3.5 border border-[#DDE2E9] shadow-xs">
            <div className="text-[11px] font-semibold text-[#B45309] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Đang xử lý (trang)
            </div>
            <div className="text-2xl font-bold text-[#B45309] mt-1">{countInProgress}</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">Chưa chốt hoàn thành</div>
          </div>
          <div className="bg-white rounded-md p-3.5 border border-[#DDE2E9] shadow-xs">
            <div className="text-[11px] font-semibold text-[#15803D] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đã hoàn thành (trang)
            </div>
            <div className="text-2xl font-bold text-[#15803D] mt-1">{countCompleted}</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">Đã tính thời gian xử lý</div>
          </div>
          <div className="bg-white rounded-md p-3.5 border border-[#DDE2E9] shadow-xs">
            <div className="text-[11px] font-semibold text-[#2457A7] uppercase tracking-wider">Phân trang</div>
            <div className="text-2xl font-bold text-[#172033] mt-1">Trang {page}</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">Tối đa {pageSize} ca / trang</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-md p-3.5 border border-[#DDE2E9] shadow-xs space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-2.5">
            {/* Search box */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Tìm theo mã ca (HT2610150001), tên người yêu cầu, nội dung hoặc cách xử lý..."
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#2457A7] focus:ring-1 focus:ring-[#2457A7]"
              />
            </div>

            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-medium transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              Lọc ca
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white hover:bg-[#F8FAFC] text-[#64748B] text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Đặt lại
            </button>
          </form>

          {/* Quick filter chips (SRS UI-15) */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-[#64748B] font-medium mr-0.5">Lọc nhanh:</span>
            <button
              type="button"
              onClick={() => {
                setFilters((prev) => ({
                  ...prev,
                  assignedUserId: prev.assignedUserId ? "" : (currentUser?.id || ""),
                }));
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                filters.assignedUserId === currentUser?.id
                  ? "bg-[#E5EDFA] text-[#2457A7] border-[#C5D7F2] font-semibold"
                  : "bg-white text-[#64748B] border-[#DDE2E9] hover:bg-[#F8FAFC]"
              }`}
            >
              Của tôi
            </button>
            <button
              type="button"
              onClick={() => {
                setFilters((prev) => ({
                  ...prev,
                  status: prev.status === "IN_PROGRESS" ? "" : "IN_PROGRESS",
                }));
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                filters.status === "IN_PROGRESS"
                  ? "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] font-semibold"
                  : "bg-white text-[#64748B] border-[#DDE2E9] hover:bg-[#F8FAFC]"
              }`}
            >
              Chưa hoàn thành
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                const isAlreadyToday = filters.fromDate === today && filters.toDate === today;
                setFilters((prev) => ({
                  ...prev,
                  fromDate: isAlreadyToday ? "" : today,
                  toDate: isAlreadyToday ? "" : today,
                }));
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                filters.fromDate === new Date().toISOString().slice(0, 10) && filters.toDate === new Date().toISOString().slice(0, 10)
                  ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0] font-semibold"
                  : "bg-white text-[#64748B] border-[#DDE2E9] hover:bg-[#F8FAFC]"
              }`}
            >
              Hôm nay
            </button>
          </div>

          {/* Filters dropdowns */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2.5 border-t border-[#EDF1F5]">
            {/* Dự án */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block mb-1">
                Dự án
              </label>
              <select
                value={filters.projectId}
                onChange={(e) => {
                  setFilters({ ...filters, projectId: e.target.value });
                  setPage(1);
                }}
                className="w-full px-2 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
              >
                <option value="">Tất cả dự án</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.projectCode}] {p.projectName}
                  </option>
                ))}
              </select>
            </div>

            {/* Trạng thái */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block mb-1">
                Trạng thái
              </label>
              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters({ ...filters, status: e.target.value });
                  setPage(1);
                }}
                className="w-full px-2 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="IN_PROGRESS">Đang xử lý</option>
                <option value="COMPLETED">Hoàn thành</option>
              </select>
            </div>

            {/* Nghiệp vụ */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block mb-1">
                Nghiệp vụ
              </label>
              <select
                value={filters.businessId}
                onChange={(e) => {
                  setFilters({ ...filters, businessId: e.target.value });
                  setPage(1);
                }}
                className="w-full px-2 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
              >
                <option value="">Tất cả nghiệp vụ</option>
                {masterData.businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Phương thức */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block mb-1">
                Phương thức
              </label>
              <select
                value={filters.supportMethodId}
                onChange={(e) => {
                  setFilters({ ...filters, supportMethodId: e.target.value });
                  setPage(1);
                }}
                className="w-full px-2 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
              >
                <option value="">Tất cả phương thức</option>
                {masterData.methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Nhóm thời gian */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block mb-1">
                Nhóm thời gian
              </label>
              <select
                value={filters.timeGroupId}
                onChange={(e) => {
                  setFilters({ ...filters, timeGroupId: e.target.value });
                  setPage(1);
                }}
                className="w-full px-2 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
              >
                <option value="">Tất cả nhóm</option>
                {masterData.timeGroups.map((tg) => (
                  <option key={tg.id} value={tg.id}>
                    {tg.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Loại hỗ trợ */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block mb-1">
                Loại hỗ trợ
              </label>
              <select
                value={filters.supportTypeId}
                onChange={(e) => {
                  setFilters({ ...filters, supportTypeId: e.target.value });
                  setPage(1);
                }}
                className="w-full px-2 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
              >
                <option value="">Tất cả loại hỗ trợ</option>
                {masterData.types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bảng Danh sách ca */}
        <div className="bg-white rounded-md border border-[#DDE2E9] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#DDE2E9] text-[11px] uppercase tracking-wider text-[#64748B] font-semibold">
                  <th className="py-2.5 px-3.5">Mã ca</th>
                  <th className="py-2.5 px-3.5">Dự án</th>
                  <th className="py-2.5 px-3.5">Người yêu cầu & Nội dung</th>
                  <th className="py-2.5 px-3.5">Nghiệp vụ / Phương thức</th>
                  <th className="py-2.5 px-3.5">Phụ trách</th>
                  <th className="py-2.5 px-3.5">Thời gian xử lý</th>
                  <th className="py-2.5 px-3.5 text-center">Trạng thái</th>
                  <th className="py-2.5 px-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF1F5] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#64748B]">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#2457A7] border-t-transparent mb-2"></div>
                      <div>Đang tải dữ liệu ca hỗ trợ...</div>
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#64748B]">
                      <AlertCircle className="w-7 h-7 mx-auto mb-2 text-[#94A3B8]" />
                      Không tìm thấy ca hỗ trợ nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => {
                    const isCompleted = t.status === "COMPLETED";

                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-[#F8FAFC] transition-colors"
                      >
                        {/* Mã ca */}
                        <td className="py-2.5 px-3.5 font-mono font-medium text-[#2457A7] whitespace-nowrap">
                          <Link href={`/support-tickets/${t.id}`} className="hover:underline flex items-center gap-1">
                            {t.ticketCode}
                          </Link>
                        </td>

                        {/* Dự án */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span className="font-semibold text-[#172033] block">
                            {t.project.projectCode}
                          </span>
                          <span className="text-[11px] text-[#64748B] truncate max-w-[140px] block" title={t.project.projectName}>
                            {t.project.projectName}
                          </span>
                        </td>

                        {/* Người yêu cầu & Nội dung */}
                        <td className="py-2.5 px-3.5 max-w-xs">
                          <div className="font-medium text-[#172033] flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[#64748B] flex-shrink-0" />
                            <span>{t.requesterName}</span>
                          </div>
                          <p className="text-[11px] text-[#64748B] line-clamp-2 mt-0.5" title={t.description}>
                            {t.description}
                          </p>
                        </td>

                        {/* Nghiệp vụ / Phương thức */}
                        <td className="py-2.5 px-3.5">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#F1F3F6] text-[#172033] mb-1">
                            {t.business.name}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {t.methods.map((m) => (
                              <span
                                key={m.id}
                                className="text-[10px] px-1.5 py-0.2 rounded bg-[#E5EDFA] text-[#2457A7] font-medium"
                              >
                                {m.name}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Nhân sự phụ trách */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <div className="text-xs font-medium text-[#172033]">
                            {t.assignedUser.fullName || t.assignedUser.username}
                          </div>
                          <div className="text-[10px] text-[#64748B]">
                            Tạo: {new Date(t.sentAt).toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>

                        {/* Thời gian xử lý & Nhóm */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          {isCompleted && t.processingMinutes !== null ? (
                            <div className="space-y-0.5">
                              <div className="text-xs font-semibold text-[#172033] flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                                {t.processingMinutes} phút
                                {t.totalMinutes !== null && (
                                  <span className="text-[10px] font-normal text-[#64748B]">
                                    (Tổng: {t.totalMinutes}p)
                                  </span>
                                )}
                              </div>
                              {t.timeGroup && (
                                <span className="inline-block text-[10px] font-medium px-1.5 py-0.2 rounded bg-[#F1F3F6] text-[#64748B]">
                                  {t.timeGroup.name}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[#B45309] flex items-center gap-1 italic">
                              <Clock className="w-3.5 h-3.5" />
                              Đang xử lý
                            </span>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                              <Check className="w-3 h-3" />
                              Hoàn thành
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                              <Clock className="w-3 h-3" />
                              Đang xử lý
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap space-x-1.5">
                          {!isCompleted && (
                            <button
                              onClick={() => handleOpenCompleteModal(t)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] transition-colors"
                              title="Xác nhận hoàn thành ca"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Xong
                            </button>
                          )}
                          <Link
                            href={`/support-tickets/${t.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-white hover:bg-[#F8FAFC] text-[#172033] border border-[#DDE2E9] shadow-xs transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#64748B]" />
                            Chi tiết
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          {total > pageSize && (
            <div className="py-2.5 px-4 border-t border-[#DDE2E9] flex items-center justify-between text-xs text-[#64748B] bg-white">
              <div>
                Hiển thị {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} trong tổng {total} ca
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-2.5 py-1 rounded border border-[#DDE2E9] disabled:opacity-40 hover:bg-[#F8FAFC] text-xs font-medium text-[#172033]"
                >
                  Trước
                </button>
                <span className="text-xs text-[#172033] font-medium">
                  {page} / {Math.ceil(total / pageSize)}
                </span>
                <button
                  disabled={page * pageSize >= total}
                  onClick={() => setPage(page + 1)}
                  className="px-2.5 py-1 rounded border border-[#DDE2E9] disabled:opacity-40 hover:bg-[#F8FAFC] text-xs font-medium text-[#172033]"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Tạo Ca Mới (EXT-05 / Hub) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-[#DDE2E9] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDF1F5]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-[#E5EDFA] text-[#2457A7]">
                  <Headset className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#172033] text-sm">Tạo mới Ca Hỗ Trợ</h3>
                  <p className="text-[11px] text-[#64748B]">Ghi nhận thông tin yêu cầu và các mốc thời gian</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-md text-[#64748B] hover:text-[#172033] hover:bg-[#F1F3F6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5">
              {/* Dự án & Người yêu cầu */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#172033] block mb-1">
                    Dự án <span className="text-[#B91C1C]">*</span>
                  </label>
                  <select
                    value={createForm.projectId}
                    onChange={(e) => setCreateForm({ ...createForm, projectId: e.target.value })}
                    required
                    className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                  >
                    <option value="">-- Chọn dự án --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.projectCode}] {p.projectName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#172033] block mb-1">
                    Người yêu cầu hỗ trợ <span className="text-[#B91C1C]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: BS. Nguyễn Văn A / Khoa Cấp Cứu"
                    value={createForm.requesterName}
                    onChange={(e) => setCreateForm({ ...createForm, requesterName: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#2457A7]"
                  />
                </div>
              </div>

              {/* Nghiệp vụ & Loại hỗ trợ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#172033] block mb-1">
                    Nghiệp vụ <span className="text-[#B91C1C]">*</span>
                  </label>
                  <select
                    value={createForm.businessId}
                    onChange={(e) => setCreateForm({ ...createForm, businessId: e.target.value })}
                    required
                    className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                  >
                    {masterData.businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#172033] block mb-1">
                    Loại công việc hỗ trợ
                  </label>
                  <select
                    value={createForm.supportTypeId}
                    onChange={(e) => setCreateForm({ ...createForm, supportTypeId: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                  >
                    <option value="">-- Chưa phân loại --</option>
                    {masterData.types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tagging Phương thức hỗ trợ */}
              <div>
                <label className="text-[11px] font-semibold text-[#172033] block mb-1">
                  Phương thức hỗ trợ (Chọn nhiều dạng Tagging) <span className="text-[#B91C1C]">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {masterData.methods.map((m) => {
                    const isSelected = createForm.supportMethodIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMethodTag(m.id)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 border ${
                          isSelected
                            ? "bg-[#2457A7] text-white border-[#2457A7]"
                            : "bg-[#F1F3F6] text-[#64748B] border-[#DDE2E9] hover:bg-[#E5EDFA] hover:text-[#2457A7]"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mốc thời gian */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-[#F8FAFC] rounded-md border border-[#DDE2E9]">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-[#172033]">
                      Thời điểm gửi yêu cầu <span className="text-[#B91C1C]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, sentAt: getNowLocal() })}
                      className="text-[10px] text-[#2457A7] hover:underline"
                    >
                      Điền giờ hiện tại
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    required
                    value={createForm.sentAt}
                    onChange={(e) => setCreateForm({ ...createForm, sentAt: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-[#172033]">
                      Thời điểm tiếp nhận
                    </label>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, receivedAt: getNowLocal() })}
                      className="text-[10px] text-[#2457A7] hover:underline"
                    >
                      Điền giờ hiện tại
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    value={createForm.receivedAt}
                    onChange={(e) => setCreateForm({ ...createForm, receivedAt: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                  />
                </div>
              </div>

              {/* Mô tả vấn đề */}
              <div>
                <label className="text-[11px] font-semibold text-[#172033] block mb-1">
                  Mô tả vấn đề <span className="text-[#B91C1C]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Mô tả cụ thể triệu chứng lỗi, tài khoản hoặc bệnh nhân phát sinh vấn đề..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#2457A7]"
                />
              </div>

              {/* Nguyên nhân & Cách xử lý (Tùy chọn) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#172033] block mb-1">
                    Nguyên nhân (nếu đã xác định)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: Sai cấu hình phòng khám, rớt kết nối mạng..."
                    value={createForm.cause}
                    onChange={(e) => setCreateForm({ ...createForm, cause: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#2457A7]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#172033] block mb-1">
                    Cách xử lý / Hướng dẫn
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: Hướng dẫn người dùng chọn lại phân hệ..."
                    value={createForm.resolution}
                    onChange={(e) => setCreateForm({ ...createForm, resolution: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#2457A7]"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EDF1F5]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-md border border-[#DDE2E9] text-[#64748B] text-xs font-medium hover:bg-[#F8FAFC]"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-4 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-medium shadow-xs disabled:opacity-50"
                >
                  {submittingCreate ? "Đang lưu ca..." : "Lưu ca hỗ trợ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hoàn Thành Nhanh */}
      {completingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-lg max-w-lg w-full shadow-xl border border-[#DDE2E9] p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDF1F5]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-[#F0FDF4] text-[#15803D]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#172033] text-sm">
                    Xác nhận hoàn thành ca {completingTicket.ticketCode}
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    Hệ thống sẽ tự động tính thời gian xử lý và phân nhóm
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompletingTicket(null)}
                className="p-1 rounded-md text-[#64748B] hover:text-[#172033]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#172033] block mb-1">
                  Cách xử lý <span className="text-[#B91C1C]">* (Bắt buộc khi hoàn thành)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ghi nhận phương án xử lý, kết quả sau khi hỗ trợ cho người dùng..."
                  value={completeResolution}
                  onChange={(e) => setCompleteResolution(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#2457A7]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-[#172033]">
                    Thời điểm hoàn thành <span className="text-[#B91C1C]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCompleteResolvedAt(getNowLocal())}
                    className="text-[10px] text-[#2457A7] hover:underline"
                  >
                    Lấy giờ hiện tại
                  </button>
                </div>
                <input
                  type="datetime-local"
                  required
                  value={completeResolvedAt}
                  onChange={(e) => setCompleteResolvedAt(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EDF1F5]">
                <button
                  type="button"
                  onClick={() => setCompletingTicket(null)}
                  className="px-3 py-1.5 rounded-md border border-[#DDE2E9] text-[#64748B] text-xs font-medium hover:bg-[#F8FAFC]"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={submittingComplete}
                  onClick={handleConfirmComplete}
                  className="px-4 py-1.5 rounded-md bg-[#15803D] hover:bg-[#166534] text-white text-xs font-medium shadow-xs disabled:opacity-50"
                >
                  {submittingComplete ? "Đang xử lý..." : "Xác nhận hoàn thành"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import ca hỗ trợ từ file Excel */}
      <ImportTicketsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          loadTickets();
        }}
      />
    </div>
  );
}
