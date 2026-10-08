"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { GroupOrderActivityTimeline } from "@/components/GroupOrderActivityTimeline";
import {
  ArrowLeft,
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  Lock,
  Send,
  CreditCard,
  QrCode,
  Users2,
  DollarSign,
  AlertTriangle,
  ExternalLink,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  Calendar,
} from "lucide-react";
import { VIETNAM_BANKS, getVietQrUrl } from "@/lib/group-orders";
import { useLoading } from "@/components/LoadingProvider";
import { ActionButton } from "@/components/ActionButton";
import { SectionLoading } from "@/components/SectionLoading";

export default function GroupOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;
  const router = useRouter();
  const { success, error } = useToast();
  const { withLoading } = useLoading();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"items" | "payments" | "timeline">("items");

  // State thêm / sửa món
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNote, setItemNote] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  // State nhập giá món (Trưởng nhóm)
  const [priceInputs, setPriceInputs] = useState<Record<string, number | string>>({});
  const [savingPrices, setSavingPrices] = useState(false);

  // State Modal Nhắc thanh toán
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [remBankCode, setRemBankCode] = useState("MB");
  const [remAccountNumber, setRemAccountNumber] = useState("");
  const [remAccountName, setRemAccountName] = useState("");
  const [remContent, setRemContent] = useState("");
  const [remSendTelegram, setRemSendTelegram] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);

  // State Modal Sửa thông tin đơn
  const [editOrderModalOpen, setEditOrderModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);

  // Tải chi tiết đơn
  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/group-orders/${orderId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setOrder(json.data);

        // Khởi tạo priceInputs từ items
        const initialPrices: Record<string, number | string> = {};
        json.data.items.forEach((it: any) => {
          initialPrices[it.id] = it.unitPrice !== null ? it.unitPrice : "";
        });
        setPriceInputs(initialPrices);

        // Khởi tạo thông tin tài khoản nếu có cấu hình
        if (json.data.leaderPaymentConfig) {
          setRemBankCode(json.data.leaderPaymentConfig.bankCode || "MB");
          setRemAccountNumber(json.data.leaderPaymentConfig.accountNumber || "");
          setRemAccountName(json.data.leaderPaymentConfig.accountName || "");
          setRemContent(`${json.data.leaderPaymentConfig.defaultContent || "ORDER"} ${json.data.orderCode}`);
        } else {
          setRemContent(`ORDER ${json.data.orderCode}`);
        }
      } else {
        error(json.error?.message || "Không thể tải thông tin đơn.");
        router.push("/group-orders");
      }
    } catch {
      error("Lỗi kết nối khi tải chi tiết đơn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Đóng đơn (Trưởng nhóm)
  const handleCloseOrder = async () => {
    if (!confirm("Bạn có chắc chắn muốn đóng đơn order? Sau khi đóng, thành viên sẽ không thể thêm hoặc sửa món nữa.")) {
      return;
    }
    await withLoading(
      "close-order",
      "Đang đóng đơn order...",
      async () => {
        try {
          const res = await fetch(`/api/group-orders/${orderId}/close`, { method: "POST" });
          const json = await res.json();
          if (json.success) {
            success(json.message || "Đã đóng đơn order.");
            fetchOrder();
          } else {
            error(json.error?.message || "Lỗi đóng đơn.");
          }
        } catch {
          error("Lỗi kết nối khi đóng đơn.");
        }
      },
      { minDuration: 300 }
    );
  };

  // Mở modal thêm món
  const openAddItemModal = () => {
    setEditingItem(null);
    setItemName("");
    setItemQuantity(1);
    setItemNote("");
    setItemModalOpen(true);
  };

  // Mở modal sửa món
  const openEditItemModal = (it: any) => {
    setEditingItem(it);
    setItemName(it.itemName);
    setItemQuantity(it.quantity);
    setItemNote(it.note || "");
    setItemModalOpen(true);
  };

  // Lưu món (Thêm hoặc Sửa)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      error("Vui lòng nhập tên món.");
      return;
    }

    setSavingItem(true);
    await withLoading(
      "save-item",
      editingItem ? "Đang lưu thay đổi món..." : "Đang thêm món vào order...",
      async () => {
        try {
          const url = editingItem
            ? `/api/group-orders/${orderId}/items/${editingItem.id}`
            : `/api/group-orders/${orderId}/items`;
          const method = editingItem ? "PUT" : "POST";

          const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemName,
              quantity: itemQuantity,
              note: itemNote,
            }),
          });

          const json = await res.json();
          if (json.success) {
            success(json.message || "Đã lưu món order.");
            setItemModalOpen(false);
            fetchOrder();
          } else {
            error(json.error?.message || "Lỗi lưu món.");
          }
        } catch {
          error("Lỗi kết nối khi lưu món.");
        } finally {
          setSavingItem(false);
        }
      },
      { minDuration: 300 }
    );
  };

  // Xóa món
  const handleDeleteItem = async (itemId: string, itemTitle: string) => {
    if (!confirm(`Bạn có chắc muốn xóa món "${itemTitle}" khỏi order?`)) return;
    await withLoading(
      "delete-item",
      `Đang xóa món "${itemTitle}"...`,
      async () => {
        try {
          const res = await fetch(`/api/group-orders/${orderId}/items/${itemId}`, { method: "DELETE" });
          const json = await res.json();
          if (json.success) {
            success(json.message || "Đã xóa món.");
            fetchOrder();
          } else {
            error(json.error?.message || "Lỗi xóa món.");
          }
        } catch {
          error("Lỗi khi xóa món.");
        }
      },
      { minDuration: 300 }
    );
  };

  // Lưu bảng giá thực tế hàng loạt (Trưởng nhóm)
  const handleSavePrices = async () => {
    const prices = Object.entries(priceInputs).map(([itemId, val]) => ({
      itemId,
      unitPrice: typeof val === "number" ? val : parseInt(String(val), 10) || 0,
    }));

    setSavingPrices(true);
    await withLoading(
      "save-prices",
      "Đang lưu bảng giá thực tế...",
      async () => {
        try {
          const res = await fetch(`/api/group-orders/${orderId}/prices`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prices }),
          });

          const json = await res.json();
          if (json.success) {
            success("Đã lưu bảng giá món ăn thành công!");
            fetchOrder();
          } else {
            error(json.error?.message || "Lỗi lưu giá món.");
          }
        } catch {
          error("Lỗi kết nối khi lưu bảng giá.");
        } finally {
          setSavingPrices(false);
        }
      },
      { minDuration: 300 }
    );
  };

  // Xác nhận đã thu tiền của thành viên
  const handleToggleMemberPaid = async (memberUserId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "paid" ? "pending" : "paid";
    await withLoading(
      "toggle-paid",
      nextStatus === "paid" ? "Đang xác nhận đã thu tiền..." : "Đang hủy xác nhận thu tiền...",
      async () => {
        try {
          const res = await fetch(`/api/group-orders/${orderId}/members/${memberUserId}/paid`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentStatus: nextStatus }),
          });

          const json = await res.json();
          if (json.success) {
            success(json.message);
            if (json.autoCompleted) {
              success("🎉 Tất cả thành viên đã thanh toán! Đơn đã hoàn tất.");
            }
            fetchOrder();
          } else {
            error(json.error?.message || "Lỗi xác nhận thanh toán.");
          }
        } catch {
          error("Lỗi kết nối hệ thống.");
        }
      },
      { minDuration: 300 }
    );
  };

  // Gửi nhắc thanh toán qua Telegram kèm QR (SRS Mục 8)
  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remAccountNumber.trim() || !remAccountName.trim()) {
      error("Vui lòng điền đầy đủ số tài khoản và tên chủ tài khoản.");
      return;
    }

    setSendingReminder(true);
    await withLoading(
      "send-reminder",
      remSendTelegram
        ? "Đang tạo mã QR thanh toán & gửi thông báo Telegram..."
        : "Đang lưu cấu hình & tạo mã QR thanh toán...",
      async () => {
        try {
          const res = await fetch(`/api/group-orders/${orderId}/payment-reminder`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bankCode: remBankCode,
              accountNumber: remAccountNumber,
              accountName: remAccountName,
              customContent: remContent,
              sendTelegram: remSendTelegram,
            }),
          });

          const json = await res.json();
          if (json.success) {
            success(json.message);
            setReminderModalOpen(false);
            fetchOrder();
          } else {
            error(json.error?.message || "Lỗi gửi nhắc thanh toán.");
          }
        } catch {
          error("Lỗi kết nối hệ thống khi gửi nhắc thanh toán.");
        } finally {
          setSendingReminder(false);
        }
      },
      { minDuration: 400 }
    );
  };

  // Sửa thông tin đơn
  const openEditOrder = () => {
    setEditTitle(order.title);
    setEditDesc(order.description || "");
    setEditDeadline(order.orderDeadline ? order.orderDeadline.slice(0, 16) : "");
    setEditOrderModalOpen(true);
  };

  const handleSaveOrderInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOrder(true);
    await withLoading(
      "save-order-info",
      "Đang cập nhật thông tin đơn...",
      async () => {
        try {
          const res = await fetch(`/api/group-orders/${orderId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: editTitle,
              description: editDesc,
              orderDeadline: editDeadline || null,
            }),
          });
          const json = await res.json();
          if (json.success) {
            success("Đã cập nhật thông tin đơn.");
            setEditOrderModalOpen(false);
            fetchOrder();
          } else {
            error(json.error?.message || "Lỗi cập nhật đơn.");
          }
        } catch {
          error("Lỗi kết nối khi cập nhật đơn.");
        } finally {
          setSavingOrder(false);
        }
      },
      { minDuration: 300 }
    );
  };

  // Xóa đơn
  const handleDeleteOrder = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa đơn "${order.title}"?`)) return;
    await withLoading(
      "delete-order",
      "Đang xóa đơn đặt nhóm...",
      async () => {
        try {
          const res = await fetch(`/api/group-orders/${orderId}`, { method: "DELETE" });
          const json = await res.json();
          if (json.success) {
            success("Đã xóa đơn đặt nhóm.");
            router.push("/group-orders");
          } else {
            error(json.error?.message || "Lỗi xóa đơn.");
          }
        } catch {
          error("Lỗi kết nối khi xóa đơn.");
        }
      },
      { minDuration: 300 }
    );
  };

  // Link preview QR VietQR
  const previewQrUrl =
    remAccountNumber && remAccountName
      ? getVietQrUrl({
          bankCode: remBankCode,
          accountNumber: remAccountNumber,
          accountName: remAccountName,
          content: remContent || `ORDER ${order?.orderCode}`,
          amount: 0,
        })
      : "";

  if (loading || !order) {
    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Đang tải..." />
        <SectionLoading text="Đang tải dữ liệu đơn đặt nhóm..." minHeight="360px" />
      </div>
    );
  }

  const isLeader = order.isLeader;
  const isOpen = order.status === "open";
  const isClosed = order.status === "closed";
  const isCompleted = order.status === "completed";

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title={order.title}
        subtitle={`Mã đơn: ${order.orderCode} • Trưởng nhóm: ${order.createdByUser?.fullName || order.createdByUser?.username}`}
        actionButton={
          <div className="flex items-center gap-2">
            <Link
              href="/group-orders"
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại</span>
            </Link>

            {/* Thao tác đóng đơn cho trưởng nhóm */}
            {isLeader && isOpen && (
              <button
                type="button"
                onClick={handleCloseOrder}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-600/20"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Đóng đơn order</span>
              </button>
            )}

            {/* Thao tác nhắc thanh toán Telegram cho trưởng nhóm */}
            {isLeader && !isOpen && (
              <button
                type="button"
                onClick={() => setReminderModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/25"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Nhắc thanh toán (Telegram)</span>
              </button>
            )}

            {/* Sửa / Xóa cho trưởng nhóm */}
            {isLeader && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={openEditOrder}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
                  title="Sửa thông tin đơn"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOrder}
                  className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                  title="Xóa đơn này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        }
      />

      <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Header Hero Banner */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black text-cyan-300 px-3 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30">
                  {order.orderCode}
                </span>

                {isOpen && (
                  <span className="px-3 py-1 rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang nhận order</span>
                  </span>
                )}
                {isClosed && (
                  <span className="px-3 py-1 rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-300 text-xs font-bold inline-flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Đã đóng order (Chốt giá & Thu tiền)</span>
                  </span>
                )}
                {isCompleted && (
                  <span className="px-3 py-1 rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 text-xs font-bold inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đã hoàn tất 100%</span>
                  </span>
                )}
              </div>

              <h2 className="text-xl md:text-2xl font-black text-white">{order.title}</h2>

              {order.description && (
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  {order.description}
                </p>
              )}
            </div>

            {/* Quick stats on banner */}
            <div className="flex items-center gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center min-w-[110px]">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Thành viên</span>
                <span className="text-base font-extrabold text-white">
                  {order.members.length} người
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center min-w-[130px]">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Tổng tiền</span>
                <span className="text-base font-mono font-black text-emerald-400">
                  {order.totalAmount > 0 ? `${order.totalAmount.toLocaleString("vi-VN")}đ` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("items")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "items"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Danh sách Món ({order.items.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "payments"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Tổng hợp Thanh toán</span>
            {order.summary?.unpaidCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {order.summary.unpaidCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "timeline"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Lịch sử đơn ({order.activities?.length || 0})</span>
          </button>
        </div>

        {/* TAB 1: DANH SÁCH MÓN */}
        {activeTab === "items" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-extrabold text-white">Chi tiết các món đã đăng ký</h3>
                <p className="text-xs text-slate-400">
                  {isOpen
                    ? "Đơn đang mở, mọi người có thể tự vào đăng ký hoặc sửa món của mình."
                    : "Đơn đã đóng. Trưởng nhóm nhập đơn giá thực tế cho từng món bên dưới."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isOpen && (
                  <button
                    type="button"
                    onClick={openAddItemModal}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Đăng ký món của tôi</span>
                  </button>
                )}

                {isLeader && isClosed && (
                  <ActionButton
                    type="button"
                    onClick={handleSavePrices}
                    isLoading={savingPrices}
                    loadingText="Đang lưu bảng giá..."
                    icon={<Save className="w-3.5 h-3.5" />}
                    variant="primary"
                    className="px-4 py-2 text-xs font-bold"
                  >
                    Lưu bảng giá thực tế
                  </ActionButton>
                )}
              </div>
            </div>

            {order.members.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
                Chưa có ai đăng ký món nào. Hãy là người đầu tiên!
              </div>
            ) : (
              <div className="space-y-4">
                {order.members.map((member: any) => {
                  const isCurrentMember = member.userId === order.currentUserId;

                  return (
                    <div
                      key={member.id}
                      className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-xs text-blue-300">
                            {member.user?.fullName?.charAt(0) || "U"}
                          </div>
                          <div>
                            <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                              {member.user?.fullName || member.user?.username}
                              {isCurrentMember && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                  Bạn
                                </span>
                              )}
                              {member.userId === order.createdById && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  👑 Trưởng nhóm
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {member.items.length} món • Tổng:{" "}
                              <strong className="text-emerald-300 font-mono">
                                {member.totalAmount > 0
                                  ? `${member.totalAmount.toLocaleString("vi-VN")}đ`
                                  : "Chưa tính giá"}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {isOpen && isCurrentMember && (
                          <button
                            type="button"
                            onClick={openAddItemModal}
                            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Thêm món</span>
                          </button>
                        )}
                      </div>

                      {/* Items table */}
                      {member.items.length === 0 ? (
                        <p className="text-slate-500 italic text-xs pl-2">Chưa chọn món nào.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-800">
                              <tr>
                                <th className="px-4 py-2.5">Tên món</th>
                                <th className="px-4 py-2.5 text-center w-16">SL</th>
                                <th className="px-4 py-2.5">Ghi chú</th>
                                <th className="px-4 py-2.5 text-right w-32">Đơn giá</th>
                                <th className="px-4 py-2.5 text-right w-32">Thành tiền</th>
                                {isOpen && <th className="px-4 py-2.5 text-right w-20">Thao tác</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {member.items.map((it: any) => {
                                const canEdit = isOpen && (isCurrentMember || isLeader);

                                return (
                                  <tr key={it.id} className="hover:bg-slate-800/30">
                                    <td className="px-4 py-2.5 font-bold text-white">
                                      {it.itemName}
                                    </td>
                                    <td className="px-4 py-2.5 text-center font-bold text-cyan-300">
                                      x{it.quantity}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-400">
                                      {it.note || "—"}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                      {isLeader && isClosed ? (
                                        <input
                                          type="number"
                                          step={1000}
                                          min={0}
                                          value={priceInputs[it.id] ?? ""}
                                          onChange={(e) =>
                                            setPriceInputs({
                                              ...priceInputs,
                                              [it.id]: e.target.value,
                                            })
                                          }
                                          placeholder="0"
                                          className="w-24 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-right text-xs focus:ring-1 focus:ring-blue-500"
                                        />
                                      ) : it.unitPrice !== null ? (
                                        <span className="font-mono text-slate-300">
                                          {it.unitPrice.toLocaleString("vi-VN")}đ
                                        </span>
                                      ) : (
                                        <span className="text-slate-500 italic">Chưa có</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400">
                                      {it.totalAmount !== null
                                        ? `${it.totalAmount.toLocaleString("vi-VN")}đ`
                                        : "—"}
                                    </td>
                                    {isOpen && (
                                      <td className="px-4 py-2.5 text-right">
                                        {canEdit ? (
                                          <div className="flex items-center justify-end gap-1">
                                            <button
                                              type="button"
                                              onClick={() => openEditItemModal(it)}
                                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-blue-300"
                                            >
                                              <Edit2 className="w-3 h-3" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteItem(it.id, it.itemName)}
                                              className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-slate-600">—</span>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TỔNG HỢP THANH TOÁN */}
        {activeTab === "payments" && (
          <div className="space-y-6">
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Tổng đơn hàng</span>
                <span className="text-xl font-mono font-black text-white mt-1 block">
                  {order.summary?.totalAmount > 0
                    ? `${order.summary.totalAmount.toLocaleString("vi-VN")}đ`
                    : "Chưa chốt giá"}
                </span>
              </div>

              <div className="p-4 rounded-3xl bg-slate-900/80 border border-emerald-500/30 bg-emerald-500/5">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">Đã thu tiền (🟢)</span>
                <span className="text-xl font-mono font-black text-emerald-300 mt-1 block">
                  {order.summary?.totalCollected?.toLocaleString("vi-VN")}đ
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {order.summary?.paidMembersCount} / {order.summary?.totalMembers} người đã trả
                </span>
              </div>

              <div className="p-4 rounded-3xl bg-slate-900/80 border border-rose-500/30 bg-rose-500/5">
                <span className="text-[10px] uppercase font-bold text-rose-400 block">Còn cần thu (🔴)</span>
                <span className="text-xl font-mono font-black text-rose-300 mt-1 block">
                  {order.summary?.totalUnpaid?.toLocaleString("vi-VN")}đ
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Còn {order.summary?.unpaidCount} người chưa thanh toán
                </span>
              </div>

              <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-center">
                {isLeader ? (
                  <button
                    type="button"
                    onClick={() => setReminderModalOpen(true)}
                    className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/25 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Nhắc thanh toán Telegram</span>
                  </button>
                ) : (
                  <div className="text-center text-xs text-slate-400">
                    <span>Trưởng nhóm sẽ xác nhận sau khi nhận được tiền.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Members Payment Table */}
            <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Thành viên</th>
                    <th className="px-5 py-3.5 text-center">Số món</th>
                    <th className="px-5 py-3.5 text-right">Phải trả</th>
                    <th className="px-5 py-3.5 text-center">Trạng thái thanh toán</th>
                    {isLeader && <th className="px-5 py-3.5 text-right">Thao tác Trưởng nhóm</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {order.members.map((m: any) => {
                    const isPaid = m.paymentStatus === "paid";

                    return (
                      <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs">
                            {m.user?.fullName?.charAt(0) || "U"}
                          </div>
                          <div>
                            <span>{m.user?.fullName || m.user?.username}</span>
                            {m.userId === order.createdById && (
                              <span className="text-[10px] text-amber-400 ml-1.5 font-normal">
                                (Trưởng nhóm)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center font-medium text-slate-300">
                          {m.totalItemsCount} món
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-extrabold text-sm text-cyan-300">
                          {m.totalAmount > 0 ? `${m.totalAmount.toLocaleString("vi-VN")}đ` : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {isPaid ? (
                            <span className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Đã thanh toán</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-bold inline-flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Chưa thanh toán</span>
                            </span>
                          )}
                        </td>
                        {isLeader && (
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleMemberPaid(m.userId, m.paymentStatus)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                isPaid
                                  ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                              }`}
                            >
                              {isPaid ? "Hủy xác nhận" : "Xác nhận đã nhận"}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: TIMELINE LỊCH SỬ ĐƠN */}
        {activeTab === "timeline" && (
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <GroupOrderActivityTimeline activities={order.activities} />
          </div>
        )}
      </div>

      {/* Modal Thêm / Sửa món */}
      <Modal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={editingItem ? "Sửa món order" : "Đăng ký món mới"}
        subtitle={`Đơn: ${order.title}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tên món ăn / thức uống <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="VD: Trà đào cam sả, Cà phê sữa, Cơm gà xối mỡ..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Số lượng <span className="text-rose-400">*</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 text-white text-base font-bold hover:bg-slate-800"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                value={itemQuantity}
                onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 px-3 py-2 text-center rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold"
              />
              <button
                type="button"
                onClick={() => setItemQuantity(itemQuantity + 1)}
                className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 text-white text-base font-bold hover:bg-slate-800"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Ghi chú món (Ít đường, Không đá, Cay...)
            </label>
            <input
              type="text"
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              placeholder="VD: 50% đường, nhiều đá, trân châu đen..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setItemModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Hủy
            </button>
            <ActionButton
              type="submit"
              variant="primary"
              isLoading={savingItem}
              loadingText="Đang lưu..."
              className="px-6 py-2 text-xs font-bold"
            >
              {editingItem ? "Lưu thay đổi" : "Thêm vào order"}
            </ActionButton>
          </div>
        </form>
      </Modal>

      {/* Modal Nhắc thanh toán Telegram */}
      <Modal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        title="Nhắc thanh toán qua Telegram"
        subtitle={`Đơn: ${order.title} (${order.orderCode})`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSendReminder} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block">Số người chưa thanh toán:</span>
              <span className="text-base font-extrabold text-rose-400">
                {order.summary?.unpaidCount} thành viên
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block">Tổng tiền còn thiếu:</span>
              <span className="text-base font-mono font-black text-amber-300">
                {order.summary?.totalUnpaid?.toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase">
                Ngân hàng thụ hưởng <span className="text-rose-400">*</span>
              </label>
              <select
                value={remBankCode}
                onChange={(e) => setRemBankCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
              >
                {VIETNAM_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.shortName} - {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase">
                Số tài khoản <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={remAccountNumber}
                onChange={(e) => setRemAccountNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase">
                Tên chủ tài khoản <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={remAccountName}
                onChange={(e) => setRemAccountName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white uppercase font-mono text-xs"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase">
                Nội dung chuyển khoản (Không khóa số tiền)
              </label>
              <input
                type="text"
                value={remContent}
                onChange={(e) => setRemContent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
              />
            </div>
          </div>

          {/* QR Preview */}
          {previewQrUrl && (
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Xem trước mã QR VietQR (Napas 247)
              </span>
              <img
                src={previewQrUrl}
                alt="QR VietQR"
                className="w-48 h-48 mx-auto rounded-xl border border-slate-700 shadow-md object-contain bg-white p-1"
              />
            </div>
          )}

          {/* Option gửi Telegram */}
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-2.5">
            <input
              type="checkbox"
              id="sendTelegramCheck"
              checked={remSendTelegram}
              onChange={(e) => setRemSendTelegram(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
            />
            <label htmlFor="sendTelegramCheck" className="text-xs text-cyan-200 cursor-pointer font-medium">
              Gửi thông báo và ảnh QR tới nhóm Telegram qua Telegram Bot
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setReminderModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Hủy
            </button>
            <ActionButton
              type="submit"
              variant="primary"
              isLoading={sendingReminder}
              loadingText="Đang gửi thông báo..."
              icon={<Send className="w-3.5 h-3.5" />}
              className="px-6 py-2 text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-cyan-500/25"
            >
              Gửi thông báo
            </ActionButton>
          </div>
        </form>
      </Modal>

      {/* Modal Sửa thông tin đơn */}
      <Modal
        isOpen={editOrderModalOpen}
        onClose={() => setEditOrderModalOpen(false)}
        title="Chỉnh sửa Đơn đặt nhóm"
        subtitle={`Mã đơn: ${order.orderCode}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveOrderInfo} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tên đơn đặt nhóm <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Ghi chú thêm
            </label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-4 py-2 rounded-2xl bg-slate-950 border border-slate-700 text-white text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Thời hạn chốt order
            </label>
            <input
              type="datetime-local"
              value={editDeadline}
              onChange={(e) => setEditDeadline(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditOrderModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Hủy
            </button>
            <ActionButton
              type="submit"
              variant="primary"
              isLoading={savingOrder}
              loadingText="Đang lưu..."
              className="px-6 py-2 text-xs font-bold"
            >
              Lưu thay đổi
            </ActionButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
