"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { PasswordRevealModal } from "@/components/PasswordRevealModal";
import { Pagination, usePagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import {
  KeyRound,
  Search,
  Plus,
  Lock,
  Eye,
  Copy,
  Check,
  ExternalLink,
  Edit2,
  Trash2,
  ShieldCheck,
  Shield,
  FolderKanban,
  User,
  Filter,
  Globe,
  Sparkles,
  Layers,
  Building2,
  Clock,
  RefreshCw,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function VaultPage() {
  const { success, error } = useToast();
  const { confirm } = useConfirm();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [ownerOnly, setOwnerOnly] = useState(false);

  // Pagination hook
  const {
    page: vaultPage,
    offset: vaultOffset,
    goToPage: setVaultPage,
  } = usePagination({
    totalItems: accounts.length,
    pageSize: 15,
    filterDeps: [search, selectedProject, selectedStatus, ownerOnly],
  });

  const paginatedAccounts = accounts.slice(vaultOffset, vaultOffset + 15);

  // Reveal Modal
  const [revealModalOpen, setRevealModalOpen] = useState(false);
  const [selectedAccountForReveal, setSelectedAccountForReveal] = useState<any>(null);

  // Add / Edit Account Modal
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState("in_use");
  const [savingAccount, setSavingAccount] = useState(false);

  // Copy tracking
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (selectedProject !== "all") params.set("projectId", selectedProject);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (ownerOnly) params.set("ownerOnly", "true");

      const res = await fetch(`/api/vault/accounts?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setAccounts(json.data || []);
      }
    } catch {
      error("Lỗi khi tải danh sách tài khoản Két.");
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [userRes, projRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/projects"),
      ]);
      const userJson = await userRes.json();
      if (userJson.success) setCurrentUser(userJson.data);

      const projJson = await projRes.json();
      if (projJson.success) setProjects(projJson.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [search, selectedProject, selectedStatus, ownerOnly]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    success("Đã sao chép vào bộ nhớ tạm!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    setFormName("");
    setFormUsername("");
    setFormPassword("");
    setFormProjectId(projects[0]?.id || "");
    setFormUrl("");
    setFormNotes("");
    setFormStatus("in_use");
    setAccountModalOpen(true);
  };

  const openEditModal = (acc: any) => {
    setEditingAccount(acc);
    setFormName(acc.accountLabel || acc.name || "");
    setFormUsername(acc.siteLoginUsername || acc.username || "");
    setFormPassword(""); // Don't prefill password
    setFormProjectId(acc.projectId || "");
    setFormUrl(acc.url || "");
    setFormNotes(acc.notes || "");
    setFormStatus(acc.status || "in_use");
    setAccountModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim()) {
      error("Vui lòng nhập Tên đăng nhập.");
      return;
    }

    if (!editingAccount && !formPassword.trim()) {
      error("Vui lòng nhập Mật khẩu cho tài khoản mới.");
      return;
    }

    setSavingAccount(true);
    try {
      const payload: any = {
        name: formName.trim() || `Tài khoản ${formUsername.trim()}`,
        username: formUsername.trim(),
        projectId: formProjectId || undefined,
        url: formUrl.trim() || undefined,
        notes: formNotes.trim() || undefined,
        status: formStatus,
      };

      if (formPassword.trim()) {
        payload.password = formPassword.trim();
        payload.newPassword = formPassword.trim();
      }

      const url = editingAccount
        ? `/api/vault/accounts/${editingAccount.id}`
        : "/api/vault/accounts";
      const method = editingAccount ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Lỗi lưu tài khoản.");
        return;
      }

      success(editingAccount ? "Cập nhật tài khoản thành công!" : "Tạo tài khoản Két thành công!");
      setAccountModalOpen(false);
      fetchAccounts();
    } catch {
      error("Lỗi kết nối máy chủ.");
    } finally {
      setSavingAccount(false);
    }
  };

  const handleDeleteAccount = async (acc: any) => {
    const ok = await confirm({
      title: "Xóa tài khoản khỏi Két?",
      message: `Bạn có chắc chắn muốn xóa tài khoản "${acc.accountLabel || acc.name}" khỏi Két mật khẩu? Hành động này sẽ loại bỏ quyền truy cập tài khoản này khỏi hệ thống.`,
      confirmText: "Xóa tài khoản",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/vault/accounts/${acc.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        success("Đã xóa tài khoản khỏi Két thành công.");
        fetchAccounts();
      } else {
        error(json.error?.message || "Lỗi xóa tài khoản.");
      }
    } catch {
      error("Lỗi kết nối khi xóa tài khoản.");
    }
  };

  const myAccountsCount = accounts.filter((a) => a.isOwner).length;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen">
      <Header
        title="Két Tài khoản An toàn"
        subtitle="Quản trị thông tin đăng nhập tập trung, phân quyền truy cập và bảo vệ bằng mã PIN / AES-256-GCM"
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl w-full mx-auto">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-md bg-white border border-[#DDE2E9] shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider">Tổng tài khoản lưu trữ</div>
              <div className="text-2xl font-bold text-[#172033] mt-1">{accounts.length}</div>
            </div>
            <div className="w-10 h-10 rounded-md bg-[#E5EDFA] text-[#2457A7] border border-[#BFD4F7] flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-md bg-white border border-[#DDE2E9] shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider">Tài khoản của bạn</div>
              <div className="text-2xl font-bold text-[#15803D] mt-1">{myAccountsCount}</div>
            </div>
            <div className="w-10 h-10 rounded-md bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-md bg-white border border-[#DDE2E9] shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider">Bảo mật mã PIN cá nhân</div>
              <div className="text-xs text-[#64748B] font-medium mt-1">Xác thực mã PIN khi xem mật khẩu riêng tư</div>
              <Link
                href="/profile"
                className="text-xs text-[#2457A7] hover:underline font-semibold inline-flex items-center gap-1 mt-1"
              >
                <span>Thiết lập mã PIN cá nhân</span>
                <span>→</span>
              </Link>
            </div>
            <div className="w-10 h-10 rounded-md bg-[#F1F3F6] text-[#64748B] border border-[#DDE2E9] flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-3.5 rounded-md bg-white border border-[#DDE2E9] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm nhãn, tên đăng nhập, URL, ghi chú..."
                className="w-full pl-9 pr-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
              />
            </div>

            {/* Filter by Project */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
            >
              <option value="all">Tất cả dự án</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectName}
                </option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="in_use">Đang sử dụng</option>
              <option value="stopped">Tạm ngưng</option>
              <option value="rotation_needed">Cần đổi mật khẩu</option>
            </select>

            {/* Toggle My Accounts */}
            <button
              type="button"
              onClick={() => setOwnerOnly(!ownerOnly)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 border ${
                ownerOnly
                  ? "bg-[#E5EDFA] text-[#2457A7] border-[#BFD4F7] shadow-xs font-semibold"
                  : "bg-white text-[#64748B] border-[#DDE2E9] hover:bg-[#F8FAFC]"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Chỉ của tôi ({myAccountsCount})</span>
            </button>
          </div>

          {/* Add Account Button */}
          <button
            type="button"
            onClick={openCreateModal}
            className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm tài khoản</span>
          </button>
        </div>

        {/* Accounts Table */}
        {loading ? (
          <TableSkeleton rows={6} columns={7} />
        ) : accounts.length === 0 ? (
          <EmptyState
            title="Chưa có tài khoản nào phù hợp"
            description={
              ownerOnly
                ? "Bạn chưa có tài khoản nào do chính mình sở hữu. Hãy tạo tài khoản mới để lưu trữ an toàn."
                : search || selectedProject !== "all"
                  ? "Không tìm thấy tài khoản phù hợp với điều kiện tìm kiếm. Hãy thử xóa bộ lọc."
                  : "Chưa có tài khoản nào được lưu trữ trong két. Nhấn Thêm tài khoản để bắt đầu."
            }
            icon={<KeyRound className="w-6 h-6 text-[#94A3B8]" />}
            action={
              <button
                type="button"
                onClick={openCreateModal}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm tài khoản mới</span>
              </button>
            }
          />
        ) : (
          <div className="rounded-lg bg-white border border-[#DDE2E9] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#DDE2E9] bg-[#F8FAFC] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-4">Tài khoản & Dịch vụ</th>
                    <th className="py-2.5 px-4">Tên đăng nhập</th>
                    <th className="py-2.5 px-4">Mật khẩu</th>
                    <th className="py-2.5 px-4">Chủ sở hữu</th>
                    <th className="py-2.5 px-4">Dự án</th>
                    <th className="py-2.5 px-4">Trạng thái</th>
                    <th className="py-2.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF1F5]">
                  {paginatedAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* Name & URL */}
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-[#172033] text-xs">
                          {acc.accountLabel || acc.name}
                        </div>
                        {acc.url && (
                          <a
                            href={acc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#2457A7] hover:underline inline-flex items-center gap-1 mt-0.5"
                          >
                            <Globe className="w-3 h-3 text-[#94A3B8]" />
                            <span className="truncate max-w-[200px]">{acc.url}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {acc.notes && (
                          <div className="text-[11px] text-[#94A3B8] truncate max-w-[220px] mt-0.5">
                            {acc.notes}
                          </div>
                        )}
                      </td>

                      {/* Username */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-medium text-[#172033] bg-[#F1F3F6] px-2 py-0.5 rounded border border-[#DDE2E9] text-xs">
                            {acc.siteLoginUsername}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(acc.siteLoginUsername, `user-${acc.id}`)}
                            className="p-1 rounded hover:bg-[#F1F3F6] text-[#94A3B8] hover:text-[#172033]"
                            title="Sao chép tên đăng nhập"
                          >
                            {copiedId === `user-${acc.id}` ? (
                              <Check className="w-3.5 h-3.5 text-[#15803D]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Password Reveal Button */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#94A3B8] text-xs select-none">
                            ••••••••••••
                          </span>
                          {acc.canReveal ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAccountForReveal(acc);
                                setRevealModalOpen(true);
                              }}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors border ${
                                acc.passwordStatus === "CUSTOM"
                                  ? "bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF] hover:bg-[#F3E8FF]"
                                  : "bg-[#E5EDFA] text-[#2457A7] border-[#BFD4F7] hover:bg-[#D5E4F8]"
                              }`}
                              title={
                                acc.passwordStatus === "CUSTOM"
                                  ? "Mật khẩu riêng tư - Yêu cầu xác thực PIN cá nhân"
                                  : "Mật khẩu mặc định - Xem trực tiếp"
                              }
                            >
                              {acc.passwordStatus === "CUSTOM" ? (
                                <Lock className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                              <span>{acc.passwordStatus === "CUSTOM" ? "Xem (PIN)" : "Xem"}</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F1F3F6] text-[#64748B] border border-[#DDE2E9]">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Riêng tư</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-2.5 px-4">
                        {acc.isOwner ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Của bạn</span>
                          </span>
                        ) : (
                          <div className="text-[#172033] text-xs">
                            <div className="font-medium">
                              {acc.ownerUser?.fullName || acc.staff?.fullName || "Chưa gán"}
                            </div>
                            {acc.ownerUser && (
                              <div className="text-[10px] text-[#94A3B8] font-mono">@{acc.ownerUser.username}</div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Project */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5 text-[#172033]">
                          <FolderKanban className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {acc.project?.projectName || "Chung"}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${
                            acc.status === "in_use"
                              ? "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]"
                              : acc.status === "rotation_needed"
                              ? "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                              : "bg-[#F1F3F6] text-[#64748B] border border-[#DDE2E9]"
                          }`}
                        >
                          {acc.status === "in_use"
                            ? "Đang dùng"
                            : acc.status === "rotation_needed"
                            ? "Cần đổi MK"
                            : "Tạm ngưng"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right">
                        {acc.canManage ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(acc)}
                              className="p-1 rounded hover:bg-[#F1F3F6] text-[#64748B] hover:text-[#172033] transition-colors"
                              title="Sửa tài khoản"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(acc)}
                              className="p-1 rounded hover:bg-[#FEF2F2] text-[#64748B] hover:text-[#B91C1C] transition-colors"
                              title="Xóa tài khoản"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[#94A3B8] text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Accessible Pagination Landmark */}
            {accounts.length > 0 && (
              <Pagination
                currentPage={vaultPage}
                totalItems={accounts.length}
                pageSize={15}
                onPageChange={setVaultPage}
                filterDeps={[search, selectedProject, selectedStatus, ownerOnly]}
                className="rounded-t-none border-x-0 border-b-0 border-t border-[#DDE2E9]"
              />
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Account Modal */}
      <Modal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        title={editingAccount ? "Chỉnh sửa Tài khoản Két" : "Thêm Tài khoản mới vào Két"}
        subtitle="Mật khẩu được lưu trữ an toàn bằng thuật toán mã hóa AES-256-GCM"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveAccount} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Tên / Nhãn tài khoản <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="VD: Tài khoản HIS Bác sĩ Khám..."
              className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Tên đăng nhập <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                type="text"
                required
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="VD: user_admin..."
                className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Mật khẩu {editingAccount ? "(Để trống nếu không đổi)" : <span className="text-[#B91C1C]">*</span>}
              </label>
              <input
                type="password"
                required={!editingAccount}
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={editingAccount ? "Giữ nguyên mật khẩu cũ..." : "Nhập mật khẩu..."}
                className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] font-mono"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] text-[11px] text-[#64748B] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[#172033]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2457A7]" />
              <span>Quy tắc bảo mật mật khẩu Két:</span>
            </div>
            <p>
              • Nếu để trống hoặc trùng với mật khẩu mặc định dự án: Ở chế độ <strong className="text-[#2457A7]">Mặc định</strong> (thành viên dự án xem được).
            </p>
            <p>
              • Nếu nhập mật khẩu mới riêng: Chuyển sang chế độ <strong className="text-[#7E22CE]">Riêng tư</strong> (yêu cầu mã PIN cá nhân khi xem).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Dự án liên kết
              </label>
              <select
                value={formProjectId}
                onChange={(e) => setFormProjectId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Trạng thái
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
              >
                <option value="in_use">Đang sử dụng</option>
                <option value="stopped">Tạm dừng</option>
                <option value="rotation_needed">Cần đổi mật khẩu</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Đường dẫn dịch vụ (URL)
            </label>
            <input
              type="url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://his.benhvien.vn/..."
              className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Ghi chú thêm
            </label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Ghi chú về phân quyền hoặc lưu ý đặc thù..."
              className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE2E9]">
            <button
              type="button"
              onClick={() => setAccountModalOpen(false)}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:text-[#172033] hover:bg-[#F1F3F6] transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={savingAccount}
              className="px-4 py-1.5 rounded-md text-xs font-medium bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs transition-colors disabled:opacity-50"
            >
              {savingAccount ? "Đang lưu..." : editingAccount ? "Cập nhật tài khoản" : "Tạo tài khoản"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Password Reveal Modal */}
      <PasswordRevealModal
        isOpen={revealModalOpen}
        onClose={() => setRevealModalOpen(false)}
        accountId={selectedAccountForReveal?.id || null}
        accountLabel={selectedAccountForReveal?.accountLabel || selectedAccountForReveal?.name || ""}
        projectName={selectedAccountForReveal?.project?.projectName || "Chung"}
        siteUsername={selectedAccountForReveal?.siteLoginUsername || selectedAccountForReveal?.username || ""}
        isOwner={selectedAccountForReveal?.isOwner}
        passwordStatus={selectedAccountForReveal?.passwordStatus || "DEFAULT"}
      />
    </div>
  );
}
