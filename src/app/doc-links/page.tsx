"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import {
  FileText,
  Search,
  Plus,
  ExternalLink,
  Copy,
  Check,
  Edit2,
  Trash2,
  AlertTriangle,
  FolderOpen,
  Filter,
  FileSpreadsheet,
  HardDrive,
  Globe,
  Sparkles,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { parseUrlInfo } from "@/lib/url-parser";
import { ExcelImportModal, ColumnDefinition } from "@/components/ExcelImportModal";

export default function DocLinksPage() {
  const { success, error, info } = useToast();
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [detectedCategory, setDetectedCategory] = useState("other");
  const [saving, setSaving] = useState(false);

  // Duplicate Warning Modal state
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Excel Import Modal state
  const [importModalOpen, setImportModalOpen] = useState(false);

  const docLinkExcelColumns: ColumnDefinition[] = [
    { key: "title", label: "Tên tài liệu", required: true, example: "Tài liệu Quy trình Vận hành HIS Bệnh viện" },
    { key: "targetUrl", label: "Đường dẫn URL", required: true, example: "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit" },
    { key: "tags", label: "Tags phân loại", example: "Quy trình, HIS, Kỹ thuật" },
    { key: "description", label: "Mô tả chi tiết", example: "Tài liệu hướng dẫn trực ca kỹ thuật L1" },
  ];

  const sampleDocLinkData = [
    {
      "Tên tài liệu": "Tài liệu Quy trình Vận hành HIS Bệnh viện",
      "Đường dẫn URL": "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
      "Tags phân loại": "Quy trình, HIS, Kỹ thuật",
      "Mô tả chi tiết": "Tài liệu hướng dẫn trực ca kỹ thuật L1",
    },
    {
      "Tên tài liệu": "Kế hoạch Phân bổ Nhân sự & Sprint Roadmap",
      "Đường dẫn URL": "https://docs.google.com/spreadsheets/d/154m98C-D1L-07W6W1V2V3T4_SampleSpreadsheetId/edit",
      "Tags phân loại": "Kế hoạch, PMO, Sprint",
      "Mô tả chi tiết": "Bảng theo dõi tiến độ công việc theo tuần",
    },
  ];

  const handleImportDocLinks = async (items: any[]) => {
    const res = await fetch("/api/doc-links/import", {
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

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (category && category !== "all") params.set("category", category);

      const res = await fetch(`/api/doc-links?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setLinks(json.data);
      }
    } catch (err) {
      console.error(err);
      error("Lỗi khi tải danh sách link tài liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchLinks();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, category]);

  // When typing URL in modal, live-detect category
  useEffect(() => {
    if (targetUrl) {
      const parsed = parseUrlInfo(targetUrl);
      setDetectedCategory(parsed.category);
    } else {
      setDetectedCategory("other");
    }
  }, [targetUrl]);

  const openAddModal = () => {
    setEditingLink(null);
    setTitle("");
    setTargetUrl("");
    setDescription("");
    setTagsInput("");
    setDuplicateWarning(null);
    setModalOpen(true);
  };

  const openEditModal = (link: any) => {
    setEditingLink(link);
    setTitle(link.title);
    setTargetUrl(link.targetUrl);
    setDescription(link.description || "");
    try {
      const tagsArr = JSON.parse(link.tags || "[]");
      setTagsInput(tagsArr.join(", "));
    } catch {
      setTagsInput("");
    }
    setDuplicateWarning(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent, forceDuplicate = false) => {
    if (e) e.preventDefault();
    if (!title.trim() || !targetUrl.trim()) {
      error("Vui lòng nhập tên tài liệu và đường dẫn URL.");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const url = editingLink ? `/api/doc-links/${editingLink.id}` : "/api/doc-links";
      const method = editingLink ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          targetUrl,
          description,
          tags,
          forceDuplicate,
        }),
      });

      const json = await res.json();

      // Check if duplicate warning (MSG-31)
      if (res.status === 409 && json.warning) {
        setDuplicateWarning(json.warning.message);
        setSaving(false);
        return;
      }

      if (!res.ok || !json.success) {
        error(json.error?.message || "Lỗi lưu tài liệu.");
        setSaving(false);
        return;
      }

      success(editingLink ? "Cập nhật link tài liệu thành công!" : "Thêm mới link tài liệu thành công!");
      setModalOpen(false);
      setDuplicateWarning(null);
      fetchLinks();
    } catch {
      error("Lỗi khi kết nối đến máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, titleName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa link "${titleName}" không?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/doc-links/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        success("Đã xóa link tài liệu thành công.");
        fetchLinks();
      } else {
        error(json.error?.message || "Lỗi xóa tài liệu.");
      }
    } catch {
      error("Lỗi khi gửi yêu cầu xóa.");
    }
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    success("Đã sao chép link tài liệu vào bộ nhớ tạm!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "docs":
        return (
          <span className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </span>
        );
      case "sheets":
        return (
          <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </span>
        );
      case "drive":
        return (
          <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <HardDrive className="w-4 h-4" />
          </span>
        );
      default:
        return (
          <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4" />
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#060913] bg-cyber-grid">
      <Header
        title="Kho Tài liệu Số (Google Docs & Sheets Hub)"
        subtitle="Quản lý tập trung liên kết Docs, Sheets, Drive, tự động bóc tách File ID và kiểm tra trùng lặp"
        actionButton={
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
              <span>Thêm Link mới</span>
            </button>
          </div>
        }
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl backdrop-blur-xl">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, link, tag, ghi chú..."
              className="w-full px-4 py-2.5 pl-10 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto w-full sm:w-auto">
            {[
              { id: "all", label: "Tất cả" },
              { id: "docs", label: "Google Docs" },
              { id: "sheets", label: "Google Sheets" },
              { id: "drive", label: "Drive" },
              { id: "other", label: "Khác" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategory(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  category === tab.id
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Links Table */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800/80 overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-5">Tên Tài liệu & Mô tả</th>
                  <th className="py-4 px-4">Đường dẫn URL</th>
                  <th className="py-4 px-4">Tags phân loại</th>
                  <th className="py-4 px-4">Người tạo</th>
                  <th className="py-4 px-4">Ngày tạo</th>
                  <th className="py-4 px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-500 text-xs">
                      Đang tải danh sách tài liệu...
                    </td>
                  </tr>
                ) : links.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-500 text-xs">
                      Không tìm thấy tài liệu nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  links.map((link) => {
                    let parsedTags: string[] = [];
                    try {
                      parsedTags = JSON.parse(link.tags || "[]");
                    } catch {}

                    return (
                      <tr key={link.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            {getCategoryBadge(link.linkCategory)}
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                                {link.title}
                              </div>
                              {link.description && (
                                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-sm">
                                  {link.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 font-mono text-cyan-300 max-w-xs truncate text-[11px]">
                          {link.targetUrl}
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {parsedTags.length > 0 ? (
                              parsedTags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700/80"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-slate-400 font-medium">
                          {link.createdByUser?.staff?.fullName || link.createdByUser?.username || "—"}
                        </td>

                        <td className="py-4 px-4 text-slate-500 font-mono text-[11px]">
                          {formatDate(link.createdAt)}
                        </td>

                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopy(link.targetUrl, link.id)}
                              className="p-2 rounded-xl bg-slate-950/70 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition-all"
                              title="Sao chép link tài liệu"
                            >
                              {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <a
                              href={link.targetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 transition-all"
                              title="Mở tài liệu trên tab mới"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => openEditModal(link)}
                              className="p-2 rounded-xl bg-slate-950/70 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition-all"
                              title="Sửa thông tin"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(link.id, link.title)}
                              className="p-2 rounded-xl bg-slate-950/70 hover:bg-rose-600/80 text-slate-400 hover:text-white border border-slate-800 hover:border-rose-500 transition-all"
                              title="Xóa link tài liệu"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Link Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLink ? "Chỉnh sửa Link Tài liệu" : "Thêm mới Link Tài liệu"}
        subtitle="Hệ thống tự động phát hiện Google Docs, Sheets, Drive và trích xuất File ID"
        maxWidth="max-w-xl"
      >
        <form onSubmit={(e) => handleSave(e, false)} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tên Tài liệu <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Kế hoạch Triển khai Bệnh viện Quốc tế Q4..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Đường dẫn URL <span className="text-rose-400">*</span></span>
              {detectedCategory !== "other" && (
                <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Đã nhận diện: {detectedCategory}
                </span>
              )}
            </label>
            <input
              type="url"
              required
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://docs.google.com/document/d/... hoặc https://docs.google.com/spreadsheets/d/..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
            />
          </div>

          {/* Duplicate Warning Prompt */}
          {duplicateWarning && (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Cảnh báo Trùng lặp (BR-04):</strong> {duplicateWarning}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs"
                >
                  Kiểm tra lại link
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSave(e, true)}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Vẫn tiếp tục lưu link
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tags phân loại (Phân cách bởi dấu phẩy)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="HIS, Kỹ thuật, BHYT, Sprint 4..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Mô tả chi tiết / Ghi chú
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú nội dung tài liệu, phân quyền truy cập Google..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none shadow-inner"
            />
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
              {saving ? "Đang lưu..." : editingLink ? "Lưu thay đổi" : "Lưu vào Kho Link"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Nhập Danh sách Link Tài liệu từ Excel"
        subtitle="Hỗ trợ nạp hàng loạt link Google Docs, Sheets, Drive và tự động gán tags"
        columns={docLinkExcelColumns}
        sampleData={sampleDocLinkData}
        templateFileName="mau_import_tai_lieu.xlsx"
        onImport={handleImportDocLinks}
        onSuccess={fetchLinks}
      />
    </div>
  );
}
