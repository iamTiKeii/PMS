"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
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
import { formatShortDate } from "@/lib/utils";
import { ExcelImportModal, ColumnDefinition } from "@/components/ExcelImportModal";

export default function StaffPage() {
  const { success, error, toast } = useToast();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
    if (!confirm(`Bạn có chắc chắn muốn xóa hồ sơ nhân sự "${s.fullName}" không?`)) {
      return;
    }

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
    <div className="flex-1 flex flex-col min-w-0 bg-[#060913] bg-cyber-grid">
      <Header
        title="Danh bạ Nhân sự"
        subtitle="Quản lý thông tin nhân viên, phòng ban và phân công dự án"
        actionButton={
          isAdmin ? (
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
                <span>Thêm Nhân sự mới</span>
              </button>
            </div>
          ) : null
        }
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Search & Status Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl backdrop-blur-xl">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo họ tên, mã nhân viên, email, phòng ban..."
              className="w-full px-4 py-2.5 pl-10 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
            {[
              { id: "all", label: "Tất cả" },
              { id: "working", label: "Đang làm việc" },
              { id: "left", label: "Đã nghỉ việc" },
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

        {/* Staff Table */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800/80 overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-5">Nhân sự</th>
                  <th className="py-4 px-4">Mã NV</th>
                  <th className="py-4 px-4">Phòng ban</th>
                  <th className="py-4 px-4">Thông tin liên hệ</th>
                  <th className="py-4 px-4">Dự án phụ trách</th>
                  <th className="py-4 px-4">Tài khoản Site</th>
                  <th className="py-4 px-4">Trạng thái</th>
                  {isAdmin && <th className="py-4 px-5 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="py-16 text-center text-slate-500 text-xs">
                      Đang tải danh sách nhân sự...
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="py-16 text-center text-slate-500 text-xs">
                      Không tìm thấy nhân sự nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  staffList.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-md ring-1 ring-white/10">
                            {s.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm group-hover:text-blue-300 transition-colors">
                              {s.fullName}
                            </div>
                            {s.user && (
                              <div className="text-[10px] text-cyan-400 font-semibold mt-0.5">
                                User Tool: @{s.user.username} ({s.user.role})
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-blue-400">
                        {s.staffCode ? (
                          <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            {s.staffCode}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-slate-300 font-medium">
                        {s.department || "—"}
                      </td>

                      <td className="py-4 px-4 space-y-1">
                        {s.corporateEmail && (
                          <a
                            href={`mailto:${s.corporateEmail}`}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-blue-300 transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{s.corporateEmail}</span>
                          </a>
                        )}
                        {s.phoneNumber && (
                          <a
                            href={`tel:${s.phoneNumber}`}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-300 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{s.phoneNumber}</span>
                          </a>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {s.projectAssignments && s.projectAssignments.length > 0 ? (
                            s.projectAssignments.map((pa: any) => (
                              <span
                                key={pa.id}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30"
                              >
                                {pa.project?.projectName} (L{pa.tierLevel})
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600 italic">Chưa gán</span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          <span>{s.siteAccounts?.length || 0} tài khoản</span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 w-max ${
                            s.status === "working"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.status === "working" ? "bg-emerald-400" : "bg-slate-400"
                            }`}
                          />
                          {s.status === "working" ? "Đang làm việc" : "Đã nghỉ việc"}
                        </span>
                      </td>

                      {isAdmin && (
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(s)}
                              className="p-2 rounded-xl bg-slate-950/70 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition-all"
                              title="Sửa thông tin nhân sự"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(s)}
                              className="p-2 rounded-xl bg-slate-950/70 hover:bg-rose-600/80 text-slate-400 hover:text-white border border-slate-800 hover:border-rose-500 transition-all"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Họ và Tên Nhân sự <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="VD: Nguyễn Văn An"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Mã Nhân viên
              </label>
              <input
                type="text"
                value={staffCode}
                onChange={(e) => setStaffCode(e.target.value)}
                placeholder="VD: EMP005"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Phòng ban / Bộ phận
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="VD: Khối Kỹ thuật & Công nghệ"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Email Công ty
              </label>
              <input
                type="email"
                value={corporateEmail}
                onChange={(e) => setCorporateEmail(e.target.value)}
                placeholder="an.nguyen@company.com"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Số Điện thoại
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0912345678"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Trạng thái làm việc
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white text-xs font-medium"
              >
                <option value="working">Đang làm việc (Working)</option>
                <option value="left">Đã nghỉ việc (Left)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Ngày vào làm việc
              </label>
              <input
                type="date"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
              className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all"
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
