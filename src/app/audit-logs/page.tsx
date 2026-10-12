"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { useToast } from "@/components/Toast";
import {
  History,
  Search,
  Filter,
  Shield,
  Eye,
  ChevronLeft,
  ChevronRight,
  Globe,
  Monitor,
  Calendar,
  Lock,
  Activity,
  FileSpreadsheet,
  KeyRound,
  ShieldAlert,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AuditLogsPage() {
  const { error } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionCodeFilter, setActionCodeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1 });

  // Detail Modal state
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (actionCodeFilter && actionCodeFilter !== "all") params.set("actionCode", actionCodeFilter);
      params.set("page", page.toString());
      params.set("pageSize", "25");

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setLogs(json.data);
          setMeta(json.meta);
        }
      } else {
        error("Bạn không có quyền xem nhật ký hoặc phiên đã hết hạn.");
      }
    } catch (err) {
      console.error(err);
      error("Lỗi khi tải nhật ký kiểm toán.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchLogs();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, actionCodeFilter, page]);

  const getActionBadge = (code: string) => {
    if (code.includes("FAIL") || code.includes("LOCKED") || code.includes("DENIED")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
          {code}
        </span>
      );
    }
    if (code.includes("REVEAL")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] flex items-center gap-1">
          <KeyRound className="w-3 h-3 text-[#B45309]" />
          {code}
        </span>
      );
    }
    if (code.includes("IMPORT")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] flex items-center gap-1">
          <FileSpreadsheet className="w-3 h-3 text-[#15803D]" />
          {code}
        </span>
      );
    }
    if (code.includes("LOGIN") || code.includes("SUCCESS")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
          {code}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7]">
        {code}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen text-[#172033]">
      <Header
        title="Nhật ký Kiểm toán An ninh (Audit Trail)"
        subtitle="Hệ thống lưu trữ bất biến (Write-Once-Read-Many) theo dõi 100% các hành vi nhạy cảm"
      />

      <div className="p-6 md:p-8 space-y-4 max-w-7xl w-full mx-auto">
        {/* Search & Action Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-lg bg-white border border-[#DDE2E9] shadow-xs">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo hành vi, IP, người dùng, entity..."
              className="w-full px-3 py-1.5 pl-8 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: "all", label: "Tất cả sự kiện" },
              { id: "VAULT_REVEAL_PASSWORD", label: "Mở Mật khẩu" },
              { id: "AUTH_LOGIN_SUCCESS", label: "Đăng nhập" },
              { id: "AUTH_LOGIN_FAILED", label: "Đăng nhập Sai" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setActionCodeFilter(f.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                  actionCodeFilter === f.id
                    ? "bg-[#2457A7] text-white shadow-xs font-semibold"
                    : "bg-white text-[#64748B] border border-[#DDE2E9] hover:bg-[#F8FAFC] hover:text-[#172033]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-lg bg-white border border-[#DDE2E9] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#DDE2E9] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Thời gian (UTC+7)</th>
                  <th className="py-3 px-4">Người thực hiện</th>
                  <th className="py-3 px-4">Mã Hành vi (Action Code)</th>
                  <th className="py-3 px-4">Đối tượng tác động</th>
                  <th className="py-3 px-4">Địa chỉ IP</th>
                  <th className="py-3 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF1F5] text-[#172033]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#94A3B8] font-sans text-xs">
                      Đang tải nhật ký kiểm toán...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#94A3B8] font-sans text-xs">
                      Không tìm thấy bản ghi kiểm toán nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>

                      <td className="py-3 px-4">
                        {log.user ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[#172033] font-mono text-xs">
                              @{log.user.username}
                            </span>
                            {log.user.staff?.fullName && (
                              <span className="text-[11px] text-[#64748B]">
                                ({log.user.staff.fullName})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#94A3B8] italic">Khách / Hệ thống</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {getActionBadge(log.actionCode)}
                      </td>

                      <td className="py-3 px-4 text-[#172033]">
                        <span className="text-[#2457A7] font-semibold">{log.targetEntity}</span>
                        {log.targetEntityId && (
                          <span className="text-[10px] text-[#94A3B8] ml-1 font-mono truncate max-w-[120px] inline-block align-bottom">
                            ({log.targetEntityId.substring(0, 8)}...)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-[#64748B] font-mono text-[11px]">
                        {log.ipAddress}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] border border-[#DDE2E9] text-xs font-medium inline-flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#64748B]" />
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Accessible Pagination Landmark */}
          <Pagination
            currentPage={page}
            totalItems={meta.total || 0}
            pageSize={25}
            onPageChange={(newPage) => setPage(newPage)}
            filterDeps={[search, actionCodeFilter]}
            className="rounded-t-none border-x-0 border-b-0 border-t border-[#DDE2E9]"
          />
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title={`Chi tiết Bản ghi: ${selectedLog.actionCode}`}
          subtitle={`Thời gian: ${formatDate(selectedLog.createdAt)} • IP: ${selectedLog.ipAddress}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-[#F8FAFC] border border-[#DDE2E9]">
              <div>
                <span className="text-[#64748B] font-medium">Người thực hiện:</span>
                <div className="font-semibold text-[#172033] text-xs mt-0.5 font-mono">
                  {selectedLog.user?.username ? `@${selectedLog.user.username}` : "Hệ thống"}
                </div>
              </div>
              <div>
                <span className="text-[#64748B] font-medium">Đối tượng tác động:</span>
                <div className="font-semibold text-[#2457A7] text-xs mt-0.5">
                  {selectedLog.targetEntity} {selectedLog.targetEntityId ? `(${selectedLog.targetEntityId.substring(0, 8)}...)` : ""}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#64748B]">
                User Agent / Trình duyệt & Thiết bị:
              </label>
              <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] font-mono text-[11px] text-[#172033] break-all leading-relaxed">
                {selectedLog.userAgent || "N/A"}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#64748B]">
                Ngữ cảnh Dữ liệu (Context JSON Payload):
              </label>
              <pre className="p-3 rounded-md bg-[#18283F] border border-[#233752] font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap max-h-56 leading-relaxed">
                {selectedLog.contextJson
                  ? JSON.stringify(JSON.parse(selectedLog.contextJson), null, 2)
                  : "Không có dữ liệu payload bổ sung."}
              </pre>
            </div>

            <div className="pt-2 border-t border-[#DDE2E9] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] border border-[#DDE2E9] font-medium transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
