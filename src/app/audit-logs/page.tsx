"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
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
        <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          {code}
        </span>
      );
    }
    if (code.includes("REVEAL")) {
      return (
        <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1">
          <KeyRound className="w-3 h-3 text-amber-400" />
          {code}
        </span>
      );
    }
    if (code.includes("IMPORT")) {
      return (
        <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-teal-500/15 text-teal-300 border border-teal-500/30 flex items-center gap-1">
          <FileSpreadsheet className="w-3 h-3 text-teal-400" />
          {code}
        </span>
      );
    }
    if (code.includes("LOGIN") || code.includes("SUCCESS")) {
      return (
        <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          {code}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-blue-500/15 text-blue-400 border border-blue-500/30">
        {code}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#060913] bg-cyber-grid">
      <Header
        title="Nhật ký Kiểm toán An ninh (Audit Trail)"
        subtitle="Hệ thống lưu trữ bất biến (Write-Once-Read-Many) theo dõi 100% các hành vi nhạy cảm"
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Search & Action Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl backdrop-blur-xl">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo hành vi, IP, người dùng, entity..."
              className="w-full px-4 py-2.5 pl-10 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto w-full sm:w-auto">
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  actionCodeFilter === f.id
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800/80 overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-5">Thời gian (UTC+7)</th>
                  <th className="py-4 px-4">Người thực hiện</th>
                  <th className="py-4 px-4">Mã Hành vi (Action Code)</th>
                  <th className="py-4 px-4">Đối tượng tác động</th>
                  <th className="py-4 px-4">Địa chỉ IP</th>
                  <th className="py-4 px-5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-500 font-sans text-xs">
                      Đang tải nhật ký kiểm toán...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-500 font-sans text-xs">
                      Không tìm thấy bản ghi kiểm toán nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-5 text-slate-400 text-[11px] whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>

                      <td className="py-4 px-4 font-sans">
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono text-xs">
                              @{log.user.username}
                            </span>
                            {log.user.staff?.fullName && (
                              <span className="text-[11px] text-slate-400">
                                ({log.user.staff.fullName})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Khách / Hệ thống</span>
                        )}
                      </td>

                      <td className="py-4 px-4 font-sans">
                        {getActionBadge(log.actionCode)}
                      </td>

                      <td className="py-4 px-4 font-sans text-slate-300">
                        <span className="text-blue-400 font-bold">{log.targetEntity}</span>
                        {log.targetEntityId && (
                          <span className="text-[10px] text-slate-500 ml-1.5 font-mono truncate max-w-[120px] inline-block align-bottom">
                            ({log.targetEntityId.substring(0, 8)}...)
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-slate-400 text-[11px]">
                        {log.ipAddress}
                      </td>

                      <td className="py-4 px-5 text-right font-sans">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div>
              Tổng số bản ghi: <strong className="text-white">{meta.total}</strong> (Trang {meta.page} / {meta.totalPages || 1})
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors border border-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-white px-2">Trang {page}</span>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors border border-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
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
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-400">Người thực hiện:</span>
                <div className="font-extrabold text-white text-sm mt-0.5 font-mono">
                  {selectedLog.user?.username ? `@${selectedLog.user.username}` : "Hệ thống"}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Đối tượng tác động:</span>
                <div className="font-extrabold text-blue-400 text-sm mt-0.5">
                  {selectedLog.targetEntity} {selectedLog.targetEntityId ? `(${selectedLog.targetEntityId.substring(0, 8)}...)` : ""}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                User Agent / Trình duyệt & Thiết bị:
              </label>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 break-all leading-relaxed">
                {selectedLog.userAgent || "N/A"}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Ngữ cảnh Dữ liệu (Context JSON Payload):
              </label>
              <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap max-h-56 leading-relaxed">
                {selectedLog.contextJson
                  ? JSON.stringify(JSON.parse(selectedLog.contextJson), null, 2)
                  : "Không có dữ liệu payload bổ sung."}
              </pre>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
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
