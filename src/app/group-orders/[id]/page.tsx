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
import { GroupOrderDetailSkeleton } from "@/components/Skeleton";
import { useConfirm } from "@/components/ConfirmDialogProvider";

export default function GroupOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;
  const router = useRouter();
  const { success, error } = useToast();
  const { confirm } = useConfirm();
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
  const [remBranch, setRemBranch] = useState("");
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
          setRemBranch(json.data.leaderPaymentConfig.branch || "");
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
    const ok = await confirm({
      title: "Đóng đơn order?",
      message: "Sau khi đóng đơn, thành viên sẽ không thể thêm hoặc sửa món nữa. Bạn có chắc chắn muốn chốt đơn gom món này?",
      confirmText: "Đóng đơn ngay",
      variant: "warning",
    });
    if (!ok) return;
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
    const ok = await confirm({
      title: "Xóa món khỏi order?",
      message: `Bạn có chắc muốn xóa món "${itemTitle}" khỏi order? Hành động này sẽ cập nhật lại tổng số lượng và tiền món.`,
      confirmText: "Xóa món",
      variant: "danger",
    });
    if (!ok) return;
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
    if (nextStatus === "paid") {
      const ok = await confirm({
        title: "Xác nhận đã thu tiền?",
        message: "Bạn có chắc chắn muốn đánh dấu thành viên này đã hoàn tất thanh toán phần tiền món?",
        confirmText: "Xác nhận thanh toán",
        variant: "primary",
      });
      if (!ok) return;
    }
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
              branch: remBranch,
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
    const ok = await confirm({
      title: "Xóa đơn đặt nhóm?",
      message: `Bạn có chắc chắn muốn xóa đơn "${order.title}"? Toàn bộ danh sách món và thông tin thanh toán sẽ bị xóa.`,
      confirmText: "Xóa đơn",
      variant: "danger",
    });
    if (!ok) return;
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
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header title="Chi tiết Đơn đặt nhóm" />
        <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto">
          <GroupOrderDetailSkeleton />
        </div>
      </div>
    );
  }

  const isLeader = order.isLeader;
  const isOpen = order.status === "open";
  const isClosed = order.status === "closed";
  const isCompleted = order.status === "completed";

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header
        title={order.title}
        subtitle={`Mã đơn: ${order.orderCode} • Trưởng nhóm: ${order.createdByUser?.fullName || order.createdByUser?.username}`}
        actionButton={
          <div className="flex items-center gap-2">
            <Link
              href="/group-orders"
              className="px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại</span>
            </Link>

            {/* Thao tác đóng đơn cho trưởng nhóm */}
            {isLeader && isOpen && (
              <button
                type="button"
                onClick={handleCloseOrder}
                className="px-3.5 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
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
                className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
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
                  className="p-1.5 rounded-md bg-white border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
                  title="Sửa thông tin đơn"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOrder}
                  className="p-1.5 rounded-md bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors shadow-xs"
                  title="Xóa đơn này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        }
      />

      <div className="p-6 md:p-8 space-y-5 max-w-7xl mx-auto w-full">
        {/* Header Summary Banner */}
        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold text-slate-700 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                {order.orderCode}
              </span>

              {isOpen && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 animate-spin" />
                  <span>Đang nhận order</span>
                </span>
              )}
              {isClosed && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Đã đóng order (Chốt giá & Thu tiền)</span>
                </span>
              )}
              {isCompleted && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Đã hoàn tất 100%</span>
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-slate-900">{order.title}</h2>

            {order.description && (
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                {order.description}
              </p>
            )}
          </div>

          {/* Quick stats on banner */}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center min-w-[110px]">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">Thành viên</span>
              <span className="text-base font-bold text-slate-900">
                {order.members.length} người
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center min-w-[130px]">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">Tổng tiền</span>
              <span className="text-base font-mono font-bold text-emerald-600">
                {order.totalAmount > 0 ? `${order.totalAmount.toLocaleString("vi-VN")}đ` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("items")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "items"
                ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Danh sách Món ({order.items.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "payments"
                ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Tổng hợp Thanh toán</span>
            {order.summary?.unpaidCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-semibold">
                {order.summary.unpaidCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "timeline"
                ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Lịch sử đơn ({order.activities?.length || 0})</span>
          </button>
        </div>

        {/* TAB 1: DANH SÁCH MÓN */}
        {activeTab === "items" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold text-slate-800">Chi tiết các món đã đăng ký</h3>
                <p className="text-xs text-slate-500">
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
                    className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
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
                    className="px-3.5 py-1.5 text-xs font-medium shadow-xs"
                  >
                    Lưu bảng giá thực tế
                  </ActionButton>
                )}
              </div>
            </div>

            {order.members.length === 0 ? (
              <div className="p-12 text-center rounded-lg bg-white border border-slate-200 text-slate-500 text-xs shadow-xs">
                Chưa có ai đăng ký món nào. Hãy là người đầu tiên!
              </div>
            ) : (
              <div className="space-y-3">
                {order.members.map((member: any) => {
                  const isCurrentMember = member.userId === order.currentUserId;

                  return (
                    <div
                      key={member.id}
                      className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-xs text-blue-700">
                            {member.user?.fullName?.charAt(0) || "U"}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                              {member.user?.fullName || member.user?.username}
                              {isCurrentMember && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                                  Bạn
                                </span>
                              )}
                              {member.userId === order.createdById && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                                  Trưởng nhóm
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {member.items.length} món • Tổng:{" "}
                              <strong className="text-slate-800 font-mono">
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
                            className="px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Thêm món</span>
                          </button>
                        )}
                      </div>

                      {/* Items table */}
                      {member.items.length === 0 ? (
                        <p className="text-slate-400 italic text-xs pl-2">Chưa chọn món nào.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-md border border-slate-200">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                              <tr>
                                <th className="px-3.5 py-2">Tên món</th>
                                <th className="px-3.5 py-2 text-center w-16">SL</th>
                                <th className="px-3.5 py-2">Ghi chú</th>
                                <th className="px-3.5 py-2 text-right w-32">Đơn giá</th>
                                <th className="px-3.5 py-2 text-right w-32">Thành tiền</th>
                                {isOpen && <th className="px-3.5 py-2 text-right w-20">Thao tác</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {member.items.map((it: any) => {
                                const canEdit = isOpen && (isCurrentMember || isLeader);

                                return (
                                  <tr key={it.id} className="hover:bg-slate-50/80">
                                    <td className="px-3.5 py-2 font-medium text-slate-900">
                                      {it.itemName}
                                    </td>
                                    <td className="px-3.5 py-2 text-center font-semibold text-slate-700">
                                      x{it.quantity}
                                    </td>
                                    <td className="px-3.5 py-2 text-slate-500">
                                      {it.note || "—"}
                                    </td>
                                    <td className="px-3.5 py-2 text-right">
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
                                          className="w-24 px-2 py-1 rounded bg-white border border-slate-300 text-slate-900 font-mono text-right text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                      ) : it.unitPrice !== null ? (
                                        <span className="font-mono text-slate-700">
                                          {it.unitPrice.toLocaleString("vi-VN")}đ
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic">Chưa có</span>
                                      )}
                                    </td>
                                    <td className="px-3.5 py-2 text-right font-mono font-medium text-emerald-600">
                                      {it.totalAmount !== null
                                        ? `${it.totalAmount.toLocaleString("vi-VN")}đ`
                                        : "—"}
                                    </td>
                                    {isOpen && (
                                      <td className="px-3.5 py-2 text-right">
                                        {canEdit ? (
                                          <div className="flex items-center justify-end gap-1">
                                            <button
                                              type="button"
                                              onClick={() => openEditItemModal(it)}
                                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                                            >
                                              <Edit2 className="w-3 h-3" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteItem(it.id, it.itemName)}
                                              className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-slate-300">—</span>
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
          <div className="space-y-4">
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-[11px] uppercase font-semibold text-slate-500 block">Tổng đơn hàng</span>
                <span className="text-xl font-mono font-bold text-slate-900 mt-1 block">
                  {order.summary?.totalAmount > 0
                    ? `${order.summary.totalAmount.toLocaleString("vi-VN")}đ`
                    : "Chưa chốt giá"}
                </span>
              </div>

              <div className="p-4 rounded-lg bg-white border border-emerald-200 shadow-xs">
                <span className="text-[11px] uppercase font-semibold text-emerald-700 block">Đã thu tiền</span>
                <span className="text-xl font-mono font-bold text-emerald-600 mt-1 block">
                  {order.summary?.totalCollected?.toLocaleString("vi-VN")}đ
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {order.summary?.paidMembersCount} / {order.summary?.totalMembers} người đã trả
                </span>
              </div>

              <div className="p-4 rounded-lg bg-white border border-rose-200 shadow-xs">
                <span className="text-[11px] uppercase font-semibold text-rose-700 block">Còn cần thu</span>
                <span className="text-xl font-mono font-bold text-rose-600 mt-1 block">
                  {order.summary?.totalUnpaid?.toLocaleString("vi-VN")}đ
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Còn {order.summary?.unpaidCount} người chưa thanh toán
                </span>
              </div>

              <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col justify-center">
                {isLeader ? (
                  <button
                    type="button"
                    onClick={() => setReminderModalOpen(true)}
                    className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Nhắc thanh toán Telegram</span>
                  </button>
                ) : (
                  <div className="text-center text-xs text-slate-500">
                    <span>Trưởng nhóm sẽ xác nhận sau khi nhận được tiền.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Members Payment Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Thành viên</th>
                    <th className="px-4 py-2.5 text-center">Số món</th>
                    <th className="px-4 py-2.5 text-right">Phải trả</th>
                    <th className="px-4 py-2.5 text-center">Trạng thái thanh toán</th>
                    {isLeader && <th className="px-4 py-2.5 text-right">Thao tác Trưởng nhóm</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.members.map((m: any) => {
                    const isPaid = m.paymentStatus === "paid";

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-900 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-700">
                            {m.user?.fullName?.charAt(0) || "U"}
                          </div>
                          <div>
                            <span>{m.user?.fullName || m.user?.username}</span>
                            {m.userId === order.createdById && (
                              <span className="text-[10px] text-amber-700 ml-1.5 font-semibold">
                                (Trưởng nhóm)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center text-slate-600">
                          {m.totalItemsCount} món
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-xs text-slate-900">
                          {m.totalAmount > 0 ? `${m.totalAmount.toLocaleString("vi-VN")}đ` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {isPaid ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Đã thanh toán</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-medium inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Chưa thanh toán</span>
                            </span>
                          )}
                        </td>
                        {isLeader && (
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleMemberPaid(m.userId, m.paymentStatus)}
                              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                isPaid
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
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
          <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs">
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
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
              Tên món ăn / thức uống <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="VD: Trà đào cam sả, Cà phê sữa, Cơm gà xối mỡ..."
              className="w-full px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
              Số lượng <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                className="w-8 h-8 rounded-md bg-slate-100 border border-slate-300 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                value={itemQuantity}
                onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-16 px-2 py-1 text-center rounded-md bg-white border border-slate-300 text-slate-900 text-xs font-semibold"
              />
              <button
                type="button"
                onClick={() => setItemQuantity(itemQuantity + 1)}
                className="w-8 h-8 rounded-md bg-slate-100 border border-slate-300 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
              Ghi chú món (Ít đường, Không đá, Cay...)
            </label>
            <input
              type="text"
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              placeholder="VD: 50% đường, nhiều đá, trân châu đen..."
              className="w-full px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setItemModalOpen(false)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <ActionButton
              type="submit"
              variant="primary"
              isLoading={savingItem}
              loadingText="Đang lưu..."
              className="px-4 py-1.5 text-xs font-medium"
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
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block">Số người chưa thanh toán:</span>
              <span className="text-sm font-bold text-rose-600">
                {order.summary?.unpaidCount} thành viên
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Tổng tiền còn thiếu:</span>
              <span className="text-sm font-mono font-bold text-amber-700">
                {order.summary?.totalUnpaid?.toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>

          {/* Auto-fill indicator */}
          <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-xs flex items-start gap-2 leading-relaxed">
            <CreditCard className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              {order.leaderPaymentConfig ? (
                <span className="text-blue-900">
                  Hệ thống đã <strong>tự động điền</strong> thông tin ngân hàng của <strong>{order.createdByUser?.fullName || "trưởng nhóm"}</strong>. Vui lòng kiểm tra lại trước khi gửi.
                </span>
              ) : (
                <span className="text-amber-800">
                  Trưởng nhóm chưa cấu hình tài khoản ngân hàng mặc định. Vui lòng nhập thông tin nhận tiền bên dưới.
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-700 uppercase">
                Ngân hàng thụ hưởng <span className="text-rose-500">*</span>
              </label>
              <select
                value={remBankCode}
                onChange={(e) => setRemBankCode(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {VIETNAM_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.shortName} - {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 uppercase">
                Số tài khoản <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={remAccountNumber}
                onChange={(e) => setRemAccountNumber(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 uppercase">
                Tên chủ tài khoản <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={remAccountName}
                onChange={(e) => setRemAccountName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 uppercase font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-700 uppercase">
                Chi nhánh ngân hàng (Tùy chọn)
              </label>
              <input
                type="text"
                value={remBranch}
                onChange={(e) => setRemBranch(e.target.value)}
                placeholder="VD: Chi nhánh Ba Đình, TP.HCM..."
                className="w-full px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-700 uppercase">
                Nội dung chuyển khoản (Không khóa số tiền)
              </label>
              <input
                type="text"
                value={remContent}
                onChange={(e) => setRemContent(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* QR Preview */}
          {previewQrUrl && (
            <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-center space-y-2">
              <span className="text-[11px] uppercase font-semibold text-slate-600 block">
                Xem trước mã QR VietQR (Napas 247)
              </span>
              <img
                src={previewQrUrl}
                alt="QR VietQR"
                className="w-44 h-44 mx-auto rounded border border-slate-300 shadow-xs object-contain bg-white p-1"
              />
            </div>
          )}

          {/* Option gửi Telegram */}
          <div className="p-3 rounded-md bg-blue-50 border border-blue-200 flex items-center gap-2">
            <input
              type="checkbox"
              id="sendTelegramCheck"
              checked={remSendTelegram}
              onChange={(e) => setRemSendTelegram(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="sendTelegramCheck" className="text-xs text-blue-900 cursor-pointer font-medium">
              Gửi thông báo và ảnh QR tới nhóm Telegram qua Telegram Bot
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setReminderModalOpen(false)}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <ActionButton
              type="submit"
              variant="primary"
              isLoading={sendingReminder}
              loadingText="Đang gửi thông báo..."
              icon={<Send className="w-3.5 h-3.5" />}
              className="px-4 py-1.5 text-xs font-medium"
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
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
              Tên đơn đặt nhóm <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
              Ghi chú thêm
            </label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
              Thời hạn chốt order
            </label>
            <input
              type="datetime-local"
              value={editDeadline}
              onChange={(e) => setEditDeadline(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setEditOrderModalOpen(false)}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <ActionButton
              type="submit"
              variant="primary"
              isLoading={savingOrder}
              loadingText="Đang lưu..."
              className="px-4 py-1.5 text-xs font-medium"
            >
              Lưu thay đổi
            </ActionButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
