"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
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
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Đơn đặt nhóm"
        subtitle="Gom order món ăn, chốt order, nhập giá và gửi QR nhắc thanh toán Telegram"
        actionButton={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaymentConfigModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Cài đặt tài khoản ngân hàng nhận tiền để sinh QR VietQR"
            >
              <CreditCard className="w-3.5 h-3.5 text-blue-400" />
              <span>Tài khoản nhận tiền</span>
            </button>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo đơn đặt nhóm</span>
            </button>
          </div>
        }
      />

      <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => setStatusFilter("open")}
            className={`p-4 rounded-3xl bg-slate-900/60 border cursor-pointer transition-all hover:scale-[1.01] ${
              statusFilter === "open"
                ? "border-emerald-500/50 ring-2 ring-emerald-500/20 bg-slate-900"
                : "border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Đang nhận order</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{countOpen}</span>
              <span className="text-[11px] text-emerald-400">Đơn đang mở</span>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("closed")}
            className={`p-4 rounded-3xl bg-slate-900/60 border cursor-pointer transition-all hover:scale-[1.01] ${
              statusFilter === "closed"
                ? "border-amber-500/50 ring-2 ring-amber-500/20 bg-slate-900"
                : "border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Đã đóng order</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{countClosed}</span>
              <span className="text-[11px] text-amber-400">Đang chốt giá & thu tiền</span>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("completed")}
            className={`p-4 rounded-3xl bg-slate-900/60 border cursor-pointer transition-all hover:scale-[1.01] ${
              statusFilter === "completed"
                ? "border-cyan-500/50 ring-2 ring-cyan-500/20 bg-slate-900"
                : "border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Đã hoàn tất</span>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{countCompleted}</span>
              <span className="text-[11px] text-cyan-400">100% đã thanh toán</span>
            </div>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="p-4 rounded-3xl bg-slate-900/70 border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên đơn, mã đơn, trưởng nhóm..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </form>

          <div className="flex items-center gap-1.5 self-end md:self-auto overflow-x-auto w-full md:w-auto">
            <span className="text-xs text-slate-500 font-bold mr-1 flex items-center gap-1">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === st.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            Đang tải danh sách đơn đặt nhóm...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white">Chưa có đơn đặt nhóm nào.</p>
            <p className="max-w-md mx-auto text-slate-500 text-xs">
              Tạo đơn ngay để rủ đồng nghiệp cùng order trà sữa, cà phê hoặc cơm trưa hôm nay!
            </p>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo đơn đặt nhóm đầu tiên</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((ord) => {
              const statusCfg = getStatusBadge(ord.status);
              const StatusIcon = statusCfg.icon;

              return (
                <Link
                  key={ord.id}
                  href={`/group-orders/${ord.id}`}
                  className="group p-5 rounded-3xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between shadow-xl space-y-4 hover:scale-[1.01]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-black text-cyan-400 px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                        {ord.orderCode}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold inline-flex items-center gap-1 ${statusCfg.classes}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        <span>{statusCfg.label}</span>
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                        {ord.title}
                      </h3>
                      {ord.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {ord.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Trưởng nhóm:</span>
                      <span className="font-semibold text-slate-200 flex items-center gap-1">
                        {ord.createdByUser?.fullName || ord.createdByUser?.username}
                        {ord.isLeader && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Bạn
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Thành viên:</span>
                      <span className="text-slate-300 font-medium">
                        {ord.membersCount} người ({ord.totalItemsCount} món)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Tổng tiền:</span>
                      <span className="text-sm font-black text-emerald-300 font-mono">
                        {ord.totalAmount > 0
                          ? `${ord.totalAmount.toLocaleString("vi-VN")}đ`
                          : "Chưa chốt giá"}
                      </span>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-blue-400 font-bold group-hover:translate-x-0.5 transition-transform">
                      <span>Vào xem đơn / Đặt món</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
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
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tên đơn đặt nhóm <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={orderTitle}
              onChange={(e) => setOrderTitle(e.target.value)}
              placeholder="VD: Order trà sữa Koi Thé chiều 09/10, Cơm trưa gà nướng..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Ghi chú thêm (Menu, Link quán, Ưu đãi...)
            </label>
            <textarea
              rows={3}
              value={orderDesc}
              onChange={(e) => setOrderDesc(e.target.value)}
              placeholder="Ghi chú link menu ShopeeFood/Grab hoặc chương trình giảm giá..."
              className="w-full px-4 py-2 rounded-2xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Thời hạn chốt order (Tùy chọn)
            </label>
            <input
              type="datetime-local"
              value={orderDeadline}
              onChange={(e) => setOrderDeadline(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/25 disabled:opacity-50"
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
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Ngân hàng thụ hưởng <span className="text-rose-400">*</span>
            </label>
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-xs"
            >
              {VIETNAM_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.shortName} - {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Số tài khoản <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="VD: 0123456789"
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tên chủ tài khoản (In hoa không dấu) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="VD: NGUYEN TRUNG KIEN"
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Cú pháp nội dung mặc định
            </label>
            <input
              type="text"
              value={defaultContent}
              onChange={(e) => setDefaultContent(e.target.value)}
              placeholder="VD: ORDER"
              className="w-full px-4 py-2 rounded-2xl bg-slate-950 border border-slate-700 text-white text-xs"
            />
            <p className="text-[10px] text-slate-400">
              Hệ thống sẽ tự ghép thành: <code>{defaultContent || "ORDER"} [MÃ_ĐƠN]</code>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setPaymentConfigModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={savingPaymentConfig}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md disabled:opacity-50"
            >
              {savingPaymentConfig ? "Đang lưu..." : "Lưu tài khoản"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
