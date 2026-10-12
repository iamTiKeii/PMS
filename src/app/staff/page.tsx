"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import {
  Users2,
  Search,
  Plus,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Briefcase,
  AlertTriangle,
  FolderKanban,
  KeyRound,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { ExcelImportModal, ColumnDefinition } from "@/components/ExcelImportModal";
import { Pagination, usePagination } from "@/components/Pagination";
import { TableRowSkeleton } from "@/components/Skeleton";

export default function StaffPage() {
  const { success, error, toast } = useToast();
  const { confirm } = useConfirm();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination hook
  const {
    page: staffPage,
    offset: staffOffset,
    goToPage: setStaffPage,
  } = usePagination({
    totalItems: staffList.length,
    pageSize: 15,
    filterDeps: [search, statusFilter],
  });

  const paginatedStaff = staffList.slice(staffOffset, staffOffset + 15);

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [staffCode, setStaffCode] = useState("");
  const [corporateEmail, setCorporateEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("working");
  const [joinDate, setJoinDate] = useState("");
  const [saving, setSaving] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setCurrentUser(json.data);
      })
      .catch(console.error);
  }, []);

  const isAdmin = currentUser?.role === "admin";

  const staffExcelColumns: ColumnDefinition[] = [
    { key: "fullName", label: "Họ và Tên", required: true, example: "Nguyễn Văn An" },
    { key: "staffCode", label: "Mã Nhân viên", example: "EMP005" },
    { key: "corporateEmail", label: "Email Công ty", example: "an.nguyen@company.com" },
    { key: "phoneNumber", label: "Số Điện thoại", example: "0912345678" },
    { key: "department", label: "Phòng ban / Bộ phận", example: "Khối Kỹ thuật & Công nghệ" },
    { key: "status", label: "Trạng thái", example: "working" },
    { key: "joinDate", label: "Ngày vào làm (YYYY-MM-DD)", example: "2024-01-15" },
  ];

  const sampleStaffData = [
    {
      "Họ và Tên": "Nguyễn Văn An",
      "Mã Nhân viên": "EMP005",
      "Email Công ty": "an.nguyen@company.com",
      "Số Điện thoại": "0912345678",
      "Phòng ban / Bộ phận": "Khối Kỹ thuật & Công nghệ",
      "Trạng thái": "working",
      "Ngày vào làm (YYYY-MM-DD)": "2024-01-15",
    },
    {
      "Họ và Tên": "Đỗ Hoàng Bách",
      "Mã Nhân viên": "EMP006",
      "Email Công ty": "bach.do@company.com",
      "Số Điện thoại": "0987654321",
      "Phòng ban / Bộ phận": "Ban Quản lý Dự án (PMO)",
      "Trạng thái": "working",
      "Ngày vào làm (YYYY-MM-DD)": "2023-11-20",
    },
  ];

  const handleImportStaff = async (items: any[]) => {
    const res = await fetch("/api/staff/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const json = await res.json();
    return {
      success: res.ok && json.success,
      message: json.message || json.error?.message,
      count: json.data?.importedCount,
    };
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/staff?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setStaffList(json.data);
      }
    } catch (err) {
      console.error(err);
      error("Lỗi khi tải danh sách nhân sự.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchStaff();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, statusFilter]);

  const openAddModal = () => {
    setEditingStaff(null);
    setFullName("");
    setStaffCode("");
    setCorporateEmail("");
    setPhoneNumber("");
    setDepartment("");
    setStatus("working");
    setJoinDate("");
    setModalOpen(true);
  };

  const openEditModal = (s: any) => {
    setEditingStaff(s);
    setFullName(s.fullName);
    setStaffCode(s.staffCode || "");
    setCorporateEmail(s.corporateEmail || "");
    setPhoneNumber(s.phoneNumber || "");
    setDepartment(s.department || "");
    setStatus(s.status || "working");
    setJoinDate(s.joinDate ? s.joinDate.substring(0, 10) : "");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      error("Vui lòng nhập họ và tên nhân sự.");
      return;
    }

    setSaving(true);
    try {
      const url = editingStaff ? `/api/staff/${editingStaff.id}` : "/api/staff";
      const method = editingStaff ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          staffCode,
          corporateEmail,
          phoneNumber,
          department,
          status,
          joinDate: joinDate || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Lỗi lưu thông tin nhân sự.");
        setSaving(false);
        return;
      }

      success(editingStaff ? "Cập nhật nhân sự thành công!" : "Thêm mới nhân sự thành công!");
      setModalOpen(false);
      fetchStaff();
    } catch {
      error("Lỗi khi kết nối đến máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: any) => {
    const ok = await confirm({
      title: "Xóa hồ sơ nhân sự?",
      message: `Bạn có chắc chắn muốn xóa hồ sơ nhân sự "${s.fullName}" không? Hành động này sẽ chuyển trạng thái nhân sự sang đã xóa.`,
      confirmText: "Xóa nhân sự",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/staff/${s.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        success("Đã xóa hồ sơ nhân sự thành công.");
        fetchStaff();
      } else {
        error(json.error?.message || "Lỗi xóa nhân sự.");
      }
    } catch {
      error("Lỗi khi gửi yêu cầu xóa nhân sự.");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen">
      <Header
        title="Danh bạ Nhân sự"
        subtitle="Quản trị thông tin nhân viên, phòng ban chuyên môn và phân công dự án L1/L2/L3"
        actionButton={
          isAdmin ? (
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
                className="px-3.5 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm nhân sự</span>
              </button>
            </div>
          ) : null
        }
      />

      <div className="p-6 md:p-8 space-y-5 max-w-7xl w-full mx-auto">
        {/* Search & Status Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-lg bg-white border border-[#DDE2E9] shadow-xs">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo họ tên, mã nhân viên, email, phòng ban..."
              className="w-full px-3 py-1.5 pl-9 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
            />
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {[
              { id: "all", label: "Tất cả" },
              { id: "working", label: "Đang làm việc" },
              { id: "left", label: "Đã nghỉ việc" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === st.id
                    ? "bg-[#2457A7] text-white shadow-xs font-semibold"
                    : "bg-white text-[#64748B] hover:bg-[#F8FAFC] border border-[#DDE2E9]"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Staff Table */}
        <div className="rounded-lg bg-white border border-[#DDE2E9] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#DDE2E9] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Nhân sự</th>
                  <th className="py-2.5 px-3">Mã NV</th>
                  <th className="py-2.5 px-3">Phòng ban</th>
                  <th className="py-2.5 px-3">Thông tin liên hệ</th>
                  <th className="py-2.5 px-3">Tài khoản Site</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  {isAdmin && <th className="py-2.5 px-4 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF1F5] text-[#172033]" aria-busy={loading ? "true" : "false"}>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRowSkeleton key={i} columns={isAdmin ? 7 : 6} />
                  ))
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-[#64748B] text-xs">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Users2 className="w-8 h-8 text-[#94A3B8] mb-1" />
                        <span className="font-semibold text-[#172033]">Không tìm thấy nhân sự phù hợp</span>
                        <span className="text-[#64748B] max-w-sm">
                          {search || statusFilter !== "all"
                            ? "Không có nhân sự nào khớp với điều kiện lọc tìm kiếm."
                            : "Danh mục nhân sự hiện đang trống. Hãy thêm nhân sự mới hoặc import từ file Excel."}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedStaff.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-[#E5EDFA] border border-[#BFD4F7] text-[#2457A7] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {s.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-[#172033] text-xs">
                              {s.fullName}
                            </div>
                            {s.user && (
                              <div className="text-[10px] text-[#64748B] font-mono">
                                @{s.user.username} ({s.user.role})
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono font-medium text-[#172033]">
                        {s.staffCode ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#F1F3F6] border border-[#DDE2E9] text-[11px]">
                            {s.staffCode}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-[#172033] font-medium">
                        {s.department || "—"}
                      </td>

                      <td className="py-2.5 px-3 space-y-0.5">
                        {s.corporateEmail && (
                          <a
                            href={`mailto:${s.corporateEmail}`}
                            className="flex items-center gap-1.5 text-[#64748B] hover:text-[#2457A7] transition-colors"
                          >
                            <Mail className="w-3 h-3 text-[#94A3B8] shrink-0" />
                            <span className="truncate max-w-[180px]">{s.corporateEmail}</span>
                          </a>
                        )}
                        {s.phoneNumber && (
                          <a
                            href={`tel:${s.phoneNumber}`}
                            className="flex items-center gap-1.5 text-[#64748B] hover:text-[#2457A7] transition-colors"
                          >
                            <Phone className="w-3 h-3 text-[#94A3B8] shrink-0" />
                            <span>{s.phoneNumber}</span>
                          </a>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1 text-[#64748B] text-xs">
                          <KeyRound className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span>{s.siteAccounts?.length || 0} tài khoản</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium items-center gap-1.5 ${
                            s.status === "working"
                              ? "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]"
                              : "bg-[#F1F3F6] text-[#64748B] border border-[#DDE2E9]"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.status === "working" ? "bg-[#15803D]" : "bg-[#94A3B8]"
                            }`}
                          />
                          {s.status === "working" ? "Đang làm việc" : "Đã nghỉ việc"}
                        </span>
                      </td>

                      {isAdmin && (
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(s)}
                              className="p-1 rounded hover:bg-[#F1F3F6] text-[#64748B] hover:text-[#172033] transition-colors"
                              title="Sửa thông tin nhân sự"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(s)}
                              className="p-1 rounded hover:bg-[#FEF2F2] text-[#64748B] hover:text-[#B91C1C] transition-colors"
                              title="Xóa hồ sơ nhân sự"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Accessible Pagination Landmark */}
          {staffList.length > 0 && (
            <Pagination
              currentPage={staffPage}
              totalItems={staffList.length}
              pageSize={15}
              onPageChange={setStaffPage}
              filterDeps={[search, statusFilter]}
              className="rounded-t-none border-x-0 border-b-0 border-t border-[#DDE2E9]"
            />
          )}
        </div>
      </div>

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingStaff ? "Chỉnh sửa Hồ sơ Nhân sự" : "Thêm mới Nhân sự"}
        subtitle="Thông tin phục vụ phân bổ dự án Level 1/2/3 và cấp phát tài khoản két"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Họ và Tên Nhân sự <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="VD: Nguyễn Văn An"
                className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Mã Nhân viên
              </label>
              <input
                type="text"
                value={staffCode}
                onChange={(e) => setStaffCode(e.target.value)}
                placeholder="VD: EMP005"
                className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Phòng ban / Bộ phận
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="VD: Khối Kỹ thuật & Công nghệ"
                className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Email Công ty
              </label>
              <input
                type="email"
                value={corporateEmail}
                onChange={(e) => setCorporateEmail(e.target.value)}
                placeholder="an.nguyen@company.com"
                className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Số Điện thoại
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0912345678"
                className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Trạng thái làm việc
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
              >
                <option value="working">Đang làm việc (Working)</option>
                <option value="left">Đã nghỉ việc (Left)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Ngày vào làm việc
              </label>
              <input
                type="date"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE2E9]">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:text-[#172033] hover:bg-[#F1F3F6] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs disabled:opacity-50 transition-colors"
            >
              {saving ? "Đang lưu..." : editingStaff ? "Lưu thay đổi" : "Tạo hồ sơ"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Nhập Danh sách Nhân sự từ Excel"
        subtitle="Hỗ trợ nạp hàng loạt thông tin nhân viên, phòng ban và liên hệ"
        columns={staffExcelColumns}
        sampleData={sampleStaffData}
        templateFileName="mau_import_nhan_su.xlsx"
        onImport={handleImportStaff}
        onSuccess={fetchStaff}
      />
    </div>
  );
}
