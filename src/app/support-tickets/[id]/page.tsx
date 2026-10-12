"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Headset,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Building,
  Edit,
  UserCheck,
  RotateCcw,
  Check,
  History,
  Tag,
  ShieldAlert,
  ChevronRight,
  FileText,
} from "lucide-react";
import { useToast } from "@/components/Toast";

interface TicketDetail {
  id: string;
  ticketCode: string;
  projectId: string;
  project: { id: string; projectCode: string; projectName: string; customerName?: string };
  requesterName: string;
  createdById: string;
  createdBy: { id: string; username: string; fullName: string };
  assignedUserId: string;
  assignedUser: { id: string; username: string; fullName: string };
  businessId: string;
  business: { id: string; code: string; name: string };
  supportTypeId?: string | null;
  supportType?: { id: string; code: string; name: string } | null;
  timeGroupId?: string | null;
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
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface HistoryItem {
  id: string;
  actorUserId: string;
  actorName?: string | null;
  action: string;
  beforeData?: any;
  afterData?: any;
  reason?: string | null;
  createdAt: string;
}

interface UserOption {
  id: string;
  username: string;
  fullName: string;
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { success, error, warning } = useToast();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"detail" | "history">("detail");

  // Danh mục phục vụ modal edit
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [staffUsers, setStaffUsers] = useState<UserOption[]>([]);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignReason, setAssignReason] = useState("");
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeResolution, setCompleteResolution] = useState("");
  const [completeResolvedAt, setCompleteResolvedAt] = useState("");
  const [submittingComplete, setSubmittingComplete] = useState(false);

  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [submittingReopen, setSubmittingReopen] = useState(false);

  const getNowLocal = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  const toLocalInput = (isoDate?: string | null) => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const loadTicketData = async () => {
    setLoading(true);
    try {
      const [resTicket, resHistory, resMd, resUsers] = await Promise.all([
        fetch(`/api/v1/support-tickets/${id}`),
        fetch(`/api/v1/support-tickets/${id}/history`),
        fetch("/api/v1/master-data/support"),
        fetch("/api/users?status=active"),
      ]);

      const jsonTicket = await resTicket.json();
      if (jsonTicket.success) {
        setTicket(jsonTicket.data);
      } else {
        error(jsonTicket.error?.message || "Không tìm thấy ca hỗ trợ");
      }

      const jsonHistory = await resHistory.json();
      if (jsonHistory.success) {
        setHistory(jsonHistory.data || []);
      }

      const jsonMd = await resMd.json();
      if (jsonMd.success) {
        setBusinesses(jsonMd.data.businesses || []);
        setMethods(jsonMd.data.methods || []);
        setTypes(jsonMd.data.types || []);
      }

      if (resUsers.ok) {
        const jsonUsers = await resUsers.json();
        if (jsonUsers.success && Array.isArray(jsonUsers.data)) {
          setStaffUsers(
            jsonUsers.data.map((u: any) => ({
              id: u.id,
              username: u.username,
              fullName: u.staff?.fullName || u.username,
            }))
          );
        }
      }
    } catch (err) {
      console.error(err);
      error("Lỗi khi tải thông tin ca hỗ trợ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadTicketData();
  }, [id]);

  // Mở modal Edit
  const handleOpenEdit = () => {
    if (!ticket) return;
    setEditForm({
      requesterName: ticket.requesterName,
      businessId: ticket.businessId,
      supportTypeId: ticket.supportTypeId || "",
      supportMethodIds: ticket.methods.map((m) => m.id),
      description: ticket.description,
      cause: ticket.cause || "",
      resolution: ticket.resolution || "",
      sentAt: toLocalInput(ticket.sentAt),
      receivedAt: toLocalInput(ticket.receivedAt),
      resolvedAt: toLocalInput(ticket.resolvedAt),
      changeReason: "",
      version: ticket.version,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEdit(true);
    try {
      const payload = {
        ...editForm,
        sentAt: editForm.sentAt ? new Date(editForm.sentAt).toISOString() : undefined,
        receivedAt: editForm.receivedAt ? new Date(editForm.receivedAt).toISOString() : null,
        resolvedAt: editForm.resolvedAt ? new Date(editForm.resolvedAt).toISOString() : null,
      };

      const res = await fetch(`/api/v1/support-tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        success("Cập nhật ca hỗ trợ thành công!");
        setShowEditModal(false);
        loadTicketData();
      } else {
        error(json.error?.message || "Cập nhật ca thất bại");
      }
    } catch (err) {
      console.error(err);
      error("Lỗi mạng khi cập nhật ca");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Mở modal Phân công
  const handleOpenAssign = () => {
    if (!ticket) return;
    setAssignUserId(ticket.assignedUserId);
    setAssignReason("");
    setShowAssignModal(true);
  };

  const handleConfirmAssign = async () => {
    if (!assignUserId) return warning("Vui lòng chọn nhân sự");
    setSubmittingAssign(true);
    try {
      const res = await fetch(`/api/v1/support-tickets/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedUserId: assignUserId, reason: assignReason }),
      });
      const json = await res.json();
      if (json.success) {
        success("Đã thay đổi nhân sự phụ trách!");
        setShowAssignModal(false);
        loadTicketData();
      } else {
        error(json.error?.message || "Không thể đổi người phụ trách");
      }
    } catch (err) {
      console.error(err);
      error("Lỗi mạng khi phân công");
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Hoàn thành ca
  const handleOpenComplete = () => {
    if (!ticket) return;
    setCompleteResolution(ticket.resolution || "");
    setCompleteResolvedAt(getNowLocal());
    setShowCompleteModal(true);
  };

  const handleConfirmComplete = async () => {
    if (!completeResolution.trim()) return warning("Vui lòng nhập cách xử lý");
    setSubmittingComplete(true);
    try {
      const res = await fetch(`/api/v1/support-tickets/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution: completeResolution.trim(),
          resolvedAt: new Date(completeResolvedAt).toISOString(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        success("Đã hoàn thành ca hỗ trợ!");
        setShowCompleteModal(false);
        loadTicketData();
      } else {
        error(json.error?.message || "Không thể hoàn thành ca");
      }
    } catch (err) {
      console.error(err);
      error("Lỗi khi hoàn thành");
    } finally {
      setSubmittingComplete(false);
    }
  };

  // Mở lại ca
  const handleOpenReopen = () => {
    setReopenReason("");
    setShowReopenModal(true);
  };

  const handleConfirmReopen = async () => {
    if (!reopenReason.trim()) return warning("Vui lòng nhập lý do mở lại ca");
    setSubmittingReopen(true);
    try {
      const res = await fetch(`/api/v1/support-tickets/${id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reopenReason.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        success("Đã mở lại ca hỗ trợ!");
        setShowReopenModal(false);
        loadTicketData();
      } else {
        error(json.error?.message || "Không thể mở lại ca");
      }
    } catch (err) {
      console.error(err);
      error("Lỗi khi mở lại ca");
    } finally {
      setSubmittingReopen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen items-center justify-center p-8">
        <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#2457A7] border-t-transparent mb-2"></div>
        <div className="text-xs text-[#64748B]">Đang tải chi tiết ca hỗ trợ...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen items-center justify-center p-8">
        <div className="bg-white rounded-md border border-[#DDE2E9] p-8 max-w-md w-full text-center space-y-3 shadow-xs">
          <AlertCircle className="w-10 h-10 text-[#94A3B8] mx-auto" />
          <h2 className="text-base font-bold text-[#172033]">Không tìm thấy ca hỗ trợ</h2>
          <p className="text-xs text-[#64748B]">Ca hỗ trợ có thể đã bị xóa hoặc bạn không có quyền truy cập.</p>
          <div className="pt-2">
            <Link
              href="/support-tickets"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2457A7] text-white text-xs font-medium hover:bg-[#1C4585] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Quay lại danh sách
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = ticket.status === "COMPLETED";

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen">
      <div className="p-4 sm:p-6 space-y-4 max-w-7xl w-full mx-auto">
        {/* Back button & Title Bar Card */}
        <div className="bg-white border border-[#DDE2E9] rounded-md p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/support-tickets"
              className="p-1.5 rounded-md border border-[#DDE2E9] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#172033] transition-colors"
              title="Quay lại danh sách"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-[#2457A7]">
                  {ticket.ticketCode}
                </span>
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                    <Check className="w-3 h-3" /> Hoàn thành
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                    <Clock className="w-3 h-3" /> Đang xử lý
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Dự án: <span className="font-semibold text-[#172033]">[{ticket.project.projectCode}] {ticket.project.projectName}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#DDE2E9] bg-white hover:bg-[#F8FAFC] text-[#172033] text-xs font-medium transition-colors shadow-xs"
            >
              <Edit className="w-3.5 h-3.5 text-[#2457A7]" />
              Sửa thông tin
            </button>

            <button
              onClick={handleOpenAssign}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#DDE2E9] bg-white hover:bg-[#F8FAFC] text-[#172033] text-xs font-medium transition-colors shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#2457A7]" />
              Đổi người phụ trách
            </button>

            {!isCompleted ? (
              <button
                onClick={handleOpenComplete}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#15803D] hover:bg-[#166534] text-white text-xs font-medium shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Hoàn thành ca
              </button>
            ) : (
              <button
                onClick={handleOpenReopen}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] text-xs font-medium transition-colors shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Mở lại ca
              </button>
            )}
          </div>
        </div>

        {/* Tabs Switcher */}
        <div className="flex gap-2 border-b border-[#DDE2E9] pb-0">
          <button
            onClick={() => setActiveTab("detail")}
            className={`pb-2.5 px-3 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "detail"
                ? "border-[#2457A7] text-[#2457A7]"
                : "border-transparent text-[#64748B] hover:text-[#172033]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Chi tiết ca hỗ trợ
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-2.5 px-3 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "history"
                ? "border-[#2457A7] text-[#2457A7]"
                : "border-transparent text-[#64748B] hover:text-[#172033]"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Lịch sử thay đổi ({history.length})
          </button>
        </div>

        {activeTab === "detail" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Content (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Vấn đề & Xử lý Card */}
              <div className="bg-white rounded-md p-4 border border-[#DDE2E9] shadow-xs space-y-4">
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                    Mô tả vấn đề yêu cầu
                  </h4>
                  <div className="p-3 rounded-md bg-[#F8FAFC] text-[#172033] text-xs whitespace-pre-wrap leading-relaxed border border-[#DDE2E9]">
                    {ticket.description}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                      Nguyên nhân xác định
                    </h4>
                    <div className="p-3 rounded-md bg-[#F8FAFC] text-[#172033] text-xs min-h-[70px] whitespace-pre-wrap border border-[#DDE2E9]">
                      {ticket.cause || <span className="text-[#94A3B8] italic">Chưa ghi nhận</span>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                      Cách xử lý / Hướng dẫn
                    </h4>
                    <div className="p-3 rounded-md bg-[#F8FAFC] text-[#172033] text-xs min-h-[70px] whitespace-pre-wrap border border-[#DDE2E9]">
                      {ticket.resolution || <span className="text-[#94A3B8] italic">Chưa ghi nhận</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mốc thời gian Card */}
              <div className="bg-white rounded-md p-4 border border-[#DDE2E9] shadow-xs space-y-3.5">
                <h3 className="font-semibold text-[#172033] text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#2457A7]" />
                  Các mốc thời gian & Chỉ số đo lường
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#DDE2E9]">
                    <div className="text-[11px] text-[#64748B] font-medium">Thời điểm gửi (sentAt)</div>
                    <div className="text-xs font-semibold text-[#172033] mt-0.5">
                      {new Date(ticket.sentAt).toLocaleString("vi-VN")}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#DDE2E9]">
                    <div className="text-[11px] text-[#64748B] font-medium">Thời điểm tiếp nhận (receivedAt)</div>
                    <div className="text-xs font-semibold text-[#172033] mt-0.5">
                      {ticket.receivedAt ? new Date(ticket.receivedAt).toLocaleString("vi-VN") : "—"}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#DDE2E9]">
                    <div className="text-[11px] text-[#64748B] font-medium">Thời điểm hoàn thành (resolvedAt)</div>
                    <div className="text-xs font-semibold text-[#172033] mt-0.5">
                      {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString("vi-VN") : "—"}
                    </div>
                  </div>
                </div>

                {/* Chỉ số theo đặc tả */}
                <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-[11px] text-[#2457A7] font-medium">Thời gian xử lý (T_xử_lý)</div>
                    <div className="text-lg font-bold text-[#172033] mt-0.5">
                      {ticket.processingMinutes !== null ? `${ticket.processingMinutes} phút` : "—"}
                    </div>
                    <div className="text-[10px] text-[#64748B] mt-0.5">Căn cứ phân nhóm</div>
                  </div>

                  <div>
                    <div className="text-[11px] text-[#2457A7] font-medium">Tổng thời gian (T_tổng)</div>
                    <div className="text-lg font-bold text-[#172033] mt-0.5">
                      {ticket.totalMinutes !== null ? `${ticket.totalMinutes} phút` : "—"}
                    </div>
                    <div className="text-[10px] text-[#64748B] mt-0.5">Từ lúc gửi đến xong</div>
                  </div>

                  <div>
                    <div className="text-[11px] text-[#64748B] font-medium">Nhóm thời gian</div>
                    <div className="mt-0.5">
                      {ticket.timeGroup ? (
                        <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-[#E5EDFA] text-[#2457A7] border border-[#C5D7F2]">
                          {ticket.timeGroup.name}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] text-xs">Chưa có</span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#64748B] mt-0.5">Tự động xác định</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Info (1 col) */}
            <div className="space-y-4">
              <div className="bg-white rounded-md p-4 border border-[#DDE2E9] shadow-xs space-y-3.5">
                <h3 className="font-semibold text-[#172033] text-xs">Thông tin phân loại</h3>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-[#64748B] text-[11px] block mb-0.5">Người yêu cầu hỗ trợ:</span>
                    <span className="font-semibold text-[#172033] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#64748B]" />
                      {ticket.requesterName}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#64748B] text-[11px] block mb-0.5">Nghiệp vụ:</span>
                    <span className="inline-block px-2 py-0.5 rounded bg-[#F1F3F6] text-[#172033] font-medium text-[11px]">
                      {ticket.business.name}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#64748B] text-[11px] block mb-0.5">Phương thức hỗ trợ:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ticket.methods.map((m) => (
                        <span
                          key={m.id}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#E5EDFA] text-[#2457A7]"
                        >
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[#64748B] text-[11px] block mb-0.5">Loại công việc hỗ trợ:</span>
                    <span className="font-medium text-[#172033]">
                      {ticket.supportType?.name || "Chưa phân loại"}
                    </span>
                  </div>

                  <div className="pt-2.5 border-t border-[#EDF1F5]">
                    <span className="text-[#64748B] text-[11px] block mb-0.5">Nhân sự phụ trách:</span>
                    <span className="font-semibold text-[#172033] block">
                      {ticket.assignedUser.fullName || ticket.assignedUser.username}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#64748B] text-[11px] block mb-0.5">Người tạo bản ghi:</span>
                    <span className="font-medium text-[#172033] block">
                      {ticket.createdBy.fullName || ticket.createdBy.username}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#64748B] text-[11px] block mb-0.5">Thời điểm tạo trên Hub:</span>
                    <span className="text-[#64748B] block font-mono text-[11px]">
                      {new Date(ticket.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Tab Lịch sử thay đổi (AUD-01..04) */
          <div className="bg-white rounded-md p-4 border border-[#DDE2E9] shadow-xs space-y-3.5">
            <h3 className="font-semibold text-[#172033] text-sm flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#2457A7]" />
              Nhật ký truy vết thay đổi (Audit History)
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Mọi thao tác tạo ca, sửa trường, đổi người phụ trách, hoàn thành và mở lại ca đều được lưu vết đầy đủ.
            </p>

            {history.length === 0 ? (
              <div className="py-8 text-center text-[#64748B] text-xs">Chưa có nhật ký ghi nhận</div>
            ) : (
              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DDE2E9] pl-7">
                {history.map((h) => {
                  let badgeClass = "bg-[#E5EDFA] text-[#2457A7] border-[#C5D7F2]";
                  let actionLabel = h.action;

                  if (h.action === "created") {
                    badgeClass = "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]";
                    actionLabel = "Tạo mới ca hỗ trợ";
                  } else if (h.action === "completed") {
                    badgeClass = "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]";
                    actionLabel = "Xác nhận hoàn thành";
                  } else if (h.action === "reopened") {
                    badgeClass = "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]";
                    actionLabel = "Mở lại ca đã hoàn thành";
                  } else if (h.action === "assigned") {
                    badgeClass = "bg-[#E5EDFA] text-[#2457A7] border-[#C5D7F2]";
                    actionLabel = "Đổi nhân sự phụ trách";
                  } else if (h.action === "updated") {
                    badgeClass = "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]";
                    actionLabel = "Cập nhật thông tin";
                  }

                  return (
                    <div key={h.id} className="relative group">
                      <div className="absolute -left-7 top-1.5 w-2 h-2 rounded-full bg-[#2457A7] ring-4 ring-white"></div>
                      <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] text-xs space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${badgeClass}`}>
                              {actionLabel}
                            </span>
                            <span className="font-semibold text-[#172033]">
                              {h.actorName || "Người dùng"}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#64748B]">
                            {new Date(h.createdAt).toLocaleString("vi-VN")}
                          </span>
                        </div>

                        {h.reason && (
                          <div className="p-2 rounded bg-[#FFFBEB] text-[#B45309] text-[11px] border border-[#FDE68A]">
                            <span className="font-semibold">Lý do:</span> {h.reason}
                          </div>
                        )}

                        {/* Diff Before / After */}
                        {(h.beforeData || h.afterData) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-[#EDF1F5] text-[11px]">
                            {h.beforeData && (
                              <div className="p-2 rounded bg-white border border-[#DDE2E9] font-mono text-[#64748B] overflow-x-auto">
                                <span className="font-bold text-[#B91C1C] block mb-1">Dữ liệu trước thay đổi:</span>
                                <pre className="whitespace-pre-wrap">{JSON.stringify(h.beforeData, null, 2)}</pre>
                              </div>
                            )}
                            {h.afterData && (
                              <div className="p-2 rounded bg-white border border-[#DDE2E9] font-mono text-[#64748B] overflow-x-auto">
                                <span className="font-bold text-[#15803D] block mb-1">Dữ liệu sau thay đổi:</span>
                                <pre className="whitespace-pre-wrap">{JSON.stringify(h.afterData, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Chỉnh Sửa Thông Tin */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-[#DDE2E9] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDF1F5]">
              <h3 className="font-semibold text-[#172033] text-sm">
                Chỉnh sửa ca hỗ trợ {ticket.ticketCode}
              </h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-[#64748B] hover:text-[#172033]">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-[#172033] block mb-1 text-[11px]">
                  Người yêu cầu hỗ trợ <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.requesterName}
                  onChange={(e) => setEditForm({ ...editForm, requesterName: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#172033] block mb-1 text-[11px]">Nghiệp vụ</label>
                  <select
                    value={editForm.businessId}
                    onChange={(e) => setEditForm({ ...editForm, businessId: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#172033] block mb-1 text-[11px]">Loại hỗ trợ</label>
                  <select
                    value={editForm.supportTypeId}
                    onChange={(e) => setEditForm({ ...editForm, supportTypeId: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                  >
                    <option value="">-- Chưa phân loại --</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mốc thời gian */}
              <div className="p-3 bg-[#F8FAFC] rounded-md border border-[#DDE2E9] space-y-2.5">
                <div className="font-semibold text-[#172033] text-[11px]">Điều chỉnh các mốc thời gian:</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[#64748B] text-[10px] mb-1">Thời điểm gửi</label>
                    <input
                      type="datetime-local"
                      value={editForm.sentAt}
                      onChange={(e) => setEditForm({ ...editForm, sentAt: e.target.value })}
                      className="w-full px-2 py-1 rounded-md border border-[#DDE2E9] text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#64748B] text-[10px] mb-1">Thời điểm tiếp nhận</label>
                    <input
                      type="datetime-local"
                      value={editForm.receivedAt}
                      onChange={(e) => setEditForm({ ...editForm, receivedAt: e.target.value })}
                      className="w-full px-2 py-1 rounded-md border border-[#DDE2E9] text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#64748B] text-[10px] mb-1">Thời điểm hoàn thành</label>
                    <input
                      type="datetime-local"
                      value={editForm.resolvedAt}
                      onChange={(e) => setEditForm({ ...editForm, resolvedAt: e.target.value })}
                      className="w-full px-2 py-1 rounded-md border border-[#DDE2E9] text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#172033] block mb-1 text-[11px]">Mô tả vấn đề</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#172033] block mb-1 text-[11px]">Nguyên nhân</label>
                  <textarea
                    rows={2}
                    value={editForm.cause}
                    onChange={(e) => setEditForm({ ...editForm, cause: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#172033] block mb-1 text-[11px]">Cách xử lý</label>
                  <textarea
                    rows={2}
                    value={editForm.resolution}
                    onChange={(e) => setEditForm({ ...editForm, resolution: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#172033] block mb-1 text-[11px]">
                  Lý do thay đổi (ghi vào lịch sử)
                </label>
                <input
                  type="text"
                  placeholder="VD: Bổ sung nguyên nhân do người dùng cung cấp..."
                  value={editForm.changeReason}
                  onChange={(e) => setEditForm({ ...editForm, changeReason: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EDF1F5]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 rounded-md border border-[#DDE2E9] text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white font-medium text-xs shadow-xs"
                >
                  {submittingEdit ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đổi Người Phụ Trách */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl border border-[#DDE2E9] p-5 space-y-3.5">
            <h3 className="font-semibold text-[#172033] text-sm">Phân công nhân sự phụ trách</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#172033] block mb-1 text-[11px]">
                  Chọn nhân sự mới <span className="text-[#B91C1C]">*</span>
                </label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                >
                  {staffUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#172033] block mb-1 text-[11px]">Lý do điều chuyển</label>
                <textarea
                  rows={2}
                  placeholder="Ghi nhận lý do phân công lại cho nhân sự khác..."
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EDF1F5]">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3 py-1.5 rounded-md border border-[#DDE2E9] text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={submittingAssign}
                  onClick={handleConfirmAssign}
                  className="px-4 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white font-medium text-xs shadow-xs"
                >
                  {submittingAssign ? "Đang phân công..." : "Xác nhận phân công"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hoàn Thành */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl border border-[#DDE2E9] p-5 space-y-3.5">
            <h3 className="font-semibold text-[#172033] text-sm">Xác nhận hoàn thành ca hỗ trợ</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#172033] block mb-1 text-[11px]">
                  Cách xử lý <span className="text-[#B91C1C]">* (Bắt buộc)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi nhận cách xử lý và kết quả..."
                  value={completeResolution}
                  onChange={(e) => setCompleteResolution(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#172033] block mb-1 text-[11px]">
                  Thời điểm hoàn thành
                </label>
                <input
                  type="datetime-local"
                  value={completeResolvedAt}
                  onChange={(e) => setCompleteResolvedAt(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EDF1F5]">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-3 py-1.5 rounded-md border border-[#DDE2E9] text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={submittingComplete}
                  onClick={handleConfirmComplete}
                  className="px-4 py-1.5 rounded-md bg-[#15803D] hover:bg-[#166534] text-white font-medium text-xs shadow-xs"
                >
                  {submittingComplete ? "Đang xử lý..." : "Xác nhận hoàn thành"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mở Lại Ca */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl border border-[#DDE2E9] p-5 space-y-3.5">
            <h3 className="font-semibold text-[#B91C1C] text-sm">
              Mở lại ca đã hoàn thành
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Thao tác này sẽ chuyển ca về Chưa hoàn thành (IN_PROGRESS) để tiếp tục xử lý và ghi lịch sử truy vết.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#172033] block mb-1 text-[11px]">
                  Lý do mở lại <span className="text-[#B91C1C]">* (Bắt buộc)</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="VD: Người dùng phản hồi lỗi vẫn còn phát sinh sau khi cấu hình..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EDF1F5]">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="px-3 py-1.5 rounded-md border border-[#DDE2E9] text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={submittingReopen}
                  onClick={handleConfirmReopen}
                  className="px-4 py-1.5 rounded-md bg-[#B91C1C] hover:bg-[#991B1B] text-white font-medium text-xs shadow-xs"
                >
                  {submittingReopen ? "Đang mở lại..." : "Xác nhận mở lại"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
