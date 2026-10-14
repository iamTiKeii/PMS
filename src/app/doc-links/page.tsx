"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialogProvider";
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
  Loader2,
  Tag,
  X,
  Link2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { parseUrlInfo, normalizeUrl, isValidUrl } from "@/lib/url-parser";
import { ExcelImportModal, ColumnDefinition } from "@/components/ExcelImportModal";
import { Pagination, usePagination } from "@/components/Pagination";
import { TableRowSkeleton } from "@/components/Skeleton";

const SUGGESTED_TAGS = [
  "Quy trình",
  "Kế hoạch",
  "Báo cáo",
  "HIS",
  "Kỹ thuật",
  "BHYT",
  "Triển khai",
  "Vận hành",
  "Biểu mẫu",
  "Đào tạo",
];

const CATEGORY_OPTIONS = [
  { id: "docs", label: "Google Docs", icon: FileText, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { id: "sheets", label: "Google Sheets", icon: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { id: "drive", label: "Google Drive", icon: HardDrive, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { id: "other", label: "Khác / Web", icon: Globe, color: "text-slate-600 bg-slate-50 border-slate-200" },
];

export default function DocLinksPage() {
  const { success, error, info } = useToast();
  const { confirm } = useConfirm();
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination hook
  const {
    page: linkPage,
    offset: linkOffset,
    goToPage: setLinkPage,
  } = usePagination({
    totalItems: links.length,
    pageSize: 15,
    filterDeps: [search, category],
  });

  const paginatedLinks = links.slice(linkOffset, linkOffset + 15);

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("docs");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [detectedCategory, setDetectedCategory] = useState<string>("other");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isFetchingTitle, setIsFetchingTitle] = useState(false);
  const [saving, setSaving] = useState(false);

  // Duplicate Warning state (BR-04, BR-09)
  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);

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
      if (!isCustomCategory) {
        setSelectedCategory(parsed.category);
      }
    } else {
      setDetectedCategory("other");
      if (!isCustomCategory) {
        setSelectedCategory("docs");
      }
    }
  }, [targetUrl, isCustomCategory]);

  const openAddModal = () => {
    setEditingLink(null);
    setTitle("");
    setTargetUrl("");
    setSelectedCategory("docs");
    setIsCustomCategory(false);
    setDetectedCategory("other");
    setDescription("");
    setTags([]);
    setTagInput("");
    setDuplicateWarning(null);
    setModalOpen(true);
  };

  const openEditModal = (link: any) => {
    setEditingLink(link);
    setTitle(link.title);
    setTargetUrl(link.targetUrl);
    setSelectedCategory(link.linkCategory || "other");
    setIsCustomCategory(true);
    setDetectedCategory(link.linkCategory || "other");
    setDescription(link.description || "");
    try {
      const tagsArr = JSON.parse(link.tags || "[]");
      setTags(Array.isArray(tagsArr) ? tagsArr : []);
    } catch {
      setTags([]);
    }
    setTagInput("");
    setDuplicateWarning(null);
    setModalOpen(true);
  };

  // Tự động quét & lấy tiêu đề tài liệu từ URL
  const handleFetchTitle = async (urlToFetch?: string) => {
    const raw = (urlToFetch || targetUrl).trim();
    if (!raw) {
      error("Vui lòng nhập đường dẫn URL trước khi lấy tiêu đề.");
      return;
    }
    const normalized = normalizeUrl(raw);
    setTargetUrl(normalized);

    setIsFetchingTitle(true);
    try {
      const res = await fetch("/api/doc-links/fetch-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.cleanUrl) {
          setTargetUrl(json.data.cleanUrl);
        }
        if (json.data.category && !isCustomCategory) {
          setSelectedCategory(json.data.category);
        }
        if (json.data.title) {
          setTitle(json.data.title);
          success(`Đã tự động nhận diện tiêu đề: "${json.data.title}"`);
        } else {
          info("Không trích xuất được tiêu đề tự động. Vui lòng tự nhập tên gợi nhớ.");
        }
      } else {
        info("Không lấy được tiêu đề tự động từ link này.");
      }
    } catch (err) {
      console.warn("Lỗi fetch title:", err);
      info("Không thể kết nối lấy tiêu đề tự động.");
    } finally {
      setIsFetchingTitle(false);
    }
  };

  // Quản lý Tags dạng Chips
  const handleAddTag = (tagToAdd: string) => {
    const cleanTag = tagToAdd.trim().replace(/^,+|,+$/g, "");
    if (!cleanTag) return;
    if (!tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleToggleSuggestedTag = (suggested: string) => {
    if (tags.includes(suggested)) {
      handleRemoveTag(suggested);
    } else {
      setTags([...tags, suggested]);
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      handleRemoveTag(tags[tags.length - 1]);
    }
  };

  // Lưu link vào kho (Hỗ trợ Force Save khi có cảnh báo trùng lặp BR-04, MSG-31)
  const handleSave = async (e?: React.FormEvent, forceSave = false) => {
    if (e) e.preventDefault();
    if (!title.trim() || !targetUrl.trim()) {
      error("Vui lòng nhập tên tài liệu và đường dẫn URL.");
      return;
    }

    // Tự động gom tag đang gõ dở nếu user bấm submit trực tiếp
    const finalTags = [...tags];
    if (tagInput.trim()) {
      const pending = tagInput.trim().replace(/^,+|,+$/g, "");
      if (pending && !finalTags.includes(pending)) {
        finalTags.push(pending);
      }
    }

    setSaving(true);
    try {
      const url = editingLink ? `/api/doc-links/${editingLink.id}` : "/api/doc-links";
      const method = editingLink ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          targetUrl: normalizeUrl(targetUrl.trim()),
          category: selectedCategory,
          description: description.trim(),
          tags: finalTags,
          forceSave,
          forceDuplicate: forceSave,
        }),
      });

      const json = await res.json();

      // Xử lý Cảnh báo Trùng lặp (BR-04, MSG-31)
      if (res.status === 409 && (json.isDuplicateWarning || json.code === "MSG-31")) {
        setDuplicateWarning({
          message: json.message || "Tài liệu này đã tồn tại trong kho link.",
          existingLink: json.existingLink,
        });
        setSaving(false);
        return;
      }

      if (!res.ok || !json.success) {
        error(json.error?.message || "Lỗi lưu tài liệu.");
        setSaving(false);
        return;
      }

      success(editingLink ? "Cập nhật link tài liệu thành công!" : "Lưu vào Kho Link thành công!");
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
    const ok = await confirm({
      title: "Xóa liên kết tài liệu?",
      message: `Bạn có chắc chắn muốn xóa liên kết "${titleName}" không?`,
      confirmText: "Xóa liên kết",
      variant: "danger",
    });
    if (!ok) return;

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
          <span className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0" title="Google Docs">
            <FileText className="w-3.5 h-3.5" />
          </span>
        );
      case "sheets":
        return (
          <span className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0" title="Google Sheets">
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </span>
        );
      case "drive":
        return (
          <span className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0" title="Google Drive">
            <HardDrive className="w-3.5 h-3.5" />
          </span>
        );
      default:
        return (
          <span className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0" title="Khác">
            <Globe className="w-3.5 h-3.5" />
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen">
      <Header
        title="Kho Tài liệu Số"
        subtitle="Quản lý tập trung liên kết Google Docs, Sheets, Drive, tự động bóc tách File ID và kiểm tra trùng lặp"
        actionButton={
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
              className="px-3 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Link mới</span>
            </button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl w-full mx-auto">
        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg bg-white border border-[#DDE2E9] shadow-xs">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, link, tag, ghi chú..."
              className="w-full px-3 py-1.5 pl-9 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
            />
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-0.5 bg-[#F1F3F6] rounded-lg border border-[#DDE2E9]">
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
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors shrink-0 ${
                  category === tab.id
                    ? "bg-white text-[#2457A7] shadow-xs font-semibold"
                    : "text-[#64748B] hover:text-[#172033] hover:bg-[#E2E8F0]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Links Table */}
        <div className="rounded-lg bg-white border border-[#DDE2E9] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#DDE2E9] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Tên Tài liệu & Mô tả</th>
                  <th className="py-2.5 px-3">Đường dẫn URL</th>
                  <th className="py-2.5 px-3">Tags phân loại</th>
                  <th className="py-2.5 px-3">Người tạo</th>
                  <th className="py-2.5 px-3">Ngày tạo</th>
                  <th className="py-2.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF1F5] text-[#172033]">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRowSkeleton key={i} columns={6} />
                  ))
                ) : links.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#64748B] text-xs">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <FolderOpen className="w-8 h-8 text-[#94A3B8] mb-1" />
                        <span className="font-semibold text-[#172033]">Chưa có liên kết tài liệu nào</span>
                        <span className="text-[#64748B] max-w-sm">
                          {search || category !== "all"
                            ? "Không tìm thấy kết quả phù hợp với bộ lọc tìm kiếm."
                            : "Nhấn nút 'Thêm Link mới' để lưu trữ Google Docs, Sheets hoặc Drive."}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLinks.map((link) => {
                    let parsedTags: string[] = [];
                    try {
                      parsedTags = JSON.parse(link.tags || "[]");
                    } catch {}

                    return (
                      <tr key={link.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            {getCategoryBadge(link.linkCategory)}
                            <div className="min-w-0">
                              <a
                                href={link.targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-[#172033] hover:text-[#2457A7] transition-colors inline-flex items-center gap-1 group"
                              >
                                <span>{link.title}</span>
                                <ArrowUpRight className="w-3 h-3 text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                              {link.description && (
                                <div className="text-[11px] text-[#64748B] line-clamp-1 max-w-sm mt-0.5">
                                  {link.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 max-w-xs">
                          <a
                            href={link.targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[#2457A7] hover:underline truncate block text-[11px]"
                            title={link.targetUrl}
                          >
                            {link.targetUrl}
                          </a>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {parsedTags.length > 0 ? (
                              parsedTags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#F1F3F6] text-[#172033] border border-[#DDE2E9]"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-[#94A3B8]">—</span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-[#172033] font-medium">
                          {link.createdByUser?.staff?.fullName || link.createdByUser?.username || "—"}
                        </td>

                        <td className="py-2.5 px-3 text-[#64748B] text-[11px]">
                          {formatDate(link.createdAt)}
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopy(link.targetUrl, link.id)}
                              className="p-1.5 rounded hover:bg-[#F1F3F6] text-[#64748B] hover:text-[#172033] transition-colors"
                              title="Sao chép link tài liệu"
                            >
                              {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <a
                              href={link.targetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded hover:bg-[#F1F3F6] text-[#64748B] hover:text-[#2457A7] transition-colors"
                              title="Mở tài liệu trên tab mới"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => openEditModal(link)}
                              className="p-1.5 rounded hover:bg-[#F1F3F6] text-[#64748B] hover:text-[#172033] transition-colors"
                              title="Sửa thông tin"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(link.id, link.title)}
                              className="p-1.5 rounded hover:bg-[#FEF2F2] text-[#64748B] hover:text-[#B91C1C] transition-colors"
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

          {/* Accessible Pagination Landmark */}
          {links.length > 0 && (
            <Pagination
              currentPage={linkPage}
              totalItems={links.length}
              pageSize={15}
              onPageChange={setLinkPage}
              filterDeps={[search, category]}
              className="rounded-t-none border-x-0 border-b-0 border-t border-[#DDE2E9]"
            />
          )}
        </div>
      </div>

      {/* Add / Edit Link Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingLink ? "Chỉnh sửa Link Tài liệu" : "Thêm mới Link Tài liệu vào Kho"}
        subtitle={
          editingLink
            ? "Cập nhật thông tin tiêu đề, định dạng phân loại và nhãn tags"
            : "Hệ thống tự động phát hiện Google Docs, Sheets, Drive, trích xuất tiêu đề và kiểm tra trùng lặp"
        }
        maxWidth="max-w-xl"
      >
        <form onSubmit={(e) => handleSave(e, false)} className="space-y-4 text-xs">
          {/* 1. Đường dẫn URL (Ưu tiên nhập trước) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#172033] flex items-center gap-1">
                <span>Đường dẫn URL</span>
                <span className="text-rose-500">*</span>
              </label>

              <div className="flex items-center gap-2">
                {targetUrl.trim() && (
                  <a
                    href={normalizeUrl(targetUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#2457A7] hover:underline flex items-center gap-1 font-medium transition-colors"
                    title="Mở tab mới kiểm tra thử đường link"
                  >
                    <span>Mở thử link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleFetchTitle()}
                  disabled={isFetchingTitle || !targetUrl.trim()}
                  className="text-[11px] font-semibold text-[#2457A7] hover:text-[#1C4585] flex items-center gap-1 disabled:opacity-40 transition-colors bg-[#E5EDFA] px-2 py-0.5 rounded border border-[#CBD5E1]"
                  title="Tự động đọc tiêu đề tài liệu từ link web hoặc Google Docs/Sheets"
                >
                  {isFetchingTitle ? (
                    <Loader2 className="w-3 h-3 animate-spin text-[#2457A7]" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-amber-600" />
                  )}
                  <span>{isFetchingTitle ? "Đang quét..." : "Lấy tiêu đề tự động"}</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                required
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                onBlur={() => {
                  if (targetUrl.trim() && !title.trim()) {
                    handleFetchTitle();
                  }
                }}
                placeholder="https://docs.google.com/document/d/... hoặc dán link Google Sheets/Drive"
                className="w-full px-3 py-2 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-0.5">
              <span>Hỗ trợ Google Docs, Sheets, Drive Folder & File, hoặc các trang web tài liệu.</span>
              {detectedCategory !== "other" && (
                <span className="font-semibold text-[#15803D] flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Nhận diện: {detectedCategory.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* 2. Tên gợi nhớ của Tài liệu */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#172033] flex items-center gap-1">
                <span>Tên gợi nhớ của tài liệu</span>
                <span className="text-rose-500">*</span>
              </label>
              {title.length > 0 && (
                <span className="text-[10px] text-[#94A3B8] font-mono">{title.length}/200 ký tự</span>
              )}
            </div>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Kế hoạch Triển khai Bệnh viện Quốc tế Q4..."
              className="w-full px-3 py-2 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
            />
          </div>

          {/* 3. Phân loại Định dạng (Category) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#172033]">
              Định dạng / Danh mục
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setIsCustomCategory(true);
                    }}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? "bg-white border-[#2457A7] text-[#2457A7] ring-1 ring-[#2457A7] shadow-xs font-semibold"
                        : "bg-[#F8FAFC] border-[#DDE2E9] text-[#64748B] hover:bg-white hover:text-[#172033]"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-[#2457A7]" : "text-[#94A3B8]"}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Nhãn phân loại (Tags) dạng Chips & Gợi ý nhanh */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#172033] flex items-center justify-between">
              <span>Tags nhãn phân loại</span>
              <span className="text-[10px] text-[#64748B] font-normal">
                Ấn Enter hoặc dấu phẩy để tạo tag
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-md bg-white border border-[#DDE2E9] focus-within:ring-1 focus-within:ring-[#2457A7] focus-within:border-[#2457A7] min-h-[38px]">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E5EDFA] text-[#1E429F] border border-[#BFDBFE] text-xs font-medium"
                >
                  <Tag className="w-2.5 h-2.5" />
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-600 transition-colors ml-0.5"
                    title="Xóa tag này"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                onBlur={() => handleAddTag(tagInput)}
                placeholder={tags.length === 0 ? "Nhập tag rồi ấn Enter (VD: Quy trình, HIS...)" : "Thêm tag..."}
                className="flex-1 min-w-[130px] outline-none text-xs bg-transparent text-[#172033] placeholder-[#94A3B8]"
              />
            </div>

            {/* Gợi ý tags phổ biến */}
            <div className="flex flex-wrap items-center gap-1 pt-1">
              <span className="text-[10px] text-[#94A3B8] font-medium mr-1">Gợi ý nhanh:</span>
              {SUGGESTED_TAGS.map((stag) => {
                const isAdded = tags.includes(stag);
                return (
                  <button
                    key={stag}
                    type="button"
                    onClick={() => handleToggleSuggestedTag(stag)}
                    className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                      isAdded
                        ? "bg-[#2457A7] text-white font-semibold shadow-xs"
                        : "bg-[#F1F3F6] hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#172033]"
                    }`}
                  >
                    {isAdded ? `✓ ${stag}` : `+ ${stag}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Mô tả chi tiết / Ghi chú */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#172033]">
              Mô tả chi tiết / Ghi chú truy cập
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú nội dung tài liệu, phân quyền truy cập Google, người liên hệ phụ trách..."
              className="w-full px-3 py-2 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] resize-none"
            />
          </div>

          {/* 6. Cảnh báo Trùng lặp (Duplicate Warning Banner - BR-04, MSG-31) */}
          {duplicateWarning && (
            <div className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#78350F] space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="font-semibold text-xs text-[#92400E]">
                    Cảnh báo Trùng lặp Tài liệu (BR-04, MSG-31)
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#78350F]">
                    {duplicateWarning.message}
                  </p>
                </div>
              </div>

              {duplicateWarning.existingLink && (
                <div className="p-2.5 rounded-md bg-white border border-[#FDE68A] text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#172033] line-clamp-1">
                      {duplicateWarning.existingLink.title}
                    </span>
                    <a
                      href={duplicateWarning.existingLink.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2457A7] hover:underline flex items-center gap-0.5 font-medium shrink-0 ml-2"
                    >
                      <span>Xem tài liệu đã có</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-[10px] text-[#64748B] flex items-center gap-3">
                    <span>
                      Người tạo: <strong>{duplicateWarning.existingLink.creator}</strong>
                    </span>
                    {duplicateWarning.existingLink.createdAt && (
                      <span>Ngày tạo: {formatDate(duplicateWarning.existingLink.createdAt)}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#FDE68A]/60">
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="px-3 py-1 rounded-md bg-white hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#172033] border border-[#DDE2E9] font-medium text-xs transition-colors"
                >
                  Kiểm tra lại link
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(undefined, true)}
                  className="px-3.5 py-1 rounded-md bg-[#B45309] hover:bg-[#92400E] text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs"
                >
                  <span>{saving ? "Đang lưu..." : "Vẫn tiếp tục lưu link này"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EDF1F5]">
            <button
              type="button"
              disabled={saving}
              onClick={() => setModalOpen(false)}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:text-[#172033] hover:bg-[#F1F3F6] border border-[#DDE2E9] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{saving ? "Đang lưu..." : editingLink ? "Lưu thay đổi" : "Lưu vào Kho Link"}</span>
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
