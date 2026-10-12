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
  const { success, error } = useToast();
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

    setFileName(file.name);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (rawData.length === 0) {
          error("File Excel không có dữ liệu.");
          handleResetFile();
          return;
        }

        const valid: any[] = [];
        const invalid: { row: any; index: number; errors: string[] }[] = [];

        rawData.forEach((rawRow, idx) => {
          const row: Record<string, any> = {};

          columns.forEach((col) => {
            const exactVal = rawRow[col.label] ?? rawRow[col.key];
            if (exactVal !== undefined && exactVal !== "") {
              row[col.key] = exactVal;
            } else {
              const matchedKey = Object.keys(rawRow).find(
                (k) =>
                  k.trim().toLowerCase() === col.label.trim().toLowerCase() ||
                  k.trim().toLowerCase() === col.key.trim().toLowerCase()
              );
              if (matchedKey) {
                row[col.key] = rawRow[matchedKey];
              }
            }
          });

          const isRowCompletelyEmpty = Object.values(row).every(
            (v) => v === undefined || v === null || String(v).trim() === ""
          );
          if (isRowCompletelyEmpty) {
            return;
          }

          const rowErrors: string[] = [];
          columns.forEach((col) => {
            if (col.required) {
              const val = row[col.key];
              if (val === undefined || val === null || String(val).trim() === "") {
                rowErrors.push(`Thiếu "${col.label}"`);
              }
            }
          });

          if (rowErrors.length > 0) {
            invalid.push({ row, index: idx + 1, errors: rowErrors });
          } else {
            valid.push(row);
          }
        });

        setParsedRows(rawData);
        setValidRows(valid);
        setInvalidRows(invalid);

        if (valid.length === 0 && invalid.length > 0) {
          error(`Tất cả ${invalid.length} dòng dữ liệu đều thiếu thông tin bắt buộc.`);
        } else {
          success(`Đã nạp file: ${valid.length} dòng hợp lệ, ${invalid.length} dòng cảnh báo.`);
        }
      } catch (err) {
        console.error(err);
        error("Không thể đọc định dạng file Excel. Vui lòng kiểm tra lại file.");
        handleResetFile();
      } finally {
        setLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleResetFile = () => {
    setFileName(null);
    setParsedRows([]);
    setValidRows([]);
    setInvalidRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExecuteImport = async () => {
    if (validRows.length === 0) {
      error("Không có dòng dữ liệu hợp lệ để nhập.");
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
      <div className="space-y-4 text-xs">
        {/* Template Download and File Dropzone */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>File mẫu chuẩn hóa</span>
            </div>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Tải file Excel mẫu có sẵn tiêu đề cột chuẩn để chuẩn bị dữ liệu chính xác.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tải file Excel mẫu</span>
          </button>
        </div>

        {/* Upload Zone */}
        {!fileName ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-lg p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/30 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="font-bold text-xs text-slate-800">
              Bấm để chọn file Excel hoặc kéo thả file vào đây
            </div>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Hỗ trợ định dạng .xlsx, .xls, .csv (Tối đa 1.000 dòng/lần)
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-800 text-xs">{fileName}</div>
                <div className="flex items-center gap-2 text-[11px] mt-0.5">
                  <span className="text-slate-500">Tổng số: <strong>{parsedRows.length}</strong> dòng</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-emerald-700 font-medium">Hợp lệ: {validRows.length} dòng</span>
                  {invalidRows.length > 0 && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-rose-700 font-medium">Lỗi: {invalidRows.length} dòng</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetFile}
              className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition-colors"
              title="Đổi file khác"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-6 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Đang đọc và kiểm tra dữ liệu file Excel...</span>
          </div>
        )}

        {/* Preview Grid */}
        {parsedRows.length > 0 && !loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>Bản xem trước dữ liệu (Tối đa 15 dòng đầu):</span>
              <span className="text-emerald-700 font-semibold">{validRows.length} dòng sẵn sàng nạp</span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto bg-white">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Tình trạng</th>
                    {columns.map((c) => (
                      <th key={c.key} className="py-2 px-3">
                        {c.label} {c.required && <span className="text-rose-500">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {parsedRows.slice(0, 15).map((row, idx) => {
                    const rowError = invalidRows.find((ir) => ir.index === idx + 1);

                    return (
                      <tr
                        key={idx}
                        className={rowError ? "bg-rose-50/60 text-rose-900" : "hover:bg-slate-50"}
                      >
                        <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {rowError ? (
                            <span
                              className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-rose-100 text-rose-700 border border-rose-200"
                              title={rowError.errors.join(", ")}
                            >
                              {rowError.errors[0]}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Hợp lệ
                            </span>
                          )}
                        </td>
                        {columns.map((c) => (
                          <td key={c.key} className="py-2 px-3 max-w-[180px] truncate">
                            {row[c.key] || <span className="text-slate-400">—</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {invalidRows.length > 0 && (
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Hệ thống tìm thấy <strong>{invalidRows.length}</strong> dòng thiếu thông tin bắt buộc. Khi bấm "Xác nhận Import", hệ thống sẽ <strong>chỉ nạp {validRows.length} dòng hợp lệ</strong> và tự động bỏ qua các dòng lỗi.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={() => {
              handleResetFile();
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={validRows.length === 0 || importing}
            onClick={handleExecuteImport}
            className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 shadow-xs"
          >
            {importing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang nhập dữ liệu...</span>
              </>
            ) : (
              <>
                <FileCheck className="w-3.5 h-3.5" />
                <span>Xác nhận Import ({validRows.length} bản ghi)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
