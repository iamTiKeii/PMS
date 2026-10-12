"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { Pagination, usePagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { CardGridSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import {
  UtensilsCrossed,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  Lock,
  CreditCard,
  QrCode,
  Users2,
  Calendar,
  ChevronRight,
  Filter,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
} from "lucide-react";
import { VIETNAM_BANKS } from "@/lib/group-orders";

export default function GroupOrdersPage() {
  const { success, error } = useToast();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination hook
  const {
    page: orderPage,
    offset: orderOffset,
    goToPage: setOrderPage,
  } = usePagination({
    totalItems: orders.length,
    pageSize: 9,
    filterDeps: [search, statusFilter],
  });

  const paginatedOrders = orders.slice(orderOffset, orderOffset + 9);

  // Modal tạo đơn mới
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [orderTitle, setOrderTitle] = useState("");
  const [orderDesc, setOrderDesc] = useState("");
  const [orderDeadline, setOrderDeadline] = useState("");
  const [creating, setCreating] = useState(false);

  // Modal cài đặt tài khoản nhận tiền
  const [paymentConfigModalOpen, setPaymentConfigModalOpen] = useState(false);
  const [bankCode, setBankCode] = useState("MB");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [defaultContent, setDefaultContent] = useState("ORDER");
  const [savingPaymentConfig, setSavingPaymentConfig] = useState(false);

  // Tải danh sách đơn
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/group-orders?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data || []);
      } else {
        error(json.error?.message || "Không thể tải danh sách đơn.");
      }
    } catch {
      error("Lỗi kết nối khi tải danh sách đơn đặt nhóm.");
    } finally {
      setLoading(false);
    }
  };

  // Tải cấu hình thanh toán cá nhân
  const fetchPaymentConfig = async () => {
    try {
      const res = await fetch("/api/user-payment-config");
      const json = await res.json();
      if (json.success && json.data) {
        setBankCode(json.data.bankCode || "MB");
        setAccountNumber(json.data.accountNumber || "");
        setAccountName(json.data.accountName || "");
        setDefaultContent(json.data.defaultContent || "ORDER");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchPaymentConfig();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  // Lưu cấu hình thanh toán
  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim()) {
      error("Vui lòng nhập số tài khoản.");
      return;
    }
    if (!accountName.trim()) {
      error("Vui lòng nhập tên chủ tài khoản.");
      return;
    }

    setSavingPaymentConfig(true);
    try {
      const selectedBank = VIETNAM_BANKS.find((b) => b.code === bankCode);
      const res = await fetch("/api/user-payment-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankCode,
          bankName: selectedBank ? `${selectedBank.name} (${selectedBank.shortName})` : bankCode,
          accountNumber,
          accountName,
          defaultContent,
        }),
      });

      const json = await res.json();
      if (json.success) {
        success("Đã lưu cấu hình tài khoản nhận tiền.");
        setPaymentConfigModalOpen(false);
      } else {
        error(json.error?.message || "Lỗi lưu cấu hình thanh toán.");
      }
    } catch {
      error("Lỗi kết nối hệ thống.");
    } finally {
      setSavingPaymentConfig(false);
    }
  };

  // Tạo đơn mới
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderTitle.trim()) {
      error("Vui lòng nhập tên đơn đặt nhóm.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/group-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: orderTitle,
          description: orderDesc,
          orderDeadline: orderDeadline || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        success("Đã tạo đơn đặt nhóm thành công!");
        setCreateModalOpen(false);
        setOrderTitle("");
        setOrderDesc("");
        setOrderDeadline("");
        fetchOrders();
      } else {
        error(json.error?.message || "Lỗi tạo đơn đặt nhóm.");
      }
    } catch {
      error("Lỗi kết nối hệ thống khi tạo đơn.");
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return {
          label: "Đang nhận order",
          classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
          icon: Clock,
        };
      case "closed":
        return {
          label: "Đã đóng order",
          classes: "bg-amber-500/15 text-amber-300 border-amber-500/30",
          icon: Lock,
        };
      case "completed":
        return {
          label: "Hoàn tất 100%",
          classes: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
          icon: CheckCircle2,
        };
      default:
        return {
          label: status,
          classes: "bg-slate-700/30 text-slate-400 border-slate-700",
          icon: Clock,
        };
    }
  };

  // Thống kê nhanh
  const countOpen = orders.filter((o) => o.status === "open").length;
  const countClosed = orders.filter((o) => o.status === "closed").length;
  const countCompleted = orders.filter((o) => o.status === "completed").length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F1F3F6]">
      <Header
        title="Đơn đặt nhóm"
        subtitle="Tổng hợp order đồ ăn, chốt danh sách, phân bổ tiền và nhắc thanh toán VietQR qua Telegram"
        actionButton={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaymentConfigModalOpen(true)}
              className="px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] hover:bg-[#F8FAFC] text-[#172033] text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
              title="Cài đặt tài khoản ngân hàng nhận tiền để sinh QR VietQR"
            >
              <CreditCard className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Tài khoản nhận tiền</span>
            </button>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="px-3.5 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo đơn đặt nhóm</span>
            </button>
          </div>
        }
      />

      <div className="p-6 md:p-8 space-y-5 max-w-7xl mx-auto w-full">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => setStatusFilter("open")}
            className={`p-4 rounded-lg bg-white border cursor-pointer transition-all shadow-xs ${
              statusFilter === "open"
                ? "border-[#15803D] ring-1 ring-[#15803D]"
                : "border-[#DDE2E9] hover:border-[#CBD5E1]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Đang nhận order</span>
              <div className="w-8 h-8 rounded-md bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#15803D]">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#172033]">{countOpen}</span>
              <span className="text-xs text-[#15803D] font-medium">Đơn đang mở</span>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("closed")}
            className={`p-4 rounded-lg bg-white border cursor-pointer transition-all shadow-xs ${
              statusFilter === "closed"
                ? "border-[#B45309] ring-1 ring-[#B45309]"
                : "border-[#DDE2E9] hover:border-[#CBD5E1]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Đã đóng order</span>
              <div className="w-8 h-8 rounded-md bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#B45309]">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#172033]">{countClosed}</span>
              <span className="text-xs text-[#B45309] font-medium">Đang chốt giá & thu tiền</span>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("completed")}
            className={`p-4 rounded-lg bg-white border cursor-pointer transition-all shadow-xs ${
              statusFilter === "completed"
                ? "border-[#2457A7] ring-1 ring-[#2457A7]"
                : "border-[#DDE2E9] hover:border-[#CBD5E1]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Đã hoàn tất</span>
              <div className="w-8 h-8 rounded-md bg-[#E5EDFA] border border-[#BFD4F7] flex items-center justify-center text-[#2457A7]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#172033]">{countCompleted}</span>
              <span className="text-xs text-[#2457A7] font-medium">100% đã thanh toán</span>
            </div>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="p-3.5 rounded-lg bg-white border border-[#DDE2E9] flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên đơn, mã đơn, trưởng nhóm..."
              className="w-full pl-9 pr-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
            />
          </form>

          <div className="flex items-center gap-1.5 self-end md:self-auto overflow-x-auto w-full md:w-auto">
            <span className="text-xs text-[#64748B] font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Lọc:
            </span>
            {[
              { id: "all", label: "Tất cả" },
              { id: "open", label: "Đang mở" },
              { id: "closed", label: "Đã đóng" },
              { id: "completed", label: "Hoàn tất" },
            ].map((st) => (
              <button
                type="button"
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

        {/* Orders List */}
        {loading ? (
          <CardGridSkeleton count={6} />
        ) : orders.length === 0 ? (
          <EmptyState
            title="Chưa có đơn đặt nhóm nào"
            description={
              search || statusFilter !== "all"
                ? "Không tìm thấy đơn đặt nhóm nào khớp với điều kiện lọc hiện tại. Hãy thử chọn tất cả trạng thái hoặc xóa tìm kiếm."
                : "Tạo đơn ngay để rủ đồng nghiệp cùng đặt món ăn hoặc thức uống trong đợt này."
            }
            icon={<UtensilsCrossed className="w-6 h-6 text-[#94A3B8]" />}
            action={
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="px-3.5 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo đơn đặt nhóm đầu tiên</span>
              </button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedOrders.map((ord) => {
              const statusCfg = getStatusBadge(ord.status);
              const StatusIcon = statusCfg.icon;

              return (
                <Link
                  key={ord.id}
                  href={`/group-orders/${ord.id}`}
                  className="group p-4 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#DDE2E9] hover:border-[#CBD5E1] transition-all flex flex-col justify-between shadow-xs space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold text-[#172033] px-2 py-0.5 rounded bg-[#F1F3F6] border border-[#DDE2E9]">
                        {ord.orderCode}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1 border ${
                          ord.status === "open"
                            ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
                            : ord.status === "closed"
                            ? "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]"
                            : "bg-[#E5EDFA] text-[#2457A7] border-[#BFD4F7]"
                        }`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        <span>{statusCfg.label}</span>
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-[#172033] group-hover:text-[#2457A7] transition-colors line-clamp-1">
                        {ord.title}
                      </h3>
                      {ord.description && (
                        <p className="text-xs text-[#64748B] mt-1 line-clamp-2 leading-relaxed">
                          {ord.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#EDF1F5] space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[#64748B]">
                      <span>Trưởng nhóm:</span>
                      <span className="font-medium text-[#172033] flex items-center gap-1">
                        {ord.createdByUser?.fullName || ord.createdByUser?.username}
                        {ord.isLeader && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-semibold">
                            Bạn
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#64748B]">
                      <span>Thành viên:</span>
                      <span className="text-[#172033] font-medium">
                        {ord.membersCount} người ({ord.totalItemsCount} món)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#64748B]">
                      <span>Tổng tiền:</span>
                      <span className="text-xs font-bold text-[#172033] font-mono">
                        {ord.totalAmount > 0
                          ? `${ord.totalAmount.toLocaleString("vi-VN")}đ`
                          : "Chưa chốt giá"}
                      </span>
                    </div>

                    <div className="pt-1.5 flex items-center justify-between text-[11px] text-[#2457A7] font-medium group-hover:translate-x-0.5 transition-transform">
                      <span>Chi tiết / Đặt món</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Accessible Pagination Landmark */}
          {orders.length > 0 && (
            <Pagination
              currentPage={orderPage}
              totalItems={orders.length}
              pageSize={9}
              onPageChange={setOrderPage}
              filterDeps={[search, statusFilter]}
              className="mt-2"
            />
          )}
        </>
      )}
      </div>

      {/* Modal Tạo đơn mới */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Tạo Đơn đặt nhóm mới"
        subtitle="Mọi người trong nhóm sẽ tự vào chọn món ăn/thức uống theo đơn này"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Tên đơn đặt nhóm <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              type="text"
              required
              value={orderTitle}
              onChange={(e) => setOrderTitle(e.target.value)}
              placeholder="VD: Order trà sữa chiều 09/10, Cơm trưa gà nướng..."
              className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Ghi chú thêm (Menu, Link quán, Ưu đãi...)
            </label>
            <textarea
              rows={3}
              value={orderDesc}
              onChange={(e) => setOrderDesc(e.target.value)}
              placeholder="Ghi chú link menu hoặc chương trình ưu đãi..."
              className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Thời hạn chốt order (Tùy chọn)
            </label>
            <input
              type="datetime-local"
              value={orderDeadline}
              onChange={(e) => setOrderDeadline(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE2E9]">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:text-[#172033] hover:bg-[#F1F3F6] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs transition-colors disabled:opacity-50"
            >
              {creating ? "Đang tạo..." : "Tạo đơn"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Cài đặt tài khoản nhận tiền */}
      <Modal
        isOpen={paymentConfigModalOpen}
        onClose={() => setPaymentConfigModalOpen(false)}
        title="Tài khoản nhận tiền (VietQR)"
        subtitle="Thông tin ngân hàng của bạn dùng để sinh mã QR thanh toán chung cho nhóm"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSavePaymentConfig} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Ngân hàng thụ hưởng <span className="text-[#B91C1C]">*</span>
            </label>
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
            >
              {VIETNAM_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.shortName} - {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Số tài khoản <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="VD: 0123456789"
              className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Tên chủ tài khoản (In hoa không dấu) <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              type="text"
              required
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="VD: NGUYEN VAN A"
              className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs uppercase font-mono focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Cú pháp nội dung mặc định
            </label>
            <input
              type="text"
              value={defaultContent}
              onChange={(e) => setDefaultContent(e.target.value)}
              placeholder="VD: ORDER"
              className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] text-xs focus:outline-none focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7]"
            />
            <p className="text-[11px] text-[#64748B]">
              Hệ thống sẽ tự ghép thành: <code>{defaultContent || "ORDER"} [MÃ_ĐƠN]</code>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE2E9]">
            <button
              type="button"
              onClick={() => setPaymentConfigModalOpen(false)}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[#64748B] hover:text-[#172033] hover:bg-[#F1F3F6] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={savingPaymentConfig}
              className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white shadow-xs transition-colors disabled:opacity-50"
            >
              {savingPaymentConfig ? "Đang lưu..." : "Lưu tài khoản"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
