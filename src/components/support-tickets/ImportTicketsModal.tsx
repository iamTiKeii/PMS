"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import type { ValidatedImportTicket, ImportTicketValidationError } from "@/lib/support-ticket-import";

interface ImportTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportTicketsModal({ isOpen, onClose, onSuccess }: ImportTicketsModalProps) {
  const { success, error, warning } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States quá trình import
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDownloadingErrors, setIsDownloadingErrors] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  // Kết quả sau khi validate
  const [validationResult, setValidationResult] = useState<{
    fileName: string;
    fileSizeBytes: number;
    totalRows: number;
    validRowsCount: number;
    errorRowsCount: number;
    hasStructureError: boolean;
    structureErrorMessage?: string;
    errors: ImportTicketValidationError[];
    validTickets: ValidatedImportTicket[];
    rawRows: Record<string, any>[];
  } | null>(null);

  // Kết quả sau khi execute import
  const [importResult, setImportResult] = useState<{
    successCount: number;
    createdTicketCodes: string[];
    batchCode?: string;
  } | null>(null);

  // Tab xem trước: "errors" hoặc "preview"
  const [activeTab, setActiveTab] = useState<"errors" | "preview">("errors");
  const [filterErrorCol, setFilterErrorCol] = useState<string>("ALL");

  if (!isOpen) return null;

  // Reset toàn bộ modal
  const handleReset = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setImportResult(null);
    setActiveTab("errors");
    setFilterErrorCol("ALL");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Đóng modal
  const handleClose = () => {
    if (isExecuting) return;
    handleReset();
    onClose();
  };

  // Tải file mẫu .xlsx
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const res = await fetch("/api/v1/support-tickets/import/template");
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || "Không thể tải file mẫu");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Mau_Import_Ca_Ho_Tro_PMS_Hub_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      success("Đã tải xuống file Excel mẫu thành công");
    } catch (err: any) {
      error(err.message || "Lỗi khi tải file mẫu");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Upload và validate file
  const handleAnalyzeFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
      return warning("Vui lòng chỉ chọn file Excel có định dạng .xlsx");
    }

    setSelectedFile(file);
    setIsAnalyzing(true);
    setValidationResult(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/v1/support-tickets/import/validate", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Kiểm tra file thất bại");
      }

      setValidationResult(json.data);
      if (json.data.hasStructureError) {
        warning(json.data.structureErrorMessage || "Cấu trúc file không hợp lệ");
      } else if (json.data.errorRowsCount > 0) {
        warning(`Phát hiện ${json.data.errorRowsCount} dòng có lỗi cần xử lý`);
        setActiveTab("errors");
      } else {
        success(`File hoàn toàn hợp lệ! Sẵn sàng import ${json.data.validRowsCount} ca`);
        setActiveTab("preview");
      }
    } catch (err: any) {
      console.error(err);
      error(err.message || "Lỗi đọc và phân tích file Excel");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Kéo thả file
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAnalyzeFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Tải file danh sách các dòng lỗi
  const handleDownloadErrors = async () => {
    if (!validationResult || validationResult.errors.length === 0) return;
    setIsDownloadingErrors(true);
    try {
      const res = await fetch("/api/v1/support-tickets/import/export-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawRows: validationResult.rawRows,
          errors: validationResult.errors,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || "Không thể tải file lỗi");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Danh_sach_dong_loi_import_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      success("Đã tải xuống file Excel chứa các dòng lỗi");
    } catch (err: any) {
      error(err.message || "Lỗi tải file lỗi");
    } finally {
      setIsDownloadingErrors(false);
    }
  };

  // Xác nhận thực thi import các dòng hợp lệ
  const handleConfirmImport = async () => {
    if (!validationResult || validationResult.validTickets.length === 0) {
      return warning("Không có dòng dữ liệu hợp lệ để import");
    }

    setIsExecuting(true);
    try {
      const res = await fetch("/api/v1/support-tickets/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickets: validationResult.validTickets,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Import dữ liệu thất bại");
      }

      setImportResult(json.data);
      success(`Nhập thành công ${json.data.successCount} ca hỗ trợ`);
      onSuccess(); // Refresh danh sách bên ngoài
    } catch (err: any) {
      console.error(err);
      error(err.message || "Lỗi lưu dữ liệu ca hỗ trợ");
    } finally {
      setIsExecuting(false);
    }
  };

  // Danh sách các cột lỗi độc nhất để lọc
  const uniqueErrorCols = validationResult
    ? Array.from(new Set(validationResult.errors.map((e) => e.column)))
    : [];

  const filteredErrors = validationResult
    ? validationResult.errors.filter(
        (e) => filterErrorCol === "ALL" || e.column === filterErrorCol
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2457A7]/10 flex items-center justify-center text-[#2457A7]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Import ca hỗ trợ
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Excel .xlsx
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhập hàng loạt dữ liệu ghi nhận ca hỗ trợ từ file Excel chuẩn hóa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
              className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Tải file mẫu Excel chuẩn để nhập liệu"
            >
              {isDownloadingTemplate ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2457A7]" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#2457A7]" />
              )}
              <span>Tải file Excel mẫu</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isExecuting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Màn hình kết quả sau khi Import thành công */}
          {importResult ? (
            <div className="space-y-6 py-4 animate-in fade-in-50">
              <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-emerald-900">
                  Import ca hỗ trợ thành công!
                </h3>
                <p className="text-sm text-emerald-700 mt-1">
                  Đã ghi nhận thành công <strong>{importResult.successCount}</strong> ca hỗ trợ vào cơ sở dữ liệu.
                </p>
                {importResult.batchCode && (
                  <div className="mt-2 text-xs text-slate-500 font-mono">
                    Mã đợt import: <span className="font-semibold text-slate-700">{importResult.batchCode}</span>
                  </div>
                )}
                {validationResult && validationResult.errorRowsCount > 0 && (
                  <p className="text-xs text-amber-700 mt-2 bg-amber-50 inline-block px-3 py-1 rounded-md border border-amber-200">
                    Lưu ý: Có {validationResult.errorRowsCount} dòng bị lỗi đã được bỏ qua. Bạn có thể tải file lỗi bên dưới để sửa và import lại.
                  </p>
                )}
              </div>

              {/* Danh sách các mã ca vừa tạo */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Mã ca hỗ trợ được cấp phát tự động ({importResult.createdTicketCodes.length})
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 bg-white rounded border border-slate-200">
                  {importResult.createdTicketCodes.map((code) => (
                    <span
                      key={code}
                      className="px-2 py-0.5 rounded bg-blue-50 text-[#2457A7] border border-blue-200 text-xs font-mono font-medium"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Khu vực Chọn & Kéo thả file */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative border-2 border-dashed rounded-xl p-6 transition-all text-center ${
                  isDragging
                    ? "border-[#2457A7] bg-blue-50/50 scale-[0.99]"
                    : "border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-400"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleAnalyzeFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  id="excel-file-upload"
                />

                <div className="flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100/70 text-[#2457A7] flex items-center justify-center mb-3 shadow-2xs">
                    <Upload className="w-6 h-6" />
                  </div>

                  <h3 className="text-sm font-semibold text-slate-800">
                    {selectedFile ? selectedFile.name : "Kéo & thả file Excel vào đây hoặc"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 mb-3">
                    Định dạng hỗ trợ: <strong>.xlsx</strong> (Dung lượng tối đa 10MB, tối đa 1.000 dòng/lần)
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <label
                      htmlFor="excel-file-upload"
                      className="px-3.5 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-medium cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{selectedFile ? "Chọn file khác" : "Chọn file từ máy tính"}</span>
                    </label>

                    {selectedFile && (
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Xóa file
                      </button>
                    )}
                  </div>
                </div>

                {isAnalyzing && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs rounded-xl flex items-center justify-center gap-2.5 text-[#2457A7] text-xs font-medium">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang đọc cấu trúc và kiểm tra dữ liệu từ file Excel...</span>
                  </div>
                )}
              </div>

              {/* Lỗi cấu trúc file (Nếu có) */}
              {validationResult?.hasStructureError && (
                <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                      Lỗi cấu trúc file Excel
                    </h4>
                    <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                      {validationResult.structureErrorMessage}
                    </p>
                    <p className="text-[11px] text-rose-600 mt-2">
                      Vui lòng bấm nút <strong>"Tải file Excel mẫu"</strong> ở góc trên bên phải để so sánh tên và thứ tự cột chuẩn.
                    </p>
                  </div>
                </div>
              )}

              {/* Kết quả kiểm tra dữ liệu (Metric Cards theo mockup mục 6) */}
              {validationResult && !validationResult.hasStructureError && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                      Kết quả kiểm tra dữ liệu
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Tổng dòng */}
                      <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 shadow-2xs">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Tổng dòng
                        </div>
                        <div className="text-2xl font-bold text-slate-800 mt-0.5">
                          {validationResult.totalRows}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Dữ liệu trong sheet</div>
                      </div>

                      {/* Hợp lệ */}
                      <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/70 shadow-2xs">
                        <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Hợp lệ
                        </div>
                        <div className="text-2xl font-bold text-emerald-800 mt-0.5">
                          {validationResult.validRowsCount}
                        </div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">Sẵn sàng ghi nhận</div>
                      </div>

                      {/* Có lỗi */}
                      <div className={`p-3.5 rounded-lg border shadow-2xs ${
                        validationResult.errorRowsCount > 0
                          ? "border-rose-200 bg-rose-50/70"
                          : "border-slate-200 bg-slate-50"
                      }`}>
                        <div className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                          validationResult.errorRowsCount > 0 ? "text-rose-700" : "text-slate-500"
                        }`}>
                          <AlertCircle className="w-3.5 h-3.5" />
                          Có lỗi
                        </div>
                        <div className={`text-2xl font-bold mt-0.5 ${
                          validationResult.errorRowsCount > 0 ? "text-rose-800" : "text-slate-700"
                        }`}>
                          {validationResult.errorRowsCount}
                        </div>
                        <div className={`text-[11px] mt-0.5 ${
                          validationResult.errorRowsCount > 0 ? "text-rose-600" : "text-slate-400"
                        }`}>
                          Cần sửa để import
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabs: Danh sách lỗi & Xem trước hợp lệ */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <div className="flex items-center justify-between px-3 pt-2 border-b border-slate-200 bg-slate-50/80">
                      <div className="flex items-center gap-2">
                        {validationResult.errorRowsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveTab("errors")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border-b-2 transition-colors flex items-center gap-1.5 ${
                              activeTab === "errors"
                                ? "border-rose-600 text-rose-700 bg-white"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Dòng lỗi ({validationResult.errorRowsCount})</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveTab("preview")}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border-b-2 transition-colors flex items-center gap-1.5 ${
                            activeTab === "preview"
                              ? "border-[#2457A7] text-[#2457A7] bg-white"
                              : "border-transparent text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Dòng hợp lệ ({validationResult.validRowsCount})</span>
                        </button>
                      </div>

                      {activeTab === "errors" && uniqueErrorCols.length > 1 && (
                        <div className="pb-1.5 flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">Lọc cột:</span>
                          <select
                            value={filterErrorCol}
                            onChange={(e) => setFilterErrorCol(e.target.value)}
                            className="text-xs px-2 py-0.5 border border-slate-300 rounded bg-white text-slate-700"
                          >
                            <option value="ALL">Tất cả cột lỗi</option>
                            {uniqueErrorCols.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Nội dung Tab Lỗi */}
                    {activeTab === "errors" && validationResult.errors.length > 0 && (
                      <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 w-16">Dòng Excel</th>
                              <th className="px-3 py-2 w-36">Tên cột</th>
                              <th className="px-3 py-2 w-48">Giá trị hiện tại</th>
                              <th className="px-3 py-2">Nội dung lỗi chi tiết</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredErrors.map((err, idx) => (
                              <tr key={idx} className="hover:bg-rose-50/30 transition-colors">
                                <td className="px-3 py-2 font-mono font-bold text-rose-700">
                                  Dòng {err.rowNumber}
                                </td>
                                <td className="px-3 py-2 font-medium text-slate-800">
                                  {err.column}
                                </td>
                                <td className="px-3 py-2 font-mono text-slate-600 truncate max-w-xs">
                                  {err.currentValue || <em className="text-slate-400">Trống</em>}
                                </td>
                                <td className="px-3 py-2 text-rose-700 font-medium">
                                  {err.message}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Nội dung Tab Xem trước hợp lệ */}
                    {activeTab === "preview" && (
                      <div className="max-h-72 overflow-y-auto">
                        {validationResult.validTickets.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400">
                            Chưa có dòng nào hợp lệ để hiển thị
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 w-14">Dòng</th>
                                <th className="px-3 py-2">Dự án</th>
                                <th className="px-3 py-2">Người yêu cầu</th>
                                <th className="px-3 py-2">Nghiệp vụ</th>
                                <th className="px-3 py-2">Phương thức</th>
                                <th className="px-3 py-2">Mốc thời gian</th>
                                <th className="px-3 py-2">Thời gian xử lý</th>
                                <th className="px-3 py-2">Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {validationResult.validTickets.map((t, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="px-3 py-2 font-mono text-slate-500">
                                    #{t.rowNumber}
                                  </td>
                                  <td className="px-3 py-2 font-medium text-slate-800 max-w-xs truncate" title={t.projectName}>
                                    {t.projectName}
                                  </td>
                                  <td className="px-3 py-2 text-slate-700 font-medium">
                                    {t.requesterName}
                                  </td>
                                  <td className="px-3 py-2 text-slate-600">
                                    {t.businessName}
                                  </td>
                                  <td className="px-3 py-2 text-slate-500 text-[11px]">
                                    {t.supportMethodNames.join(", ")}
                                  </td>
                                  <td className="px-3 py-2 text-slate-600 text-[11px] whitespace-nowrap">
                                    <div>Gửi: {new Date(t.sentAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</div>
                                    <div>Nhận: {new Date(t.receivedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</div>
                                  </td>
                                  <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                                    {t.processingMinutes !== null ? (
                                      <div>
                                        <span className="font-semibold">{t.processingMinutes} phút</span>
                                        <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                          {t.timeGroupName}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic">Chưa chốt</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                                        t.status === "COMPLETED"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                      }`}
                                    >
                                      {t.status === "COMPLETED" ? "Hoàn thành" : "Đang xử lý"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer (Các nút theo đúng mockup mục 6) */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            {validationResult && validationResult.errorRowsCount > 0 && !importResult && (
              <button
                type="button"
                onClick={handleDownloadErrors}
                disabled={isDownloadingErrors}
                className="px-3 py-1.5 rounded-md border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-medium shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDownloadingErrors ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-rose-600" />
                )}
                <span>Tải file lỗi để sửa ({validationResult.errorRowsCount} dòng)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isExecuting}
              className="px-4 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {importResult ? "Đóng" : "Hủy"}
            </button>

            {!importResult && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={
                  isExecuting ||
                  isAnalyzing ||
                  !validationResult ||
                  validationResult.hasStructureError ||
                  validationResult.validRowsCount === 0
                }
                className="px-4 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-medium shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu dữ liệu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Xác nhận import{" "}
                      {validationResult && validationResult.validRowsCount > 0
                        ? `(${validationResult.validRowsCount} ca)`
                        : ""}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
