"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileCheck,
  Loader2,
  Trash2,
} from "lucide-react";

export interface ColumnDefinition {
  key: string;
  label: string;
  required?: boolean;
  example: string;
}

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  columns: ColumnDefinition[];
  sampleData: Record<string, any>[];
  templateFileName: string;
  onImport: (items: any[]) => Promise<{ success: boolean; message: string; count?: number }>;
  onSuccess: () => void;
}

export function ExcelImportModal({
  isOpen,
  onClose,
  title,
  subtitle,
  columns,
  sampleData,
  templateFileName,
  onImport,
  onSuccess,
}: ExcelImportModalProps) {
  const { success, error, toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validRows, setValidRows] = useState<any[]>([]);
  const [invalidRows, setInvalidRows] = useState<{ row: any; index: number; errors: string[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleDownloadTemplate = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Dữ liệu mẫu");

      // Auto-size columns
      const colWidths = columns.map((col) => ({
        wch: Math.max(col.label.length, col.example.length, 18),
      }));
      worksheet["!cols"] = colWidths;

      XLSX.writeFile(workbook, templateFileName);
      success(`Đã tải xuống file mẫu: ${templateFileName}`);
    } catch (err) {
      console.error(err);
      error("Lỗi khi tạo file Excel mẫu.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setLoading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!rawJson || rawJson.length === 0) {
          error("File Excel không có dữ liệu nào.");
          setLoading(false);
          return;
        }

        // Map column labels or keys flexibly
        const mappedRows: any[] = [];
        const valids: any[] = [];
        const invalids: { row: any; index: number; errors: string[] }[] = [];

        // Build a normalized row key mapping
        rawJson.forEach((row, idx) => {
          // Check if row is completely empty
          const rowValues = Object.values(row).filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
          if (rowValues.length === 0) {
            return; // Skip blank rows
          }

          const normalizedRow: Record<string, any> = {};
          Object.keys(row).forEach((k) => {
            normalizedRow[k.trim().toLowerCase()] = row[k];
          });

          const item: Record<string, any> = {};
          const rowErrors: string[] = [];

          columns.forEach((col) => {
            const labelNorm = col.label.trim().toLowerCase();
            const keyNorm = col.key.trim().toLowerCase();

            // Match by normalized label or key or exact row key
            const val =
              row[col.label] !== undefined
                ? row[col.label]
                : row[col.key] !== undefined
                ? row[col.key]
                : normalizedRow[labelNorm] !== undefined
                ? normalizedRow[labelNorm]
                : normalizedRow[keyNorm];

            if (val !== undefined && val !== null) {
              if (val instanceof Date && !isNaN(val.getTime())) {
                const y = val.getFullYear();
                const m = String(val.getMonth() + 1).padStart(2, "0");
                const d = String(val.getDate()).padStart(2, "0");
                item[col.key] = `${y}-${m}-${d}`;
              } else {
                item[col.key] = String(val).trim();
              }
            } else {
              item[col.key] = "";
            }

            if (col.required && (!item[col.key] || item[col.key] === "")) {
              rowErrors.push(`Thiếu "${col.label}"`);
            }
          });

          mappedRows.push(item);
          if (rowErrors.length === 0) {
            valids.push(item);
          } else {
            invalids.push({ row: item, index: idx + 1, errors: rowErrors });
          }
        });

        if (mappedRows.length === 0) {
          error("File Excel không chứa dòng dữ liệu hợp lệ nào (chỉ có dòng trống).");
          setLoading(false);
          return;
        }

        setParsedRows(mappedRows);
        setValidRows(valids);
        setInvalidRows(invalids);
        setLoading(false);
      } catch (err) {
        console.error(err);
        error("Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.");
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleResetFile = () => {
    setFileName(null);
    setParsedRows([]);
    setValidRows([]);
    setInvalidRows([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExecuteImport = async () => {
    if (validRows.length === 0) {
      error("Không có dòng dữ liệu hợp lệ nào để import.");
      return;
    }

    setImporting(true);
    try {
      const res = await onImport(validRows);
      if (res.success) {
        success(res.message);
        handleResetFile();
        onClose();
        onSuccess();
      } else {
        error(res.message || "Lỗi khi nhập dữ liệu từ Excel.");
      }
    } catch {
      error("Lỗi khi kết nối đến máy chủ.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleResetFile();
        onClose();
      }}
      title={title}
      subtitle={subtitle || "Nhập dữ liệu hàng loạt từ file bảng tính Excel (.xlsx, .xls, .csv)"}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5 text-xs">
        {/* Template Download and File Dropzone */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div>
            <div className="font-bold text-white text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>File mẫu chuẩn hóa</span>
            </div>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Tải file Excel mẫu có sẵn tiêu đề cột chuẩn để điền dữ liệu chính xác nhất.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-md"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tải file Excel mẫu</span>
          </button>
        </div>

        {/* Upload Zone */}
        {!fileName ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-blue-500/80 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-blue-950/10 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="font-bold text-sm text-white">
              Bấm để chọn file Excel hoặc kéo thả file vào đây
            </div>
            <p className="text-slate-500 text-[11px] mt-1">
              Hỗ trợ các định dạng .xlsx, .xls, .csv (Tối đa 1.000 dòng/lần)
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white text-sm">{fileName}</div>
                <div className="flex items-center gap-3 text-[11px] mt-0.5">
                  <span className="text-slate-400">Tổng số: <strong>{parsedRows.length}</strong> dòng</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">Hợp lệ: {validRows.length} dòng</span>
                  {invalidRows.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-rose-400 font-semibold">Lỗi: {invalidRows.length} dòng</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetFile}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white transition-colors"
              title="Đổi file khác"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span>Đang đọc và kiểm tra dữ liệu file Excel...</span>
          </div>
        )}

        {/* Preview Grid */}
        {parsedRows.length > 0 && !loading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span>Bản xem trước dữ liệu (Hiển thị tối đa 15 dòng đầu):</span>
              <span className="text-emerald-400 font-bold">{validRows.length} dòng sẵn sàng nạp</span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 sticky top-0 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Tình trạng</th>
                    {columns.map((c) => (
                      <th key={c.key} className="py-2.5 px-3">
                        {c.label} {c.required && <span className="text-rose-400">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {parsedRows.slice(0, 15).map((row, idx) => {
                    const rowError = invalidRows.find((ir) => ir.index === idx + 1);

                    return (
                      <tr
                        key={idx}
                        className={rowError ? "bg-rose-950/20 text-rose-200" : "hover:bg-slate-900"}
                      >
                        <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {rowError ? (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              title={rowError.errors.join(", ")}
                            >
                              {rowError.errors[0]}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-3 h-3" />
                              Hợp lệ
                            </span>
                          )}
                        </td>
                        {columns.map((c) => (
                          <td key={c.key} className="py-2 px-3 max-w-[180px] truncate">
                            {row[c.key] || <span className="text-slate-600">—</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {invalidRows.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  Hệ thống tìm thấy <strong>{invalidRows.length}</strong> dòng thiếu thông tin bắt buộc. Khi bấm "Xác nhận Import", hệ thống sẽ <strong>chỉ nạp {validRows.length} dòng hợp lệ</strong> và tự động bỏ qua các dòng lỗi.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              handleResetFile();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-medium"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={validRows.length === 0 || importing}
            onClick={handleExecuteImport}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang nhập dữ liệu...</span>
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                <span>Xác nhận Import ({validRows.length} bản ghi)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
